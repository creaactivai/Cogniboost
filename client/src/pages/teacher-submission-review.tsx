/**
 * Teacher submission review — same render as student view, plus a review
 * panel that lets the teacher override the AI score, write feedback, and
 * finalize (return-to-student).
 *
 * Master Plan v2.0 §4.4 (Teacher Override Workflow):
 *   - Teacher sees all 5 dimension scores
 *   - Can adjust any dimension score with a free-text note (Phase 2 — for
 *     v1.4 we adjust the overall score and write a single feedback note)
 *   - Marks reviewed → status='teacher_reviewed', then optionally returns
 *     → status='returned'
 *   - All overrides stored to inform future prompt tuning
 *
 * Reuses the read-only feedback layout from the student submission-view
 * page so teachers see exactly what the student will see.
 */

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  isGraded,
  isGradingError,
  type Submission,
  type InlineAnnotation,
} from "@/types/submission";

const ISSUE_COLORS: Record<InlineAnnotation["issue_type"], string> = {
  grammar: "bg-red-50 border-red-200 text-red-900",
  vocab: "bg-blue-50 border-blue-200 text-blue-900",
  punctuation: "bg-amber-50 border-amber-200 text-amber-900",
  register: "bg-purple-50 border-purple-200 text-purple-900",
  spelling: "bg-pink-50 border-pink-200 text-pink-900",
};

function DimensionRow({
  label,
  score,
  feedback,
}: {
  label: string;
  score: number;
  feedback: string;
}) {
  return (
    <div className="border-b border-slate-100 last:border-0 py-3">
      <div className="flex items-center justify-between mb-1">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-sm tabular-nums">
          <span className="font-bold">{score}</span>
          <span className="text-slate-400"> / 20</span>
        </div>
      </div>
      <Progress value={(score / 20) * 100} className="h-1.5 mb-2" />
      <p className="text-sm text-slate-700 leading-relaxed">{feedback}</p>
    </div>
  );
}

