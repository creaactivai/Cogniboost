/**
 * Teacher Speaking Review — speaking-aware mirror of the writing review.
 *
 * Route: /dashboard/teacher/speaking/:id
 *
 * Shows the audio/video player, transcript, AI grade (5 dimensions
 * specific to speaking: Task Achievement, Fluency & Coherence,
 * Pronunciation & Intelligibility, Lexical Range, Grammatical Range)
 * plus a teacher override panel: numeric score (0-100) + feedback +
 * Save review / Return-to-student.
 *
 * Reuses the existing /api/submissions/:id GET and
 * /api/submissions/:id/teacher-review POST and
 * /api/submissions/:id/return POST endpoints — they operate on the
 * shared submissions table for both writing and speaking.
 */

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Headphones, BarChart3, Search, Lightbulb, GraduationCap, FileText, Trophy } from "lucide-react";

interface DimScore { score: number; feedback: string }
interface InlineNote {
  text_segment: string;
  issue_type: string;
  explanation: string;
  suggestion: string;
  severity: "minor" | "moderate" | "major";
}
interface SpeakingGrade {
  overall_score: number;
  level_assessment: string;
  dimensions: {
    task_achievement: DimScore;
    fluency_coherence: DimScore;
    pronunciation_intelligibility: DimScore;
    lexical_range: DimScore;
    grammatical_range: DimScore;
  };
  inline_notes?: InlineNote[];
  strengths?: string[];
  improvement_priorities?: string[];
  target_vocabulary_used?: string[];
  target_vocabulary_missing?: string[];
  target_grammar_demonstrated?: string[];
  spanish_speaker_patterns_noticed?: string[];
  words_per_minute?: number;
  error?: boolean;
  message?: string;
}
interface SpeakingSubmission {
  id: string;
  studentId: string;
  assignmentType: string;
  status: "pending_ai" | "ai_graded" | "teacher_reviewed" | "returned";
  audioUrl: string | null;
  videoUrl: string | null;
  transcript: string | null;
  content: string | null;
  durationSeconds: number | null;
  aiGrade: SpeakingGrade | null;
  aiScore: string | null;
  teacherScore: string | null;
  teacherFeedback: string | null;
  finalScore: string | null;
  submittedAt: string;
  teacherReviewedAt: string | null;
}

