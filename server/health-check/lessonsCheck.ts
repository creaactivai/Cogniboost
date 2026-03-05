import type { IStorage } from "../storage";

export interface LessonsCheckReport {
  check: "lessons";
  summary: {
    totalCourses: number;
    totalModules: number;
    totalLessons: number;
    lessonsWithHtml: number;
    lessonsWithVideo: number;
    lessonsWithPdf: number;
    emptyLessons: number;
    orphanLessons: number;
    errors: number;
    warnings: number;
  };
  issues: Array<{
    lessonId: string;
    title: string;
    courseName: string;
    moduleName: string | null;
    status: "warning" | "error";
    issue: string;
  }>;
}

export async function runLessonsCheck(storage: IStorage): Promise<LessonsCheckReport> {
  const allCourses = await storage.getAllCourses();
  const issues: LessonsCheckReport["issues"] = [];

  let totalModules = 0;
  let totalLessons = 0;
  let lessonsWithHtml = 0;
  let lessonsWithVideo = 0;
  let lessonsWithPdf = 0;
  let emptyLessons = 0;
  let orphanLessons = 0;

  for (const course of allCourses) {
    const modules = await storage.getModulesByCourseId(course.id);
    const lessons = await storage.getLessonsByCourseId(course.id);
    totalModules += modules.length;
    totalLessons += lessons.length;

    const moduleIds = new Set(modules.map(m => m.id));

    // Check for duplicate orderIndex within the same module
    const moduleOrderMap: Record<string, number[]> = {};

    for (const lesson of lessons) {
      const hasHtml = !!(lesson.htmlContent && lesson.htmlContent.trim());
      const hasVideo = !!(lesson as any).vimeoId;
      const hasPdf = !!((lesson as any).pdfMaterials && (lesson as any).pdfMaterials.length > 0);

      if (hasHtml) lessonsWithHtml++;
      if (hasVideo) lessonsWithVideo++;
      if (hasPdf) lessonsWithPdf++;

      const moduleName = lesson.moduleId
        ? modules.find(m => m.id === lesson.moduleId)?.title || null
        : null;

      // Empty lesson — no content at all
      if (!hasHtml && !hasVideo && !hasPdf && !lesson.content) {
        emptyLessons++;
        issues.push({
          lessonId: lesson.id,
          title: lesson.title,
          courseName: course.title,
          moduleName,
          status: "warning",
          issue: "Lesson has no content (no HTML, video, PDF, or text)",
        });
      }

      // Orphan — not assigned to any module
      if (!lesson.moduleId || !moduleIds.has(lesson.moduleId)) {
        orphanLessons++;
        issues.push({
          lessonId: lesson.id,
          title: lesson.title,
          courseName: course.title,
          moduleName: null,
          status: "error",
          issue: "Lesson not assigned to any module — won't appear in student sidebar",
        });
      }

      // Track orderIndex per module for duplicate detection
      const modKey = lesson.moduleId || "__orphan__";
      if (!moduleOrderMap[modKey]) moduleOrderMap[modKey] = [];
      moduleOrderMap[modKey].push(lesson.orderIndex);
    }

    // Check for duplicate orderIndex values
    for (const [modKey, indices] of Object.entries(moduleOrderMap)) {
      const seen = new Set<number>();
      const dupes = new Set<number>();
      for (const idx of indices) {
        if (seen.has(idx)) dupes.add(idx);
        seen.add(idx);
      }
      if (dupes.size > 0) {
        const mod = modules.find(m => m.id === modKey);
        issues.push({
          lessonId: "",
          title: `Module: ${mod?.title || "orphans"}`,
          courseName: course.title,
          moduleName: mod?.title || null,
          status: "error",
          issue: `Duplicate orderIndex values: ${[...dupes].join(", ")} — lessons may display in wrong order`,
        });
      }
    }

    // Check for empty modules (modules with no lessons)
    for (const mod of modules) {
      const modLessons = lessons.filter(l => l.moduleId === mod.id);
      if (modLessons.length === 0) {
        issues.push({
          lessonId: "",
          title: mod.title,
          courseName: course.title,
          moduleName: mod.title,
          status: "warning",
          issue: "Module has no lessons — shows as empty section for students",
        });
      }
    }
  }

  return {
    check: "lessons",
    summary: {
      totalCourses: allCourses.length,
      totalModules,
      totalLessons,
      lessonsWithHtml,
      lessonsWithVideo,
      lessonsWithPdf,
      emptyLessons,
      orphanLessons,
      errors: issues.filter(i => i.status === "error").length,
      warnings: issues.filter(i => i.status === "warning").length,
    },
    issues,
  };
}
