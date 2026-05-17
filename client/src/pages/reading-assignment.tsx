/**
 * Reading Project — student-facing reading + comprehension quiz.
 *
 * Route: /dashboard/reading/:moduleId
 *
 * Loads /api/reading-projects/by-module/:moduleId (questions returned
 * with correctAnswer stripped). Renders the passage + N comprehension
 * questions. On submit, POSTs to /api/reading-submissions which auto-
 * grades + returns the score. Auto-navigates to the submission view.
 */

import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { ClickableWordPassage } from "@/components/reading/clickable-word-passage";

interface Question {
  id: string;
  type: "multiple_choice" | "true_false" | "fill_in";
  questionText: string;
  options?: string[];
}

interface ReadingProject {
  id: string;
  moduleId: string;
  level: string;
  title: string;
  passage: string;
  wordCount: number | null;
  questions: Question[];
  passingScore: number;
  estimatedReadMinutes: number | null;
}

export default function ReadingAssignmentPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const { data: proj, isLoading, error } = useQuery<ReadingProject>({
    queryKey: [`/api/reading-projects/by-module/${moduleId}`],
    enabled: !!moduleId,
  });

  const total = proj?.questions?.length ?? 0;
  const answeredCount = useMemo(() => Object.values(answers).filter(v => v !== undefined && v !== "").length, [answers]);
  const allAnswered = total > 0 && answeredCount === total;

  const submit = useMutation({
    mutationFn: async () => {
      if (!proj) throw new Error("No reading");
      const r = await apiRequest("POST", "/api/reading-submissions", {
        readingProjectId: proj.id,
        moduleId: proj.moduleId,
        answers,
      });
      return r.json();
    },
    onSuccess: (data) => {
      toast({ title: data.passed ? "You passed! 🎉" : "Keep practising — try again." });
      if (data.submissionId) navigate(`/dashboard/reading-submissions/${data.submissionId}`);
    },
    onError: (e: any) => toast({ title: "Couldn't submit", description: e?.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (error || !proj) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="p-8 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
          <h2 className="text-lg font-bold">No reading available for this module yet</h2>
          <p className="text-sm text-muted-foreground">Coral is still building this Reading Project.</p>
          <Button onClick={() => navigate("/dashboard/courses")}><ArrowLeft className="w-4 h-4 mr-2" /> Back to courses</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4" data-testid="page-reading-assignment">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="text-xl font-bold">{proj.title}</h1>
        <Badge variant="outline" className="text-xs">{proj.level}</Badge>
        {proj.wordCount && <Badge variant="secondary" className="text-xs">{proj.wordCount} words</Badge>}
        {proj.estimatedReadMinutes && (
          <Badge variant="secondary" className="text-xs"><Clock className="w-3 h-3 mr-1" /> ~{proj.estimatedReadMinutes} min read</Badge>
        )}
        <Badge className="text-xs bg-primary">Pass at {proj.passingScore}</Badge>
      </div>

      {/* Passage — every word is clickable; tap to see translation,
          definition, pronunciation, and add to your vocabulary. */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-1">
          <BookOpen className="w-4 h-4 text-primary" /> Reading passage
        </h3>
        <p className="text-[11px] text-muted-foreground mb-3 italic">
          Tap any word for translation, pronunciation, or to add it to your vocabulary.
        </p>
        <ClickableWordPassage passage={proj.passage} level={proj.level} moduleId={proj.moduleId} />
      </Card>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(answeredCount / Math.max(total, 1)) * 100}%` }} />
        </div>
        <span className="text-xs font-mono text-muted-foreground tabular-nums">{answeredCount}/{total}</span>
      </div>

      {/* Questions */}
      {proj.questions.map((q, idx) => (
        <Card key={q.id} className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-xs font-bold text-primary tabular-nums w-6 flex-shrink-0">{idx + 1}.</span>
            <p className="text-sm font-semibold leading-snug flex-1">{q.questionText}</p>
            {answers[q.id] && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
          </div>

          {q.type === "multiple_choice" && q.options && (
            <div className="space-y-2 ml-9">
              {q.options.map((opt, oi) => (
                <button type="button" key={oi}
                  onClick={() => setAnswers({ ...answers, [q.id]: String(oi) })}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${answers[q.id] === String(oi) ? "border-primary bg-primary/5 font-medium" : "border-border hover:bg-muted/50"}`}>
                  <span className="font-mono text-xs mr-2 text-muted-foreground">{String.fromCharCode(65 + oi)})</span>
                  {opt}
                </button>
              ))}
            </div>
          )}
          {q.type === "fill_in" && (
            <div className="ml-9">
              <input type="text" value={answers[q.id] || ""}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                placeholder="Type your answer"
                className="w-full p-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          )}
          {q.type === "true_false" && (
            <div className="flex gap-2 ml-9">
              {["true", "false"].map((v) => (
                <button key={v} type="button" onClick={() => setAnswers({ ...answers, [q.id]: v })}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${answers[q.id] === v ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                  {v}
                </button>
              ))}
            </div>
          )}
        </Card>
      ))}

      <Card className="p-4 sticky bottom-4 flex items-center justify-between gap-3 shadow-lg bg-card/95 backdrop-blur">
        <span className="text-sm">{allAnswered ? <span className="font-semibold text-emerald-700">All answered ✓</span> : <span className="text-muted-foreground">{total - answeredCount} more to answer</span>}</span>
        <Button disabled={!allAnswered || submit.isPending} onClick={() => submit.mutate()}>
          {submit.isPending ? "Grading…" : <>Submit reading <ArrowRight className="w-4 h-4 ml-1" /></>}
        </Button>
      </Card>
    </div>
  );
}
