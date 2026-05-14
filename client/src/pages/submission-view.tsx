/**
 * Submission view — student sees their AI grade + dimensions + annotations +
 * (when applicable) the teacher's override.
 *
 * Polls /api/submissions/:id every 5s while status='pending_ai' until grading
 * completes. Stops polling once the grade lands or an error surfaces.
 *
 * Renders per Master Plan v2.0 §4.3 / §4.4:
 * - Overall score + estimated CEFR
 * - 5 dimensions with per-dim score and feedback
 * - Inline annotations (color-coded by issue type and severity)
 * - Strengths + improvement priorities
 * - Vocabulary used correctly / misused
 * - Spanish L1 patterns noticed
 * - Teacher override panel (visible once status >= 'teacher_reviewed')
 */

import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

const SEVERITY_LABELS: Record<InlineAnnotation["severity"], string> = {
  minor: "minor",
  moderate: "moderate",
  major: "major",
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
  const pct = (score / 20) * 100;
  return (
    <div className="border-b border-slate-100 last:border-0 py-3">
      <div className="flex items-center justify-between mb-1">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-sm tabular-nums">
          <span className="font-bold">{score}</span>
          <span className="text-slate-400"> / 20</span>
        </div>
      </div>
      <Progress value={pct} className="h-1.5 mb-2" />
      <p className="text-sm text-slate-700 leading-relaxed">{feedback}</p>
    </div>
  );
}

export default function SubmissionViewPage() {
  const { id } = useParams<{ id: string }>();

  const { data: submission, isLoading } = useQuery<Submission>({
    queryKey: [`/api/submissions/${id}`],
    // Poll every 5s while grading is in progress. Stop once the grade lands
    // or moves to a terminal state.
    refetchInterval: (query) => {
      const s = query.state.data as Submission | undefined;
      if (!s) return 5_000;
      return s.status === "pending_ai" ? 5_000 : false;
    },
  });

  if (isLoading || !submission) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-muted-foreground">Loading submission…</p>
      </div>
    );
  }

  const gradingFailed = isGradingError(submission.aiGrade);
  const isPending = submission.status === "pending_ai" && !gradingFailed;
  const grade = isGraded(submission.aiGrade) ? submission.aiGrade : null;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4" data-testid="page-submission-view">
      <header>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">Your submission</h1>
          <StatusBadge status={submission.status} />
        </div>
        <p className="text-xs text-muted-foreground">
          Submitted {new Date(submission.submittedAt).toLocaleString()}
        </p>
      </header>

      {/* Pending state */}
      {isPending && (
        <Card className="p-6 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600" />
            <div>
              <div className="font-semibold text-amber-900">Grading in progress…</div>
              <p className="text-sm text-amber-800">
                Claude is reading your writing against the CEFR rubric. This usually takes
                about 1–2 minutes. You'll see your grade here as soon as it's ready — no need to
                refresh.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Grading-failed state */}
      {gradingFailed && submission.aiGrade && "error" in submission.aiGrade && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="font-semibold text-red-900 mb-1">Grading didn't complete</div>
          <p className="text-sm text-red-800">{submission.aiGrade.error}</p>
          <p className="text-xs text-red-700 mt-2">
            A teacher will retry grading manually. Your submission is preserved.
          </p>
        </Card>
      )}

      {/* Successful grade */}
      {grade && (
        <>
          <Card className="p-5">
            <div className="flex items-end justify-between gap-4 mb-1">
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Overall score
                </div>
                <div className="text-4xl font-bold tabular-nums">
                  {submission.finalScore ?? grade.overall_score}
                  <span className="text-xl text-slate-400 font-normal"> / 100</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  This writing demonstrates
                </div>
                <div className="text-xl font-bold">{grade.estimated_cefr_for_this_writing}</div>
              </div>
            </div>
            {submission.teacherScore != null && (
              <p className="text-xs text-muted-foreground mt-2">
                AI graded {grade.overall_score} / 100 · Teacher set final score to{" "}
                {submission.finalScore}
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
              <h2 className="font-bold text-lg mb-2 text-orange-700">Top priorities to work on</h2>
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

          {grade.inline_annotations.length > 0 && (
            <Card className="p-5">
              <h2 className="font-bold text-lg mb-3">Inline corrections ({grade.inline_annotations.length})</h2>
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
                        {SEVERITY_LABELS[a.severity]}
                      </Badge>
                    </div>
                    <div className="italic">"{a.text_segment}"</div>
                    <div className="mt-1">
                      <span className="font-semibold">Suggested:</span>{" "}
                      <span className="not-italic">{a.suggestion}</span>
                    </div>
                    <div className="mt-1 text-xs opacity-80">{a.explanation}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {grade.spanish_speaker_patterns_noticed.length > 0 && (
            <Card className="p-5 bg-amber-50 border-amber-200">
              <h2 className="font-bold text-lg mb-2 text-amber-900">
                Spanish-speaker patterns
              </h2>
              <p className="text-xs text-amber-800 mb-2">
                These are language-transfer patterns from Spanish (your L1) into English. Naming
                them makes them easier to unlearn.
              </p>
              <ul className="space-y-1.5">
                {grade.spanish_speaker_patterns_noticed.map((p, i) => (
                  <li key={i} className="text-sm text-amber-900">
                    {p}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {(grade.vocabulary_used_correctly.length > 0 ||
            grade.vocabulary_misused.length > 0) && (
            <Card className="p-5">
              <h2 className="font-bold text-lg mb-3">Vocabulary</h2>
              {grade.vocabulary_used_correctly.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">
                    Used correctly
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {grade.vocabulary_used_correctly.map((w, i) => (
                      <Badge key={i} variant="secondary" className="bg-emerald-50 text-emerald-900 border-emerald-200">
                        {w}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {grade.vocabulary_misused.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1">
                    Needs attention
                  </div>
                  <ul className="space-y-1">
                    {grade.vocabulary_misused.map((v, i) => (
                      <li key={i} className="text-sm">
                        <span className="font-semibold">{v.word}</span>
                        <span className="text-slate-600"> — {v.issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}

          {submission.teacherFeedback && (
            <Card className="p-5 bg-blue-50 border-blue-200">
              <h2 className="font-bold text-lg mb-2 text-blue-900">Teacher feedback</h2>
              <p className="text-sm text-blue-900 whitespace-pre-wrap">{submission.teacherFeedback}</p>
            </Card>
          )}
        </>
      )}

      {/* Original writing — collapsed by default once graded to keep focus on feedback */}
      <Card className="p-5">
        <h2 className="font-bold text-lg mb-2">Your writing</h2>
        <div className="font-serif text-base leading-relaxed whitespace-pre-wrap text-slate-800">
          {submission.content}
        </div>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: Submission["status"] }) {
  switch (status) {
    case "pending_ai":
      return <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300">Grading…</Badge>;
    case "ai_graded":
      return <Badge variant="outline" className="bg-blue-50 text-blue-900 border-blue-300">AI graded — teacher reviewing</Badge>;
    case "teacher_reviewed":
      return <Badge variant="outline" className="bg-emerald-50 text-emerald-900 border-emerald-300">Teacher reviewed</Badge>;
    case "returned":
      return <Badge variant="outline" className="bg-emerald-100 text-emerald-900 border-emerald-400">Returned</Badge>;
  }
}
