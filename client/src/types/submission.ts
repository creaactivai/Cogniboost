/**
 * Types matching the backend Submission API + writing-grading JSON contract.
 *
 * Source of truth for the JSON shape lives in server/grading/writingPrompt.ts
 * (WritingGradeResponse). When the backend type changes, mirror it here.
 */

export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type AssignmentType =
  | "writing"
  | "reading_quiz"
  | "listening_quiz"
  | "speaking_recording"
  | "project";

export type SubmissionStatus =
  | "pending_ai"
  | "ai_graded"
  | "teacher_reviewed"
  | "returned";

export interface DimensionScore {
  score: number;
  feedback: string;
}

export interface InlineAnnotation {
  text_segment: string;
  issue_type: "grammar" | "vocab" | "punctuation" | "register" | "spelling";
  explanation: string;
  suggestion: string;
  severity: "minor" | "moderate" | "major";
}

export interface VocabularyMisuse {
  word: string;
  issue: string;
}

export interface WritingGradeResponse {
  overall_score: number;
  level_assessment: CefrLevel;
  dimensions: {
    task_achievement: DimensionScore;
    coherence_cohesion: DimensionScore;
    lexical_range: DimensionScore;
    grammatical_range: DimensionScore;
    register_tone: DimensionScore;
  };
  inline_annotations: InlineAnnotation[];
  strengths: string[];
  improvement_priorities: string[];
  vocabulary_used_correctly: string[];
  vocabulary_misused: VocabularyMisuse[];
  estimated_cefr_for_this_writing: CefrLevel;
  spanish_speaker_patterns_noticed: string[];
}

export interface Submission {
  id: string;
  studentId: string;
  lessonId: string | null;
  assignmentType: AssignmentType;
  content: string;
  submittedAt: string;
  /** Either WritingGradeResponse on success, or { error: string } on failure. */
  aiGrade: WritingGradeResponse | { error: string } | null;
  aiScore: string | null;
  teacherScore: string | null;
  teacherFeedback: string | null;
  teacherReviewedAt: string | null;
  finalScore: string | null;
  status: SubmissionStatus;
}

/** Narrowing helper for the grading-failed case. */
export function isGradingError(
  grade: Submission["aiGrade"],
): grade is { error: string } {
  return !!grade && typeof grade === "object" && "error" in grade;
}

/** Narrowing helper for a successfully-graded submission. */
export function isGraded(
  grade: Submission["aiGrade"],
): grade is WritingGradeResponse {
  return (
    !!grade &&
    typeof grade === "object" &&
    "overall_score" in grade &&
    "dimensions" in grade
  );
}
