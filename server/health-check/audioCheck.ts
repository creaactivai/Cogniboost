import type { IStorage } from "../storage";

export interface AudioCheckResult {
  lessonId: string;
  title: string;
  courseId: string;
  courseName: string;
  status: "ok" | "warning" | "error";
  htmlAudioRefs: number;
  uploadedAudio: number;
  missingUploads?: string[];
  extraUploads?: string[];
  hasBaseUrl: boolean;
  baseUrlValue: string | null;
  hasSpeechFallback: boolean;
  issues?: string[];
}

export interface AudioCheckReport {
  check: "audio";
  summary: {
    totalHtmlLessons: number;
    withAudioUploaded: number;
    withoutAudioUploaded: number;
    errors: number;
    warnings: number;
    ok: number;
  };
  lessons: AudioCheckResult[];
}

export async function runAudioCheck(storage: IStorage): Promise<AudioCheckReport> {
  const allCourses = await storage.getAllCourses();
  const allLessons: any[] = [];
  for (const course of allCourses) {
    const courseLessons = await storage.getLessonsByCourseId(course.id);
    allLessons.push(...courseLessons.map(l => ({ ...l, courseName: course.title })));
  }
  const htmlLessons = allLessons.filter((l: any) => l.htmlContent && l.htmlContent.trim() !== "");

  const report: AudioCheckResult[] = [];

  for (const lesson of htmlLessons) {
    const html = lesson.htmlContent as string;
    const audioMaterials = (lesson as any).audioMaterials as string[] | null;

    // Extract MP3 references from HTML
    const mp3Regex = /['"]([\w\-]+\.mp3)['"]/g;
    const htmlAudioRefs: string[] = [];
    let match;
    while ((match = mp3Regex.exec(html)) !== null) {
      if (!htmlAudioRefs.includes(match[1])) htmlAudioRefs.push(match[1]);
    }

    // Check AUDIO_BASE_URL pattern
    const baseUrlMatch = html.match(/var\s+AUDIO_BASE_URL\s*=\s*['"]([^'"]*)['"]\s*;/);
    const hasBaseUrl = !!baseUrlMatch;
    const baseUrlValue = baseUrlMatch ? baseUrlMatch[1] : null;

    // Check speech fallback
    const hasSpeechFallback = /speakText|speechSynthesis/.test(html);

    // Get uploaded files
    const uploadedFiles = (audioMaterials || []).map(entry => entry.split("::")[0]);
    const uploadedCount = uploadedFiles.length;

    // Find mismatches
    const missingUploads = htmlAudioRefs.filter(f => !uploadedFiles.includes(f));
    const extraUploads = uploadedFiles.filter(f => !htmlAudioRefs.includes(f));

    // Determine status
    let status: "ok" | "warning" | "error" = "ok";
    const issues: string[] = [];

    if (htmlAudioRefs.length > 0 && uploadedCount === 0) {
      status = "error";
      issues.push("HTML references audio files but none are uploaded");
    }
    if (missingUploads.length > 0) {
      status = status === "error" ? "error" : "warning";
      issues.push(`${missingUploads.length} audio files referenced in HTML but not uploaded`);
    }
    if (htmlAudioRefs.length > 0 && !hasBaseUrl) {
      status = "error";
      issues.push("HTML references MP3 files but has no AUDIO_BASE_URL variable");
    }
    if (uploadedCount > 0 && htmlAudioRefs.length === 0 && !hasBaseUrl) {
      status = "warning";
      issues.push("Audio files uploaded but HTML has no audio player code");
    }
    if (htmlAudioRefs.length > 0 && !hasSpeechFallback) {
      status = status === "error" ? "error" : "warning";
      issues.push("No Web Speech API fallback — audio will be silent if MP3s fail");
    }

    report.push({
      lessonId: lesson.id,
      title: lesson.title,
      courseId: lesson.courseId,
      courseName: (lesson as any).courseName,
      status,
      htmlAudioRefs: htmlAudioRefs.length,
      uploadedAudio: uploadedCount,
      missingUploads: missingUploads.length > 0 ? missingUploads : undefined,
      extraUploads: extraUploads.length > 0 ? extraUploads : undefined,
      hasBaseUrl,
      baseUrlValue,
      hasSpeechFallback,
      issues: issues.length > 0 ? issues : undefined,
    });
  }

  return {
    check: "audio",
    summary: {
      totalHtmlLessons: htmlLessons.length,
      withAudioUploaded: report.filter(r => r.uploadedAudio > 0).length,
      withoutAudioUploaded: report.filter(r => r.uploadedAudio === 0).length,
      errors: report.filter(r => r.status === "error").length,
      warnings: report.filter(r => r.status === "warning").length,
      ok: report.filter(r => r.status === "ok").length,
    },
    lessons: report,
  };
}
