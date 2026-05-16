/**
 * Speaking-submission view — shows the student their grade + feedback.
 *
 * Polls /api/speaking-submissions/:id every 5s until status leaves
 * 'pending_ai'. Then renders the structured SpeakingGradeResponse:
 *   overall + 5 dimensions + transcript + strengths + improvements +
 *   target vocab used/missing + Spanish-speaker patterns.
 */

import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  inline_notes: InlineNote[];
  strengths: string[];
  improvement_priorities: string[];
  target_vocabulary_used: string[];
  target_vocabulary_missing: string[];
  target_grammar_demonstrated: string[];
  spanish_speaker_patterns_noticed: string[];
  words_per_minute: number;
  // Error envelope when grading fails:
  error?: boolean;
  message?: string;
  errorDetail?: string;
}

interface SpeakingSubmission {
  id: string;
  status: "pending_ai" | "ai_graded" | "teacher_reviewed" | "returned";
  moduleId: string;
  speakingProjectId: string;
  audioUrl: string | null;
  videoUrl: string | null;
  transcript: string | null;
  durationSeconds: number | null;
  aiGrade: SpeakingGrade | null;
  aiScore: string | null;
  teacherScore: string | null;
  teacherFeedback: string | null;
  finalScore: string | null;
  submittedAt: string;
  teacherReviewedAt: string | null;
}

export default function SpeakingSubmissionViewPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const id = params.id;

  const { data: sub, refetch } = useQuery<SpeakingSubmission>({
    queryKey: [`/api/speaking-submissions/${id}`],
    enabled: !!id,
    refetchInterval: (q) => {
      const data: any = q.state.data;
      if (!data) return 2000;
      // Keep polling while pending; stop once graded (or errored)
      if (data.status === "pending_ai" && !data.aiGrade?.error) return 5000;
      return false;
    },
  });

  // While pending, show a friendly spinner
  if (!sub) {
    return <div className="max-w-3xl mx-auto p-6 text-center">Loading submission…</div>;
  }

  const isPending = sub.status === "pending_ai" && !sub.aiGrade?.error;
  const isError = !!sub.aiGrade?.error;
  const grade = sub.aiGrade && !sub.aiGrade.error ? sub.aiGrade : null;
  const mediaUrl = sub.videoUrl || sub.audioUrl;
  const isVideo = !!sub.videoUrl;

  if (isPending) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <Card className="p-8 text-center space-y-4">
          <div className="text-5xl animate-pulse">🎧</div>
          <h2 className="text-xl font-bold">Grading your recording…</h2>
          <p className="text-muted-foreground">
            We're grading your recording with the CogniBoost Speaking Rubric.
            This usually takes about a minute.
          </p>
          <div className="text-sm text-muted-foreground">
            Status: <Badge variant="outline">{sub.status}</Badge>
          </div>
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
          <h2 className="text-xl font-bold text-destructive">⚠️ Grading didn't complete</h2>
          <p>{sub.aiGrade?.message || "Something went wrong while grading your recording."}</p>
          {mediaUrl && (
            <div className="pt-2">
              <p className="text-sm font-semibold mb-2">Your recording was saved:</p>
              {isVideo ? (
                <video src={mediaUrl} controls className="w-full max-h-72 rounded-lg" />
              ) : (
                <audio src={mediaUrl} controls className="w-full" />
              )}
            </div>
          )}
          <div className="flex gap-2 pt-3">
            <Button variant="outline" onClick={() => navigate(`/dashboard/speaking/${sub.moduleId}`)}>
              🔄 Try again
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
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <p>Grade not yet available. Please refresh.</p>
      </div>
    );
  }

  const pass = grade.overall_score >= 70;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6" data-testid="page-speaking-submission">
      {/* Header card */}
      <Card className="p-6 text-center space-y-2">
        <div className="text-sm text-muted-foreground">Your Speaking Grade</div>
        <div className="flex items-center justify-center gap-3">
          <div className="text-6xl font-bold">{grade.overall_score}</div>
          <div className="text-3xl text-muted-foreground">/100</div>
        </div>
        <div>
          <Badge variant={pass ? "default" : "secondary"} className="text-sm">
            {pass ? "✅" : "📚"} {bandLabel(grade.overall_score)}
          </Badge>
          <Badge variant="outline" className="ml-2 text-sm">
            CEFR: {grade.level_assessment}
          </Badge>
        </div>
        {sub.durationSeconds && (
          <div className="text-xs text-muted-foreground">
            Duration: {formatDuration(sub.durationSeconds)} · {grade.words_per_minute} WPM
          </div>
        )}
        {sub.teacherScore && (
          <div className="text-xs">
            Teacher score (override): <strong>{sub.teacherScore}/100</strong>
          </div>
        )}
      </Card>

      {/* Audio/video playback */}
      {mediaUrl && (
        <Card className="p-4 space-y-2">
          <h3 className="font-semibold text-sm">🎧 Your recording</h3>
          {isVideo ? (
            <video src={mediaUrl} controls className="w-full max-h-72 rounded-lg" />
          ) : (
            <audio src={mediaUrl} controls className="w-full" />
          )}
        </Card>
      )}

      {/* Dimensions grid */}
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">📊 Dimension Scores</h3>
        <DimensionRow label="Task Achievement & Module Application" {...grade.dimensions.task_achievement} />
        <DimensionRow label="Fluency & Coherence" {...grade.dimensions.fluency_coherence} />
        <DimensionRow label="Pronunciation & Intelligibility" {...grade.dimensions.pronunciation_intelligibility} />
        <DimensionRow label="Lexical Range" {...grade.dimensions.lexical_range} />
        <DimensionRow label="Grammatical Range & Accuracy" {...grade.dimensions.grammatical_range} />
      </Card>

      {/* Strengths */}
      {grade.strengths && grade.strengths.length > 0 && (
        <Card className="p-6 space-y-2 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900">
          <h3 className="font-semibold text-green-900 dark:text-green-100">💪 Strengths</h3>
          <ul className="space-y-1">
            {grade.strengths.map((s, i) => (
              <li key={i} className="text-sm">• {s}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Improvements */}
      {grade.improvement_priorities && grade.improvement_priorities.length > 0 && (
        <Card className="p-6 space-y-2 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">🎯 Focus on next time</h3>
          <ol className="space-y-2 list-decimal list-inside">
            {grade.improvement_priorities.map((p, i) => (
              <li key={i} className="text-sm">{p}</li>
            ))}
          </ol>
        </Card>
      )}

      {/* Target vocabulary tracking */}
      {(grade.target_vocabulary_used?.length || grade.target_vocabulary_missing?.length) && (
        <Card className="p-6 space-y-3">
          <h3 className="font-semibold">📚 Module vocabulary tracking</h3>
          {grade.target_vocabulary_used?.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">✅ Words you used:</p>
              <div className="flex flex-wrap gap-1">
                {grade.target_vocabulary_used.map((w) => (
                  <span key={w} className="text-xs bg-green-100 dark:bg-green-900/40 text-green-900 dark:text-green-100 px-2 py-1 rounded">
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}
          {grade.target_vocabulary_missing?.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">📝 Words to try next time:</p>
              <div className="flex flex-wrap gap-1">
                {grade.target_vocabulary_missing.map((w) => (
                  <span key={w} className="text-xs bg-muted px-2 py-1 rounded">
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}
          {grade.target_grammar_demonstrated?.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">🎯 Grammar demonstrated:</p>
              <div className="flex flex-wrap gap-1">
                {grade.target_grammar_demonstrated.map((g) => (
                  <span key={g} className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 px-2 py-1 rounded">
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Transcript */}
      {sub.transcript && (
        <Card className="p-6 space-y-2">
          <h3 className="font-semibold text-sm">📝 Transcript</h3>
          <p className="text-sm text-muted-foreground italic whitespace-pre-wrap">"{sub.transcript}"</p>
        </Card>
      )}

      {/* Inline notes */}
      {grade.inline_notes && grade.inline_notes.length > 0 && (
        <Card className="p-6 space-y-3">
          <h3 className="font-semibold">🔍 Specific notes</h3>
          {grade.inline_notes.map((n, i) => (
            <div key={i} className="border-l-4 border-primary/30 pl-3 py-1 text-sm space-y-1">
              <div className="flex gap-2 items-center">
                <Badge variant="outline" className="text-xs">{n.issue_type}</Badge>
                <Badge variant="outline" className="text-xs">{n.severity}</Badge>
              </div>
              <p className="italic">"{n.text_segment}"</p>
              <p className="text-muted-foreground">{n.explanation}</p>
              <p>💡 Try: <strong>{n.suggestion}</strong></p>
            </div>
          ))}
        </Card>
      )}

      {/* L1 patterns */}
      {grade.spanish_speaker_patterns_noticed && grade.spanish_speaker_patterns_noticed.length > 0 && (
        <Card className="p-6 space-y-2">
          <h3 className="font-semibold text-sm">🇪🇸 Spanish-speaker patterns to watch</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            {grade.spanish_speaker_patterns_noticed.map((p, i) => (
              <li key={i}>• {p}</li>
            ))}
          </ul>
        </Card>
      )}

      {/* Teacher feedback (if any) */}
      {sub.teacherFeedback && (
        <Card className="p-6 space-y-2 border-purple-200 bg-purple-50 dark:bg-purple-950/20">
          <h3 className="font-semibold text-purple-900 dark:text-purple-100">👩‍🏫 From your teacher</h3>
          <p className="text-sm whitespace-pre-wrap">{sub.teacherFeedback}</p>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 justify-center pt-2">
        <Button variant="outline" onClick={() => navigate(`/dashboard/speaking/${sub.moduleId}`)}>
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
        <div
          className="h-full bg-primary rounded transition-all"
          style={{ width: `${pct}%` }}
        />
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

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}
