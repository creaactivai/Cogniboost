/**
 * Listening submission view — shows the student their score, a per-question
 * breakdown (closed = right/wrong + explanation, open = Claude feedback),
 * and finally REVEALS the transcript so they can compare what they heard.
 *
 * Route: /dashboard/listening-submissions/:id
 */

import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, XCircle, Trophy, Unlock, Headphones, Loader2, Sparkles } from "lucide-react";

interface ListeningGrade {
  score: number;
  total: number;
  earned: number;
  passed: boolean;
  transcript?: string;
  detail: Array<{
    qid: string;
    type?: string;
    given: string;
    correct?: string;
    right: boolean;
    score?: number | null;
    feedback?: string;
    explanation?: string;
    sampleAnswer?: string;
  }>;
}

interface ListeningSubmission {
  id: string;
  moduleId: string;
  aiGrade: ListeningGrade;
  aiScore: string;
  transcript?: string;
  submittedAt: string;
}

export default function ListeningSubmissionViewPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: sub, isLoading } = useQuery<ListeningSubmission>({
    queryKey: [`/api/listening-submissions/${id}`],
    enabled: !!id,
  });

  if (isLoading || !sub) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const grade = sub.aiGrade;
  const transcript = grade.transcript || sub.transcript || "";

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/courses")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Courses
        </Button>
        <h1 className="text-xl font-bold">Listening result</h1>
      </div>

      <Card className="p-6 text-center space-y-3">
        {grade.passed ? <Trophy className="w-12 h-12 mx-auto text-amber-500" /> : <XCircle className="w-12 h-12 mx-auto text-muted-foreground" />}
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Score</p>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-6xl font-bold tabular-nums">{Math.round(grade.score)}</span>
            <span className="text-2xl text-muted-foreground">/100</span>
          </div>
        </div>
        <Badge className={grade.passed ? "bg-emerald-500 text-white" : "bg-slate-400 text-white"}>
          {grade.passed ? "PASSED" : "Not passed — try again"}
        </Badge>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Headphones className="w-4 h-4 text-primary" /> Answer review</h3>
        <div className="space-y-2">
          {grade.detail.map((d, i) => (
            <div key={d.qid} className={`p-3 rounded-lg border text-sm ${d.right ? "border-emerald-200 bg-emerald-50/30" : "border-amber-200 bg-amber-50/30"}`}>
              <div className="flex items-start gap-2">
                {d.right ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">
                    Q{i + 1}{d.type === "open" && typeof d.score === "number" ? ` · ${d.score}/100` : ""}
                  </p>
                  <p>Your answer: <strong>{d.given || "(no answer)"}</strong></p>
                  {d.type === "open" ? (
                    <>
                      {d.feedback && (
                        <p className="text-xs text-primary mt-1 flex items-start gap-1">
                          <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span className="italic">{d.feedback}</span>
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      {!d.right && d.correct && (
                        <p className="text-emerald-700 mt-1">Correct answer: <strong>{d.correct}</strong></p>
                      )}
                      {d.explanation && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{d.explanation}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Transcript revealed */}
      {transcript && (
        <Card className="p-5 space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Unlock className="w-4 h-4 text-primary" /> Transcript (now revealed)</h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{transcript}</p>
        </Card>
      )}

      <div className="flex gap-2 justify-center pt-2">
        <Button variant="outline" onClick={() => navigate("/dashboard/courses")}>
          Back to courses
        </Button>
        <Button onClick={() => navigate(`/dashboard/listening/${sub.moduleId}`)}>
          Listen again
        </Button>
      </div>
    </div>
  );
}
