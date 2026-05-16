/**
 * Reading submission view — shows the student their auto-graded score
 * with a per-question breakdown (right/wrong + explanation).
 *
 * Route: /dashboard/reading-submissions/:id
 */

import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, XCircle, Trophy, BookOpen, Loader2 } from "lucide-react";

interface ReadingGrade {
  score: number;
  total: number;
  earned: number;
  passed: boolean;
  detail: Array<{
    qid: string;
    given: string;
    correct: string;
    right: boolean;
    explanation?: string;
  }>;
}

interface ReadingSubmission {
  id: string;
  moduleId: string;
  aiGrade: ReadingGrade;
  aiScore: string;
  submittedAt: string;
}

export default function ReadingSubmissionViewPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: sub, isLoading } = useQuery<ReadingSubmission>({
    queryKey: [`/api/reading-submissions/${id}`],
    enabled: !!id,
  });

  if (isLoading || !sub) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const grade = sub.aiGrade;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/courses")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Courses
        </Button>
        <h1 className="text-xl font-bold">Reading result</h1>
      </div>

      <Card className="p-6 text-center space-y-3">
        {grade.passed ? <Trophy className="w-12 h-12 mx-auto text-amber-500" /> : <XCircle className="w-12 h-12 mx-auto text-muted-foreground" />}
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Score</p>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-6xl font-bold tabular-nums">{Math.round(grade.score)}</span>
            <span className="text-2xl text-muted-foreground">/100</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{grade.earned} of {grade.total} correct</p>
        </div>
        <Badge className={grade.passed ? "bg-emerald-500 text-white" : "bg-slate-400 text-white"}>
          {grade.passed ? "PASSED" : "Not passed — try again"}
        </Badge>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><BookOpen className="w-4 h-4 text-primary" /> Answer review</h3>
        <div className="space-y-2">
          {grade.detail.map((d, i) => (
            <div key={d.qid} className={`p-3 rounded-lg border text-sm ${d.right ? "border-emerald-200 bg-emerald-50/30" : "border-red-200 bg-red-50/30"}`}>
              <div className="flex items-start gap-2">
                {d.right ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">Q{i + 1}</p>
                  <p>Your answer: <strong>{d.given || "(no answer)"}</strong></p>
                  {!d.right && (
                    <p className="text-emerald-700 mt-1">Correct answer: <strong>{d.correct}</strong></p>
                  )}
                  {d.explanation && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{d.explanation}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-2 justify-center pt-2">
        <Button variant="outline" onClick={() => navigate("/dashboard/courses")}>
          Back to courses
        </Button>
        <Button onClick={() => navigate(`/dashboard/reading/${sub.moduleId}`)}>
          Retake reading
        </Button>
      </div>
    </div>
  );
}
