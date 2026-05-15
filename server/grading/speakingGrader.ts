/**
 * Speaking-submission grading orchestrator.
 *
 * Glues together:
 *   GCS upload → Whisper transcription → Claude scoring → DB update.
 *
 * Designed to run asynchronously after the HTTP response. The student gets
 * a submission ID back immediately; the frontend polls for status.
 *
 * Lifecycle of a submission row:
 *   status='pending_ai'      — row just created, audio uploaded, no transcript yet
 *   status='ai_graded'       — Whisper + Claude completed, grade visible to student
 *   status='teacher_reviewed' — teacher overrode the AI grade (set elsewhere)
 *
 * On any error during processing, the row is updated with a synthetic
 * "grading_error" ai_grade payload so the frontend can surface a "Please
 * try again or contact support" state instead of spinning forever.
 */

import { db } from '../db';
import { submissions, speakingProjects } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { uploadToGcs } from '../gcsDirectUpload';
import { transcribeFromBuffer, type WhisperResult } from './whisperClient';
import { gradeSpeaking, type SpeakingGradeResponse } from './speakingPrompt';
import type { CefrLevel } from './writingPrompt';

export interface CreateSpeakingSubmissionInput {
  studentId: string;
  speakingProjectId: string;
  moduleId: string;
  audioBuffer: Buffer;
  audioFilename: string;          // e.g. recording_abc123.webm
  audioContentType: string;       // e.g. audio/webm or video/webm
  isVideo: boolean;               // whether the recording included camera
  clientDurationSeconds?: number; // duration as reported by the browser MediaRecorder
}

export interface CreatedSubmission {
  submissionId: string;
  audioUrl: string;
}

/**
 * Step 1 (synchronous): upload audio to GCS, create the submission row with
 * status='pending_ai', return the new submission ID + the GCS URL.
 *
 * The caller (HTTP route handler) MUST then fire-and-forget
 * processSpeakingSubmission(submissionId) so the slow Whisper + Claude path
 * runs outside the request lifecycle.
 */
export async function createSpeakingSubmission(
  input: CreateSpeakingSubmissionInput
): Promise<CreatedSubmission> {
  // Upload audio to GCS first so we never lose the recording even if the
  // grader chokes downstream.
  const uploaded = await uploadToGcs(
    input.audioBuffer,
    input.audioFilename,
    input.audioContentType
  );

  const [row] = await db.insert(submissions).values({
    studentId: input.studentId,
    assignmentType: 'speaking_recording',
    content: '',                         // transcript filled in by background job
    moduleId: input.moduleId,
    speakingProjectId: input.speakingProjectId,
    audioUrl: input.isVideo ? null : uploaded.url,
    videoUrl: input.isVideo ? uploaded.url : null,
    durationSeconds: input.clientDurationSeconds ?? null,
    status: 'pending_ai',
  }).returning({ id: submissions.id });

  return { submissionId: row.id, audioUrl: uploaded.url };
}

/**
 * Step 2 (asynchronous, kicked off after the HTTP response): fetch the audio
 * back from GCS, run Whisper, call gradeSpeaking, write the grade to the row.
 *
 * Safe to invoke without awaiting (errors are logged + persisted to the row).
 */
export async function processSpeakingSubmission(submissionId: string): Promise<void> {
  console.log(`[speakingGrader] Begin processing submission ${submissionId}`);
  const startedAt = Date.now();

  try {
    // Load the submission + its associated project.
    const [sub] = await db.select().from(submissions).where(eq(submissions.id, submissionId));
    if (!sub) {
      throw new Error(`submission ${submissionId} not found`);
    }
    if (!sub.speakingProjectId) {
      throw new Error(`submission ${submissionId} has no speakingProjectId`);
    }
    const [proj] = await db
      .select()
      .from(speakingProjects)
      .where(eq(speakingProjects.id, sub.speakingProjectId));
    if (!proj) {
      throw new Error(`speakingProject ${sub.speakingProjectId} not found`);
    }

    const audioUrl = sub.audioUrl || sub.videoUrl;
    if (!audioUrl) {
      throw new Error(`submission ${submissionId} has no audio/video URL`);
    }

    // Fetch + transcribe.
    console.log(`[speakingGrader] Transcribing ${audioUrl} ...`);
    const fetchRes = await fetch(audioUrl);
    if (!fetchRes.ok) {
      throw new Error(`failed to fetch audio: ${fetchRes.status}`);
    }
    const audioBuffer = Buffer.from(await fetchRes.arrayBuffer());
    const audioFilename = audioUrl.split('/').pop()?.split('?')[0] || 'audio.webm';
    const whisper: WhisperResult = await transcribeFromBuffer(audioBuffer, audioFilename);
    console.log(
      `[speakingGrader] Whisper done: ${whisper.transcript.length} chars, ` +
      `${whisper.durationSeconds}s, confidence=${whisper.avgConfidence.toFixed(2)}`
    );

    // Score with Claude using the project's targets.
    console.log(`[speakingGrader] Calling Claude grader ...`);
    const { grade } = await gradeSpeaking({
      targetLevel: proj.level as CefrLevel,
      speakingPrompt: proj.prompt,
      targetVocabulary: (proj.targetVocabulary as string[]) || [],
      targetGrammar: (proj.targetGrammar as string[]) || [],
      targetExpressions: (proj.targetExpressions as string[]) || [],
      targetDurationSeconds: proj.targetDurationSeconds,
      transcript: whisper.transcript,
      actualDurationSeconds: whisper.durationSeconds,
      whisperConfidence: whisper.avgConfidence,
    });

    // Persist transcript + grade.
    await db
      .update(submissions)
      .set({
        content: whisper.transcript,
        transcript: whisper.transcript,
        durationSeconds: Math.round(whisper.durationSeconds),
        aiGrade: grade as unknown as Record<string, unknown>,
        aiScore: String(grade.overall_score),
        status: 'ai_graded',
      })
      .where(eq(submissions.id, submissionId));

    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    console.log(
      `[speakingGrader] ✅ Submission ${submissionId} graded ` +
      `${grade.overall_score}/100 in ${elapsed}s`
    );
  } catch (err: any) {
    console.error(`[speakingGrader] ❌ Failed for ${submissionId}:`, err?.message || err);
    // Persist an error envelope so the UI can show a clear message.
    await db
      .update(submissions)
      .set({
        aiGrade: {
          error: true,
          message: 'Grading failed. Please try again or ask your teacher to review manually.',
          errorDetail: String(err?.message || err).slice(0, 500),
        } as unknown as Record<string, unknown>,
        status: 'pending_ai',  // stays pending so a retry can fire
      })
      .where(eq(submissions.id, submissionId))
      .catch((dbErr) => console.error('[speakingGrader] DB persist of error failed:', dbErr));
  }
}

/** Re-exported for convenience to route handlers. */
export type { SpeakingGradeResponse };
