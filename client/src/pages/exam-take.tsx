/**
 * Exam taker — the actual mastery exam interface.
 *
 * Route: /dashboard/exam/:level
 *
 * MVP scope (this commit): quiz section only. Writing + Speaking
 * sections will be added on top of the same attempt row in a follow-up;
 * the finalize() endpoint already pulls scores from submission rows
 * linked via attempt.writingSubmissionId / speakingSubmissionId, so
 * the future addition is purely additive UX.
 *
 * Flow:
 *   1. /api/final-exams/{level}/eligibility — quick check (server-side
 *      enforcement on start regardless)
 *   2. POST /api/final-exams/{level}/start — creates / resumes attempt
 *   3. Render questions sequentially; collect answers in local state
 *   4. POST /api/final-exam-attempts/{id}/submit-quiz with answers map
 *   5. POST /api/final-exam-attempts/{id}/finalize — computes weighted
 *      final score, issues Certificate if passed
 *   6. Navigate to /dashboard/exam/{level}/result/{attemptId}
 */

import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Award, ArrowLeft, ArrowRight, CheckCircle2, Clock, AlertTriangle, Loader2 } from "lucide-react";

interface FinalExamQuestion {
  id: string;
  moduleId: string | null;
  questionType: "multiple_choice" | "fill_in" | "true_false";
  questionText: string;
  options: string[] | null;
  cefrDescriptor: string | null;
  points: number;
  orderIndex: number;
}

interface FinalExam {
  id: string;
  level: string;
  title: string;
  description: string;
  passingScore: number;
  durationMinutes: number;
  questions: FinalExamQuestion[];
}

interface FinalExamAttempt {
  id: string;
  examId: string;
  status: string;
}

export default function ExamTakePage() {
  const { level } = useParams<{ level: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch exam config + questions
  const { data: exam, isLoading: examLoading, error: examError } = useQuery<FinalExam>({
    queryKey: [`/api/final-exams/${level}`],
  });

  // Create / resume attempt
  const startMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", `/api/final-exams/${level}/start`, {});
      return (await r.json()) as FinalExamAttempt;
    },
  });
  useEffect(() => {
    if (exam && !startMutation.data && !startMutation.isPending) {
      startMutation.mutate();
    }
  }, [exam]);

  const attempt = startMutation.data;

  // Quiz answer state: questionId -> answer string (for MC = option index)
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState(false);

  const total = exam?.questions?.length ?? 0;
  const answeredCount = useMemo(() => Object.values(answers).filter(v => v !== undefined && v !== "").length, [answers]);
  const allAnswered = total > 0 && answeredCount === total;

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!attempt) throw new Error("No attempt");
      // Submit quiz
      await apiRequest("POST", `/api/final-exam-attempts/${attempt.id}/submit-quiz`, { answers });
      // Finalize
      const r = await apiRequest("POST", `/api/final-exam-attempts/${attempt.id}/finalize`, {});
      return r.json();
    },
    onSuccess: () => {
      if (attempt) navigate(`/dashboard/exam/${level}/result/${attempt.id}`);
    },
    onError: (err: any) => {
      toast({ title: "Couldn't submit exam", description: err?.message, variant: "destructive" });
    },
  });

  if (examLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (examError || !exam) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="p-8 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
          <h2 className="text-lg font-bold">Exam not found or not published yet</h2>
          <Button onClick={() => navigate("/dashboard/exams")}><ArrowLeft className="w-4 h-4 mr-2" /> Back to exams</Button>
        </Card>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="p-8 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
          <h2 className="text-lg font-bold">No questions configured yet</h2>
          <p className="text-sm text-muted-foreground">Coral is still building the {level} question bank. Check back soon!</p>
          <Button onClick={() => navigate("/dashboard/exams")}><ArrowLeft className="w-4 h-4 mr-2" /> Back to exams</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4" data-testid="page-exam-take">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/exams")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Exams
        </Button>
        <h1 className="text-xl font-bold">{exam.title}</h1>
        <Badge variant="outline" className="text-xs">{exam.level}</Badge>
        <Badge variant="secondary" className="text-xs"><Clock className="w-3 h-3 mr-1" /> {exam.durationMinutes} min</Badge>
        <Badge className="text-xs bg-primary"><Award className="w-3 h-3 mr-1" /> Pass at {exam.passingScore}</Badge>
      </div>

      <Card className="p-4 bg-amber-50/50 border-amber-200 text-sm">
        <p>
          <strong>Read every question carefully.</strong> Answer all {total} questions. You can review your answers
          before final submission. Once you submit, you'll get your weighted final score and certificate (if you pass).
        </p>
      </Card>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(answeredCount / total) * 100}%` }} />
        </div>
        <span className="text-xs font-mono text-muted-foreground tabular-nums">{answeredCount}/{total}</span>
      </div>

      {/* Questions list */}
      {exam.questions.map((q, idx) => (
        <Card key={q.id} className="p-5 space-y-3" data-testid={`exam-question-${idx}`}>
          <div className="flex items-start gap-3">
            <span className="text-xs font-bold text-primary tabular-nums w-6 flex-shrink-0">{idx + 1}.</span>
            <div className="flex-1">
              <p className="text-sm font-semibold leading-snug">{q.questionText}</p>
              {q.cefrDescriptor && (
                <p className="text-[10px] text-muted-foreground mt-1 italic">CEFR — {q.cefrDescriptor}</p>
              )}
            </div>
            {answers[q.id] && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
          </div>

          {q.questionType === "multiple_choice" && q.options && (
            <div className="space-y-2 ml-9">
              {q.options.map((opt, oi) => {
                const selected = answers[q.id] === String(oi);
                return (
                  <button
                    type="button"
                    key={oi}
                    onClick={() => setAnswers({ ...answers, [q.id]: String(oi) })}
                    className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                      selected ? "border-primary bg-primary/5 font-medium" : "border-border hover:bg-muted/50"
                    }`}
                    data-testid={`exam-option-${idx}-${oi}`}
                  >
                    <span className="font-mono text-xs mr-2 text-muted-foreground">{String.fromCharCode(65 + oi)})</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {q.questionType === "fill_in" && (
            <div className="ml-9">
              <input
                type="text"
                value={answers[q.id] || ""}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                placeholder="Type your answer"
                className="w-full p-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                data-testid={`exam-fillin-${idx}`}
              />
            </div>
          )}

          {q.questionType === "true_false" && (
            <div className="flex gap-2 ml-9">
              {["true", "false"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAnswers({ ...answers, [q.id]: v })}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                    answers[q.id] === v ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </Card>
      ))}

      {/* Submit footer */}
      <Card className="p-4 sticky bottom-4 flex items-center justify-between gap-3 shadow-lg bg-card/95 backdrop-blur">
        <div className="text-sm">
          {allAnswered ? (
            <span className="font-semibold text-emerald-700">All questions answered ✓</span>
          ) : (
            <span className="text-muted-foreground">{total - answeredCount} more to answer</span>
          )}
        </div>
        <Button
          disabled={!allAnswered || submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
          className="font-semibold"
          data-testid="button-submit-exam"
        >
          {submitMutation.isPending ? "Grading…" : <>Submit exam <ArrowRight className="w-4 h-4 ml-1" /></>}
        </Button>
      </Card>
    </div>
  );
}
