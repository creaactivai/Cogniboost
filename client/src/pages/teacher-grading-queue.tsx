/**
 * Teacher grading queue — list of submissions awaiting teacher review.
 *
 * Master Plan v2.0 §7.1 (Today page) + §4.4 (Teacher Override Workflow).
 * Currently scoped to writing submissions; reading/listening graders ship
 * in Phase 2.
 *
 * Access: requires user.isAdmin (until a separate "teacher" role lands).
 *
 * Row click → /dashboard/teacher/submissions/:id (teacher edition of the
 * submission view, with the review panel).
 */

import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  isGraded,
  isGradingError,
  type Submission,
} from "@/types/submission";

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString();
}

function QueueRow({ submission }: { submission: Submission }) {
  const grade = isGraded(submission.aiGrade) ? submission.aiGrade : null;
  const failed = isGradingError(submission.aiGrade);
  const isPending = submission.status === "pending_ai" && !failed;
  const isSpeaking = submission.assignmentType === "speaking_recording";

  // Both writing and speaking grades share { overall_score, dimensions,
  // inline_notes/annotations } but the field names differ slightly. Read
  // defensively so the queue works for both surfaces.
  const aiAny = (submission.aiGrade || {}) as any;
  const aiScore = grade?.overall_score ?? (typeof aiAny.overall_score === "number" ? aiAny.overall_score : null);
  const aiLevel = (grade as any)?.estimated_cefr_for_this_writing ?? aiAny.estimated_cefr_for_this_speaking ?? aiAny.level_assessment ?? null;
  const annotationsCount =
    grade?.inline_annotations?.length ??
    (Array.isArray(aiAny.inline_notes) ? aiAny.inline_notes.length : 0);

  // For speaking submissions the queue row preview comes from the transcript
  // (stored on the submission once Whisper finishes). Fall back to a placeholder
  // before the transcript has been written.
  const preview = (submission.content || (isSpeaking ? "(audio recording — transcript pending)" : "")).slice(0, 140);

  // Speaking submissions route to the student view for now (read-only teacher
  // path). Writing/writing-project routes to the existing review surface.
  const href = isSpeaking
    ? `/dashboard/speaking-submissions/${submission.id}`
    : `/dashboard/teacher/submissions/${submission.id}`;

  return (
    <Link href={href}>
      <Card
        className="p-4 mb-2 hover:bg-accent cursor-pointer transition-colors"
        data-testid={`row-submission-${submission.id}`}
      >
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="capitalize">
              {submission.assignmentType.replace("_", " ")}
            </Badge>
            {failed && <Badge variant="destructive">Grading failed</Badge>}
            {isPending && (
              <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300">
                Grading…
              </Badge>
            )}
            {submission.status === "ai_graded" && (
              <Badge variant="outline" className="bg-blue-50 text-blue-900 border-blue-300">
                Awaiting review
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            {relativeTime(submission.submittedAt)}
          </div>
        </div>

        <p className="text-sm text-slate-700 line-clamp-2">{preview}</p>

        {aiScore != null && (
          <div className="flex items-center gap-3 mt-2 text-xs">
            <div>
              <span className="text-muted-foreground">AI:</span>{" "}
              <span className="font-semibold tabular-nums">{aiScore}/100</span>
            </div>
            {aiLevel && (
              <div>
                <span className="text-muted-foreground">Level:</span>{" "}
                <span className="font-semibold">{aiLevel}</span>
              </div>
            )}
            {annotationsCount > 0 && (
              <div>
                <span className="text-muted-foreground">{annotationsCount} annotations</span>
              </div>
            )}
          </div>
        )}
      </Card>
    </Link>
  );
}

export default function TeacherGradingQueuePage() {
  const { data: submissions = [], isLoading } = useQuery<Submission[]>({
    queryKey: ["/api/submissions/queue"],
    refetchInterval: 30_000, // refresh every 30s so new submissions appear
  });

  return (
    <div className="max-w-4xl mx-auto p-6" data-testid="page-teacher-queue">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Grading queue</h1>
        <p className="text-sm text-muted-foreground">
          Submissions waiting for teacher review. Click any row to open the AI grade and adjust.
        </p>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Loading queue…</p>}

      {!isLoading && submissions.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No submissions awaiting review. New writing submissions will appear here.
          </p>
        </Card>
      )}

      {!isLoading && submissions.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-3">{submissions.length} pending</p>
          {submissions.map((s) => (
            <QueueRow key={s.id} submission={s} />
          ))}
        </div>
      )}
    </div>
  );
}