function DimensionRow({ label, score, feedback }: { label: string; score: number; feedback: string }) {
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

export default function TeacherSpeakingReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: submission, isLoading } = useQuery<SpeakingSubmission>({
    queryKey: [`/api/submissions/${id}`],
    refetchInterval: (query) => {
      const s = query.state.data as SpeakingSubmission | undefined;
      if (!s) return 5_000;
      return s.status === "pending_ai" ? 5_000 : false;
    },
  });

  const [teacherScore, setTeacherScore] = useState<string>("");
  const [teacherFeedback, setTeacherFeedback] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (submission && !hydrated) {
      setTeacherScore(String(submission.teacherScore ?? submission.aiScore ?? ""));
      setTeacherFeedback(submission.teacherFeedback ?? "");
      setHydrated(true);
    }
  }, [submission, hydrated]);

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
    onError: (err: Error) => toast({ title: "Could not save review", description: err.message, variant: "destructive" }),
  });

  const returnMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/submissions/${id}/return`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/submissions/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/submissions/queue"] });
      toast({ title: "Returned to student" });
      navigate("/dashboard/teacher");
    },
    onError: (err: Error) => toast({ title: "Could not return submission", description: err.message, variant: "destructive" }),
  });

  if (isLoading || !submission) {
    return <div className="max-w-4xl mx-auto p-6"><p className="text-muted-foreground">Loading submission…</p></div>;
  }

  const grade = submission.aiGrade && !submission.aiGrade.error ? submission.aiGrade : null;
  const failed = !!submission.aiGrade?.error;
  const canReview = !!grade && submission.status !== "returned";
  const canReturn = submission.status === "teacher_reviewed";
  const mediaUrl = submission.videoUrl || submission.audioUrl;
  const isVideo = !!submission.videoUrl;
  const transcript = submission.transcript || submission.content || "";

  const parsedScore = Number(teacherScore);
  const scoreValid =
    teacherScore === "" ||
    (!Number.isNaN(parsedScore) && parsedScore >= 0 && parsedScore <= 100);

  return (
    <div className="max-w-4xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      <div className="space-y-4" data-testid="page-teacher-speaking-review">
        <header className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/teacher"><ArrowLeft className="w-4 h-4 mr-1" /> Queue</Link>
          </Button>
          <h1 className="text-2xl font-bold">Speaking review</h1>
          <Badge variant="outline" className="text-xs">{submission.status}</Badge>
        </header>
        <p className="text-xs text-muted-foreground">
          Student ID {submission.studentId} · Submitted {new Date(submission.submittedAt).toLocaleString()}
        </p>

        {/* Audio / Video player */}
        {mediaUrl && (
          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Headphones className="w-4 h-4 text-primary" /> Student's recording
              {submission.durationSeconds && (
                <span className="text-xs text-muted-foreground font-normal">· {submission.durationSeconds}s</span>
              )}
            </h3>
            {isVideo ? (
              <video controls src={mediaUrl} className="w-full rounded-lg" />
            ) : (
              <audio controls src={mediaUrl} className="w-full" />
            )}
          </Card>
        )}

        {/* Failed grading */}
        {failed && (
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="font-semibold text-red-900 mb-1">Grading failed</div>
            <p className="text-sm text-red-800">{submission.aiGrade?.message || "Unknown error."}</p>
          </Card>
        )}

        {grade && (
          <>
            <Card className="p-5">
              <div className="flex items-end justify-between gap-4 mb-1">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">AI overall score</div>
                  <div className="text-3xl font-bold tabular-nums">
                    {grade.overall_score}
                    <span className="text-lg text-slate-400 font-normal"> / 100</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">CEFR estimate</div>
                  <div className="text-xl font-bold">{grade.level_assessment}</div>
                </div>
              </div>
              {submission.teacherScore != null && (
                <p className="text-xs text-muted-foreground mt-2">
                  Teacher final score: <strong>{submission.finalScore || submission.teacherScore}</strong>
                </p>
              )}
              {grade.words_per_minute != null && (
                <p className="text-xs text-muted-foreground mt-1">Speaking rate: {grade.words_per_minute} WPM</p>
              )}
            </Card>

            {/* Speaking-specific 5 dimensions */}
            <Card className="p-5">
              <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" /> Score breakdown
              </h2>
              <DimensionRow label="Task Achievement" {...grade.dimensions.task_achievement} />
              <DimensionRow label="Fluency & Coherence" {...grade.dimensions.fluency_coherence} />
              <DimensionRow label="Pronunciation & Intelligibility" {...grade.dimensions.pronunciation_intelligibility} />
              <DimensionRow label="Lexical Range" {...grade.dimensions.lexical_range} />
              <DimensionRow label="Grammatical Range" {...grade.dimensions.grammatical_range} />
            </Card>

            {/* Transcript */}
            {transcript && (
              <Card className="p-5">
                <h2 className="font-bold text-lg mb-2 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" /> Transcript
                </h2>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{transcript}</p>
              </Card>
            )}

            {/* Strengths / improvements */}
            {grade.strengths && grade.strengths.length > 0 && (
              <Card className="p-5 bg-emerald-50/40 border-emerald-200">
                <h2 className="font-bold text-lg mb-2 flex items-center gap-2 text-emerald-800">
                  <Trophy className="w-5 h-5" /> Strengths
                </h2>
                <ul className="space-y-1 text-sm text-emerald-900">
                  {grade.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                </ul>
              </Card>
            )}

            {grade.improvement_priorities && grade.improvement_priorities.length > 0 && (
              <Card className="p-5 bg-blue-50/40 border-blue-200">
                <h2 className="font-bold text-lg mb-2 text-blue-900">Focus on next time</h2>
                <ol className="space-y-2 list-decimal list-inside text-sm text-blue-900">
                  {grade.improvement_priorities.map((p, i) => <li key={i}>{p}</li>)}
                </ol>
              </Card>
            )}

            {/* Inline notes — pronunciation/grammar/vocab patterns the AI flagged */}
            {grade.inline_notes && grade.inline_notes.length > 0 && (
              <Card className="p-5">
                <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" /> Specific notes ({grade.inline_notes.length})
                </h2>
                <div className="space-y-2">
                  {grade.inline_notes.map((n, i) => (
                    <div key={i} className="border-l-4 border-primary/30 pl-3 py-1 text-sm space-y-1">
                      <div className="flex gap-2 items-center flex-wrap">
                        <Badge variant="outline" className="text-xs capitalize">{n.issue_type}</Badge>
                        <Badge variant="outline" className="text-xs capitalize">{n.severity}</Badge>
                      </div>
                      <p className="italic">"{n.text_segment}"</p>
                      <p className="text-muted-foreground">{n.explanation}</p>
                      <p className="flex items-start gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> Try: <strong>{n.suggestion}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Spanish-speaker patterns */}
            {grade.spanish_speaker_patterns_noticed && grade.spanish_speaker_patterns_noticed.length > 0 && (
              <Card className="p-5">
                <h2 className="font-bold text-sm mb-2">Spanish-speaker patterns to watch</h2>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {grade.spanish_speaker_patterns_noticed.map((p, i) => <li key={i}>• {p}</li>)}
                </ul>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Right rail — teacher review panel */}
      <aside className="space-y-4">
        <Card className="p-5 sticky top-4">
          <h2 className="font-bold text-lg mb-3 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" /> Teacher review
          </h2>

          <div className="space-y-3">
            <div>
              <Label htmlFor="score" className="text-xs">Final score (0-100)</Label>
              <Input
                id="score"
                inputMode="numeric"
                value={teacherScore}
                onChange={(e) => setTeacherScore(e.target.value)}
                placeholder="e.g. 78"
                className={!scoreValid ? "border-destructive" : ""}
                data-testid="input-teacher-score"
              />
              {!scoreValid && <p className="text-xs text-destructive mt-1">Score must be 0-100.</p>}
              {grade && (
                <p className="text-[10px] text-muted-foreground mt-1">AI said {grade.overall_score}/100</p>
              )}
            </div>
            <div>
              <Label htmlFor="feedback" className="text-xs">Feedback to student</Label>
              <Textarea
                id="feedback"
                value={teacherFeedback}
                onChange={(e) => setTeacherFeedback(e.target.value)}
                rows={6}
                placeholder="Add personal feedback (overrides or complements the AI grade)…"
                data-testid="textarea-teacher-feedback"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <Button
              disabled={!canReview || reviewMutation.isPending || !scoreValid}
              onClick={() => reviewMutation.mutate({
                score: teacherScore === "" ? undefined : parsedScore,
                feedback: teacherFeedback || undefined,
              })}
              data-testid="button-save-review"
            >
              {reviewMutation.isPending ? "Saving…" : "Save review"}
            </Button>
            <Button
              variant="outline"
              disabled={!canReturn || returnMutation.isPending}
              onClick={() => returnMutation.mutate()}
              data-testid="button-return-to-student"
            >
              {returnMutation.isPending ? "Returning…" : "Return to student"}
            </Button>
            {!canReturn && (
              <p className="text-[10px] text-muted-foreground">Save the review first before returning to the student.</p>
            )}
          </div>
        </Card>
      </aside>
    </div>
  );
}
