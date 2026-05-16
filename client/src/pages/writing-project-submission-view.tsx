/**
 * Writing Project submission view — shows the student their grade + feedback.
 *
 * Polls /api/writing-submissions/:id every 5s until status leaves
 * 'pending_ai'. Then renders the structured WritingGradeResponse:
 *   overall + 5 dimensions + strengths + improvements +
 *   inline annotations + Spanish-speaker patterns + vocab feedback.
 */

import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PenLine, AlertTriangle, RotateCw, CheckCircle2, BookOpen, BarChart3, Trophy, Target, Search, Lightbulb, GraduationCap, AlertCircle } from "lucide-react";

interface DimScore { score: number; feedback: string }
interface InlineAnnotation {
  text_segment: string;
  issue_type: string;
  explanation: string;
  suggestion: string;
  severity: "minor" | "moderate" | "major";
}
interface VocabMisuse { word: string; issue: string }

interface WritingGrade {
  overall_score: number;
  level_assessment: string;
  dimensions: {
    task_achievement: DimScore;
    coherence_cohesion: DimScore;
    lexical_range: DimScore;
    grammatical_range: DimScore;
    register_tone: DimScore;
  };
  inline_annotations: InlineAnnotation[];
  strengths: string[];
  improvement_priorities: string[];
  vocabulary_used_correctly: string[];
  vocabulary_misused: VocabMisuse[];
  spanish_speaker_patterns_noticed: string[];
  error?: boolean;
  message?: string;
}

interface WritingSubmission {
  id: string;
  status: "pending_ai" | "ai_graded" | "teacher_reviewed" | "returned";
  moduleId: string;
  writingProjectId: string;
  content: string;
  aiGrade: WritingGrade | null;
  aiScore: string | null;
  teacherScore: string | null;
  teacherFeedback: string | null;
  submittedAt: string;
  teacherReviewedAt: string | null;
}

export default function WritingProjectSubmissionViewPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = params.id;

  const { data: sub, refetch } = useQuery<WritingSubmission>({
    queryKey: [`/api/writing-submissions/${id}`],
    enabled: !!id,
    refetchInterval: (q) => {
      const data: any = q.state.data;
      if (!data) return 2000;
      if (data.status === "pending_ai" && !data.aiGrade?.error) return 4000;
      return false;
    },
  });

  if (!sub) {
    return <div className="max-w-3xl mx-auto p-6 text-center">Loading submission…</div>;
  }

  const isPending = sub.status === "pending_ai" && !sub.aiGrade?.error;
  const isError = !!sub.aiGrade?.error;
  const grade = sub.aiGrade && !sub.aiGrade.error ? sub.aiGrade : null;

  if (isPending) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <Card className="p-8 text-center space-y-4">
          <PenLine className="w-12 h-12 mx-auto text-primary animate-pulse" />
          <h2 className="text-xl font-bold">Grading your writing…</h2>
          <p className="text-muted-foreground">
            We're grading your writing with the CogniBoost Writing Rubric.
            This usually takes about 30-60 seconds.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Check now
          </Button>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <Card className="p-6 space-y-3 border-destructive/30">
          <h2 className="text-xl font-bold text-destructive flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Grading didn't complete</h2>
          <p>{sub.aiGrade?.message || "Something went wrong while grading your writing."}</p>
          <div className="pt-2">
            <p className="text-sm font-semibold mb-2">Your writing was saved:</p>
            <p className="text-sm italic whitespace-pre-wrap p-3 bg-muted rounded">{sub.content}</p>
          </div>
          <div className="flex gap-2 pt-3">
            <Button variant="outline" onClick={() => navigate(`/dashboard/writing-project/${sub.moduleId}`)}>
              <RotateCw className="w-4 h-4 mr-2" /> Try again
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!grade) {
    return <div className="max-w-3xl mx-auto p-6 text-center"><p>Grade not yet available.</p></div>;
  }

  const pass = grade.overall_score >= 70;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6" data-testid="page-writing-project-submission">
      <Card className="p-6 text-center space-y-2">
        <div className="text-sm text-muted-foreground">Your Writing Grade</div>
        <div className="flex items-center justify-center gap-3">
          <div className="text-6xl font-bold">{grade.overall_score}</div>
          <div className="text-3xl text-muted-foreground">/100</div>
        </div>
        <div>
          <Badge variant={pass ? "default" : "secondary"} className="text-sm inline-flex items-center gap-1">
            {pass ? <CheckCircle2 className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />} {bandLabel(grade.overall_score)}
          </Badge>
          <Badge variant="outline" className="ml-2 text-sm">
            CEFR: {grade.level_assessment}
          </Badge>
        </div>
        {sub.teacherScore && (
          <div className="text-xs">
            Teacher score (override): <strong>{sub.teacherScore}/100</strong>
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="font-semibold text-sm flex items-center gap-2"><PenLine className="w-4 h-4" /> Your writing</h3>
        <p className="text-sm italic whitespace-pre-wrap p-3 bg-muted/50 rounded">{sub.content}</p>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Dimension Scores</h3>
        <DimensionRow label="Task Achievement" {...grade.dimensions.task_achievement} />
        <DimensionRow label="Coherence & Cohesion" {...grade.dimensions.coherence_cohesion} />
        <DimensionRow label="Lexical Range" {...grade.dimensions.lexical_range} />
        <DimensionRow label="Grammatical Range & Accuracy" {...grade.dimensions.grammatical_range} />
        <DimensionRow label="Register & Tone" {...grade.dimensions.register_tone} />
      </Card>

      {grade.strengths && grade.strengths.length > 0 && (
        <Card className="p-6 space-y-2 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
          <h3 className="font-semibold text-green-900 dark:text-green-100 flex items-center gap-2"><Trophy className="w-4 h-4" /> Strengths</h3>
          <ul className="space-y-1">
            {grade.strengths.map((s, i) => <li key={i} className="text-sm">• {s}</li>)}
          </ul>
        </Card>
      )}

      {grade.improvement_priorities && grade.improvement_priorities.length > 0 && (
        <Card className="p-6 space-y-2 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2"><Target className="w-4 h-4" /> Focus on next time</h3>
          <ol className="space-y-2 list-decimal list-inside">
            {grade.improvement_priorities.map((p, i) => <li key={i} className="text-sm">{p}</li>)}
          </ol>
        </Card>
      )}

      {(grade.vocabulary_used_correctly?.length || grade.vocabulary_misused?.length) && (
        <Card className="p-6 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Vocabulary tracking</h3>
          {grade.vocabulary_used_correctly?.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Used correctly:</p>
              <div className="flex flex-wrap gap-1">
                {grade.vocabulary_used_correctly.map((w) => (
                  <span key={w} className="text-xs bg-green-100 dark:bg-green-900/40 text-green-900 dark:text-green-100 px-2 py-1 rounded">{w}</span>
                ))}
              </div>
            </div>
          )}
          {grade.vocabulary_misused?.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Worth revisiting:</p>
              <div className="space-y-1">
                {grade.vocabulary_misused.map((v) => (
                  <div key={v.word} className="text-sm">
                    <strong>{v.word}</strong>: <span className="text-muted-foreground">{v.issue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {grade.inline_annotations && grade.inline_annotations.length > 0 && (
        <Card className="p-6 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Search className="w-4 h-4 text-primary" /> Specific notes</h3>
          {grade.inline_annotations.map((n, i) => (
            <div key={i} className="border-l-4 border-primary/30 pl-3 py-1 text-sm space-y-1">
              <div className="flex gap-2 items-center">
                <Badge variant="outline" className="text-xs">{n.issue_type}</Badge>
                <Badge variant="outline" className="text-xs">{n.severity}</Badge>
              </div>
              <p className="italic">"{n.text_segment}"</p>
              <p className="text-muted-foreground">{n.explanation}</p>
              <p className="flex items-start gap-1.5"><Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Try: <strong>{n.suggestion}</strong></p>
            </div>
          ))}
        </Card>
      )}

      {grade.spanish_speaker_patterns_noticed && grade.spanish_speaker_patterns_noticed.length > 0 && (
        <Card className="p-6 space-y-2">
          <h3 className="font-semibold text-sm">Spanish-speaker patterns to watch</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            {grade.spanish_speaker_patterns_noticed.map((p, i) => <li key={i}>• {p}</li>)}
          </ul>
        </Card>
      )}

      {sub.teacherFeedback && (
        <Card className="p-6 space-y-2 border-purple-200 bg-purple-50 dark:bg-purple-950/20">
          <h3 className="font-semibold text-purple-900 dark:text-purple-100 flex items-center gap-2"><GraduationCap className="w-4 h-4" /> From your teacher</h3>
          <p className="text-sm whitespace-pre-wrap">{sub.teacherFeedback}</p>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 justify-center pt-2">
        <Button variant="outline" onClick={() => navigate(`/dashboard/writing-project/${sub.moduleId}`)}>
          🔄 Try again
        </Button>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}

function DimensionRow({ label, score, feedback }: { label: string; score: number; feedback: string }) {
  const pct = Math.max(0, Math.min(100, (score / 20) * 100));
  const band = score >= 18 ? "Distinguished" : score >= 14 ? "Proficient" : score >= 10 ? "Developing" : "Emerging";
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline gap-2">
        <div className="font-medium text-sm">{label}</div>
        <div className="text-sm tabular-nums">
          <strong>{score}</strong>/20 <span className="text-muted-foreground text-xs">({band})</span>
        </div>
      </div>
      <div className="h-1.5 bg-muted rounded">
        <div className="h-full bg-primary rounded transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{feedback}</p>
    </div>
  );
}

function bandLabel(score: number): string {
  if (score >= 90) return "Distinguished";
  if (score >= 70) return "Proficient (Pass)";
  if (score >= 50) return "Developing";
  return "Emerging";
}
