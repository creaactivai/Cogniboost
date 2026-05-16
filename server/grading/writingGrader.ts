/**
 * Writing-submission grading orchestrator.
 *
 * Module-level Writing Projects pipeline. Mirrors speakingGrader.ts but with
 * a much simpler shape — no GCS upload, no Whisper, no audio: just text in,
 * grade out.
 *
 * Lifecycle of a submission row:
 *   status='pending_ai'  — row just created, content saved, no grade yet
 *   status='ai_graded'   — Claude completed, grade visible to student
 *   status='teacher_reviewed' — teacher overrode the AI grade (elsewhere)
 *
 * On error, persists a grading_error envelope to the row so the UI can
 * surface a "try again" state.
 */

import { gradeWriting, type WritingGradeResponse } from './writingPrompt';
import type { CefrLevel } from './writingPrompt';

export interface CreateWritingSubmissionInput {
  studentId: string;
  writingProjectId: string;
  moduleId: string;
  content: string;                      // the student's written text
}

export interface CreatedWritingSubmission {
  submissionId: string;
}

/**
 * Step 1 (synchronous fast-path): insert the submission row, return its ID.
 * The caller then fires processWritingSubmission(id) without awaiting.
 */
export async function createWritingSubmission(
  input: CreateWritingSubmissionInput
): Promise<CreatedWritingSubmission> {
  const { db } = await import("../db");
  const { submissions } = await import("@shared/schema");
  const [row] = await db.insert(submissions).values({
    studentId: input.studentId,
    assignmentType: 'writing',
    content: input.content,
    moduleId: input.moduleId,
    writingProjectId: input.writingProjectId,
    status: 'pending_ai',
  }).returning({ id: submissions.id });

  return { submissionId: row.id };
}

/**
 * Step 2 (asynchronous): load the submission + project, call gradeWriting,
 * write the result back to the row.
 *
 * Safe to invoke without awaiting (errors are logged + persisted).
 */
export async function processWritingSubmission(submissionId: string): Promise<void> {
  console.log(`[writingGrader] Begin processing submission ${submissionId}`);
  const startedAt = Date.now();

  // Imports MUST be at function top (not inside try) — catch block needs them too.
  const { db } = await import("../db");
  const { submissions, writingProjects } = await import("@shared/schema");
  const { eq } = await import("drizzle-orm");

  try {
    const [sub] = await db.select().from(submissions).where(eq(submissions.id, submissionId));
    if (!sub) throw new Error(`submission ${submissionId} not found`);
    if (!sub.writingProjectId) throw new Error(`submission ${submissionId} has no writingProjectId`);

    const [proj] = await db
      .select()
      .from(writingProjects)
      .where(eq(writingProjects.id, sub.writingProjectId));
    if (!proj) throw new Error(`writingProject ${sub.writingProjectId} not found`);

    console.log(`[writingGrader] Calling Claude grader for ${proj.level} writing...`);
    const { grade } = await gradeWriting({
      targetLevel: proj.level as CefrLevel,
      assignment: proj.title,
      writingPrompt: proj.prompt,
      studentText: sub.content,
    });

    await db
      .update(submissions)
      .set({
        aiGrade: grade as unknown as Record<string, unknown>,
        aiScore: String(grade.overall_score),
        status: 'ai_graded',
      })
      .where(eq(submissions.id, submissionId));

    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    console.log(`[writingGrader] ✅ Submission ${submissionId} graded ${grade.overall_score}/100 in ${elapsed}s`);
  } catch (err: any) {
    console.error(`[writingGrader] ❌ Failed for ${submissionId}:`, err?.message || err);
    await db
      .update(submissions)
      .set({
        aiGrade: {
          error: true,
          message: 'Grading failed. Please try again or ask your teacher to review manually.',
          errorDetail: String(err?.message || err).slice(0, 500),
        } as unknown as Record<string, unknown>,
        status: 'pending_ai',
      })
      .where(eq(submissions.id, submissionId))
      .catch((dbErr) => console.error('[writingGrader] DB persist of error failed:', dbErr));
  }
}

export type { WritingGradeResponse };
