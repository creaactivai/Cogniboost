/**
 * Types for the teacher-facing Lesson Library (Master Plan v2.0 §7.4).
 *
 * The 17 sections are all optional — the Phase 2 One-Click Generator will
 * populate them; teachers can also author manually via the inline editor.
 *
 * Server source: shared/schema.ts `lessons.teacherLessonPlan` (jsonb).
 */

export interface LessonPlanVideoResource {
  platform?: string;        // 'YouTube', 'TED', etc.
  url?: string;
  duration?: string;
  timestampNotes?: string;
}

export interface LessonPlanStructureStep {
  time?: string;            // '0-5 min'
  activity?: string;
}

export interface LessonPlanLabActivity {
  roomName?: string;
  duration?: string;
  instructions?: string;
  vocabularyToPractice?: string[];
  expectedOutcomes?: string[];
}

export interface LessonPlanGrammarFocus {
  structure?: string;
  useCases?: string[];
  spanishSpeakerPitfalls?: string[];
  commonErrors?: string[];
}

export interface LessonPlanDifferentiation {
  forStrugglingStudents?: string[];
  forAdvancedStudents?: string[];
}

export interface LessonPlanTeacherNotes {
  anticipatedQuestions?: string[];
  commonStudentDifficulties?: string[];
  extensionActivities?: string[];
}

export interface LessonPlanQuizPreviewQuestion {
  question: string;
  correctAnswer?: string;
  explanation?: string;
}

/** Master Plan v2.0 §7.4 — the 17-section lesson plan shape. */
export interface LessonPlan {
  learningObjectives?: string[];
  grammarFocus?: LessonPlanGrammarFocus;
  vocabularyTarget?: string[];          // word list with optional translations elsewhere
  lessonStructure?: LessonPlanStructureStep[];
  videoResources?: LessonPlanVideoResource[];
  authenticMaterials?: string[];
  quizPreview?: LessonPlanQuizPreviewQuestion[];
  writingPrompt?: string;
  speakingAppPrompts?: string[];        // Ms. Coral scenarios (when active)
  labActivities?: LessonPlanLabActivity[];
  teacherNotes?: LessonPlanTeacherNotes;
  differentiation?: LessonPlanDifferentiation;
  culturalNotes?: string;
  assessmentCriteria?: string;
  commonMistakes?: string[];            // top errors Spanish speakers make
  homework?: string;
}

/** Row returned by GET /api/teacher/lessons — joined with course+module. */
export interface TeacherLessonRow {
  id: string;
  courseId: string;
  moduleId: string | null;
  title: string;
  description: string | null;
  duration: number;
  orderIndex: number;
  videoUrl: string | null;
  isPublished: boolean;
  teacherLessonPlan: LessonPlan | null;
  createdAt: string;
  courseTitle: string | null;
  courseLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | null;
  courseTopic: string | null;
  moduleTitle: string | null;
  moduleOrderIndex: number | null;
}
