import type { IStorage } from "../storage";

export interface QuizzesCheckReport {
  check: "quizzes";
  summary: {
    totalQuizzes: number;
    lessonsWithQuiz: number;
    lessonsWithoutQuiz: number;
    quizzesWithFewQuestions: number;
    emptyQuizzes: number;
    errors: number;
    warnings: number;
  };
  issues: Array<{
    quizId?: string;
    lessonId?: string;
    title: string;
    courseName: string;
    status: "warning" | "error";
    issue: string;
  }>;
}

export async function runQuizzesCheck(storage: IStorage): Promise<QuizzesCheckReport> {
  const allCourses = await storage.getAllCourses();
  const issues: QuizzesCheckReport["issues"] = [];

  let totalQuizzes = 0;
  let lessonsWithQuiz = 0;
  let lessonsWithoutQuiz = 0;
  let quizzesWithFewQuestions = 0;
  let emptyQuizzes = 0;

  for (const course of allCourses) {
    const lessons = await storage.getLessonsByCourseId(course.id);

    for (const lesson of lessons) {
      // Check if lesson has a quiz
      const quizzes = await storage.getQuizzesByLessonId(lesson.id);

      if (quizzes.length === 0) {
        lessonsWithoutQuiz++;
        // Only flag as warning for lessons that have content (active lessons)
        const hasContent = !!(lesson.htmlContent || lesson.content || (lesson as any).vimeoId);
        if (hasContent) {
          issues.push({
            lessonId: lesson.id,
            title: lesson.title,
            courseName: course.title,
            status: "warning",
            issue: "Lesson has content but no quiz — students can't be assessed",
          });
        }
        continue;
      }

      lessonsWithQuiz++;

      for (const quiz of quizzes) {
        totalQuizzes++;
        const questions = await storage.getQuizQuestions(quiz.id);

        if (questions.length === 0) {
          emptyQuizzes++;
          issues.push({
            quizId: quiz.id,
            lessonId: lesson.id,
            title: `${lesson.title} — ${quiz.title}`,
            courseName: course.title,
            status: "error",
            issue: "Quiz exists but has no questions",
          });
        } else if (questions.length < 5) {
          quizzesWithFewQuestions++;
          issues.push({
            quizId: quiz.id,
            lessonId: lesson.id,
            title: `${lesson.title} — ${quiz.title}`,
            courseName: course.title,
            status: "warning",
            issue: `Quiz has only ${questions.length} question(s) — recommended minimum is 5`,
          });
        }
      }
    }
  }

  return {
    check: "quizzes",
    summary: {
      totalQuizzes,
      lessonsWithQuiz,
      lessonsWithoutQuiz,
      quizzesWithFewQuestions,
      emptyQuizzes,
      errors: issues.filter(i => i.status === "error").length,
      warnings: issues.filter(i => i.status === "warning").length,
    },
    issues,
  };
}