export default function TeacherSubmissionReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: submission, isLoading } = useQuery<Submission>({
    queryKey: [`/api/submissions/${id}`],
    refetchInterval: (query) => {
      const s = query.state.data as Submission | undefined;
      if (!s) return 5_000;
      return s.status === "pending_ai" ? 5_000 : false;
    },
  });

  // Initial form state hydrated from server data, then user-editable.
  const aiScoreInitial = useMemo(() => {
    if (!submission) return "";
    if (submission.teacherScore != null) return submission.teacherScore;
    return submission.aiScore ?? "";
  }, [submission]);

  const feedbackInitial = useMemo(() => {
    return submission?.teacherFeedback ?? "";
  }, [submission]);

  const [teacherScore, setTeacherScore] = useState<string>("");
  const [teacherFeedback, setTeacherFeedback] = useState<string>("");

  // Hydrate fields once submission lands; this matches react-hook-form's
  // "uncontrolled until first render" pattern but with simpler bookkeeping.
  useMemo(() => {
    if (submission && teacherScore === "" && teacherFeedback === "") {
      setTeacherScore(String(aiScoreInitial));
      setTeacherFeedback(feedbackInitial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission?.id]);

  const reviewMutation = useMutation({
    mutationFn: async (vars: { score?: number; feedback?: string }) => {
      const res = await apiRequest("POST", `/api/submissions/${id}/teacher-review`, {
        teacherScore: vars.score,
        teacherFeedback: vars.feedback,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/submissions/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/submissions/queue"] });
      toast({ title: "Review saved" });
    },
    onError: (err: Error) =>
      toast({
        title: "Could not save review",
        description: err.message,
        variant: "destructive",
      }),
  });

  const returnMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/submissions/${id}/return`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/submissions/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/submissions/queue"] });
      toast({
        title: "Returned to student",
        description: "Student can now see the finalized grade.",
      });
      navigate("/dashboard/teacher");
    },
    onError: (err: Error) =>
      toast({
        title: "Could not return submission",
        description: err.message,
        variant: "destructive",
      }),
  });

  if (isLoading || !submission) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-muted-foreground">Loading submission…</p>
      </div>
    );
  }

  const failed = isGradingError(submission.aiGrade);
  const grade = isGraded(submission.aiGrade) ? submission.aiGrade : null;
  const canReview = !!grade && submission.status !== "returned";
  const canReturn = submission.status === "teacher_reviewed";

  const parsedScore = Number(teacherScore);
  const scoreValid =
    teacherScore === "" ||
    (!Number.isNaN(parsedScore) && parsedScore >= 0 && parsedScore <= 100);

  function handleSaveReview() {
    if (!scoreValid) return;
    reviewMutation.mutate({
      score: teacherScore === "" ? undefined : parsedScore,
      feedback: teacherFeedback || undefined,
    });
  }

  return (
    <div className="max-w-4xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      <div className="space-y-4" data-testid="page-teacher-submission-review">
        <header>
          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">Submission review</h1>
            <Badge variant="outline" className="text-xs">
              Status: {submission.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Student ID {submission.studentId} · Submitted {new Date(submission.submittedAt).toLocaleString()}
          </p>
        </header>

        {failed && submission.aiGrade && "error" in submission.aiGrade && (
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="font-semibold text-red-900 mb-1">Grading failed</div>
            <p className="text-sm text-red-800">{submission.aiGrade.error}</p>
          </Card>
        )}

        {grade && (
          <>
            <Card className="p-5">
              <div className="flex items-end justify-between gap-4 mb-1">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    AI overall score
                  </div>
                  <div className="text-3xl font-bold tabular-nums">
                    {grade.overall_score}
                    <span className="text-lg text-slate-400 font-normal"> / 100</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    AI estimated CEFR
                  </div>
                  <div className="text-xl font-bold">{grade.estimated_cefr_for_this_writing}</div>
                </div>
              </div>
              {submission.teacherScore != null && (
                <p className="text-xs text-muted-foreground mt-2">
                  Teacher set final score to {submission.finalScore}
                </p>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="font-bold text-lg mb-2">Score breakdown</h2>
              <DimensionRow label="Task Achievement" {...grade.dimensions.task_achievement} />
              <DimensionRow label="Coherence & Cohesion" {...grade.dimensions.coherence_cohesion} />
              <DimensionRow label="Lexical Range" {...grade.dimensions.lexical_range} />
              <DimensionRow label="Grammatical Range & Accuracy" {...grade.dimensions.grammatical_range} />
              <DimensionRow label="Register & Tone" {...grade.dimensions.register_tone} />
            </Card>

            {grade.inline_annotations.length > 0 && (
              <Card className="p-5">
                <h2 className="font-bold text-lg mb-3">Inline annotations ({grade.inline_annotations.length})</h2>
                <div className="space-y-2">
                  {grade.inline_annotations.map((a, i) => (
                    <div
                      key={i}
                      className={`rounded-md border p-3 text-sm ${ISSUE_COLORS[a.issue_type]}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs capitalize bg-white">
                          {a.issue_type}
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize bg-white">
                          {a.severity}
                        </Badge>
                      </div>
                      <div className="italic">"{a.text_segment}"</div>
                      <div className="mt-1">
                        <span className="font-semibold">Suggested:</span> {a.suggestion}
                      </div>
                      <div className="mt-1 text-xs opacity-80">{a.explanation}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {grade.strengths.length > 0 && (
              <Card className="p-5">
                <h2 className="font-bold text-lg mb-2 text-emerald-700">Strengths</h2>
                <ul className="space-y-1.5">
                  {grade.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-slate-800 flex gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {grade.improvement_priorities.length > 0 && (
              <Card className="p-5">
                <h2 className="font-bold text-lg mb-2 text-orange-700">Improvement priorities</h2>
                <ol className="space-y-2">
                  {grade.improvement_priorities.map((p, i) => (
                    <li key={i} className="text-sm text-slate-800 flex gap-2">
                      <span className="text-orange-500 font-bold tabular-nums">{i + 1}.</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            )}

            {grade.spanish_speaker_patterns_noticed.length > 0 && (
              <Card className="p-5 bg-amber-50 border-amber-200">
                <h2 className="font-bold text-lg mb-2 text-amber-900">Spanish L1 patterns</h2>
                <ul className="space-y-1.5">
                  {grade.spanish_speaker_patterns_noticed.map((p, i) => (
                    <li key={i} className="text-sm text-amber-900">
                      {p}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}

        <Card className="p-5">
          <h2 className="font-bold text-lg mb-2">Student's writing</h2>
          <div className="font-serif text-base leading-relaxed whitespace-pre-wrap text-slate-800">
            {submission.content}
          </div>
        </Card>
      </div>

      {/* Right-rail review panel */}
      <aside className="lg:sticky lg:top-6 self-start space-y-3">
        <Card className="p-5">
          <h2 className="font-bold text-lg mb-3">Teacher review</h2>

          <div className="mb-3">
            <Label htmlFor="teacher-score" className="text-xs text-muted-foreground">
              Final score (0-100)
            </Label>
            <Input
              id="teacher-score"
              type="number"
              min={0}
              max={100}
              value={teacherScore}
              onChange={(e) => setTeacherScore(e.target.value)}
              disabled={!canReview || reviewMutation.isPending}
              data-testid="input-teacher-score"
            />
            {!scoreValid && (
              <p className="text-xs text-red-600 mt-1">Score must be 0-100</p>
            )}
            {grade && (
              <p className="text-xs text-muted-foreground mt-1">
                AI suggested: {grade.overall_score}/100
              </p>
            )}
          </div>

          <div className="mb-3">
            <Label htmlFor="teacher-feedback" className="text-xs text-muted-foreground">
              Feedback (optional)
            </Label>
            <Textarea
              id="teacher-feedback"
              rows={6}
              value={teacherFeedback}
              onChange={(e) => setTeacherFeedback(e.target.value)}
              placeholder="Add personal feedback the student will see alongside the AI grade."
              disabled={!canReview || reviewMutation.isPending}
              data-testid="input-teacher-feedback"
            />
          </div>

          <Button
            onClick={handleSaveReview}
            disabled={!canReview || !scoreValid || reviewMutation.isPending}
            className="w-full mb-2"
            data-testid="button-save-review"
          >
            {reviewMutation.isPending ? "Saving…" : "Save review"}
          </Button>

          <Button
            onClick={() => returnMutation.mutate()}
            disabled={!canReturn || returnMutation.isPending}
            variant="default"
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            data-testid="button-return-submission"
          >
            {returnMutation.isPending ? "Returning…" : "Return to student"}
          </Button>

          <p className="text-xs text-muted-foreground mt-3">
            <strong>Save review</strong> records your adjustments without releasing the grade to
            the student. <strong>Return to student</strong> finalizes — the student will see the
            grade in their dashboard.
          </p>
        </Card>
      </aside>
    </div>
  );
}
