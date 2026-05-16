/**
 * "My Writings" — student portfolio of all writing submissions.
 *
 * Replaces the legacy "Writing → free writing" sidebar entry.
 * The real Writing Projects (with prompts + rubric) live inside each
 * module of the course. This page is the read-only history view so
 * students can see their progress over time and revisit AI feedback.
 *
 * Pulls from /api/submissions/me and filters to writing types:
 *   - assignment_type = 'writing'         → legacy free writing
 *   - assignment_type = 'writing_project' → module-bound Writing Project
 *
 * Each card links to the appropriate viewer page.
 */

import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PenLine, FileText, Clock, CheckCircle2 } from "lucide-react";

interface Submission {
  id: string;
  assignmentType: string;
  moduleId: string | null;
  writingProjectId: string | null;
  content: string | null;
  status: "pending_ai" | "ai_graded" | "teacher_reviewed" | "returned";
  aiScore: string | null;
  teacherScore: string | null;
  submittedAt: string;
}

function scoreNumeric(s: Submission): number | null {
  const raw = s.teacherScore ?? s.aiScore;
  if (raw == null) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

function statusBadge(s: Submission) {
  if (s.status === "pending_ai") {
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Grading…</Badge>;
  }
  if (s.status === "teacher_reviewed") {
    return <Badge className="bg-emerald-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Teacher reviewed</Badge>;
  }
  if (s.status === "returned") {
    return <Badge variant="destructive">Returned for revision</Badge>;
  }
  return <Badge variant="outline"><CheckCircle2 className="w-3 h-3 mr-1" /> Graded</Badge>;
}

function scorePill(score: number | null) {
  if (score == null) return null;
  const pass = score >= 70;
  return (
    <span
      className={
        "px-3 py-1 rounded-full text-sm font-bold " +
        (pass ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")
      }
    >
      {score}/100
    </span>
  );
}

function preview(text: string | null): string {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 140 ? clean.slice(0, 140) + "…" : clean;
}

function viewerHref(s: Submission): string {
  // Writing Projects (per-module, with rubric) → dedicated viewer
  if (s.assignmentType === "writing_project") {
    return `/dashboard/writing-project-submissions/${s.id}`;
  }
  // Legacy free writing → original viewer
  return `/dashboard/submissions/${s.id}`;
}

export default function MyWritingsPage() {
  const [, navigate] = useLocation();
  const { data: all = [], isLoading } = useQuery<Submission[]>({
    queryKey: ["/api/submissions/me"],
  });

  const writings = (all || []).filter(
    (s) => s.assignmentType === "writing" || s.assignmentType === "writing_project"
  );

  return (
    <div className="space-y-6" data-testid="page-my-writings">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-display uppercase mb-1 flex items-center gap-2">
            <PenLine className="w-7 h-7" /> My Writings
          </h1>
          <p className="font-mono text-sm text-muted-foreground">
            Your writing portfolio — every Writing Project you've submitted, with AI feedback and scores.
          </p>
        </div>
        <Button
          onClick={() => navigate("/dashboard/courses")}
          data-testid="button-go-to-courses"
        >
          Go to my courses →
        </Button>
      </div>

      {isLoading && (
        <Card className="p-8 text-center text-muted-foreground">Loading your writings…</Card>
      )}

      {!isLoading && writings.length === 0 && (
        <Card className="p-8 text-center space-y-3">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
          <h2 className="text-lg font-bold">You haven't submitted any writing yet</h2>
          <p className="text-sm text-muted-foreground">
            Writing Projects live inside each module of your course. Each one has its own prompt, vocabulary and rubric.
          </p>
          <Button onClick={() => navigate("/dashboard/courses")}>Start my first module</Button>
        </Card>
      )}

      <div className="space-y-3">
        {writings.map((s) => {
          const score = scoreNumeric(s);
          const isProject = s.assignmentType === "writing_project";
          const submittedAt = new Date(s.submittedAt);
          return (
            <Card
              key={s.id}
              className="p-4 hover-elevate cursor-pointer"
              onClick={() => navigate(viewerHref(s))}
              data-testid={`card-writing-${s.id.slice(0, 8)}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                  <PenLine className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-mono font-semibold text-sm">
                      {isProject ? "Writing Project" : "Free writing"}
                    </h3>
                    {statusBadge(s)}
                    {isProject && (
                      <Badge variant="outline" className="text-[10px]">Module</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {submittedAt.toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {s.content && (
                    <p className="text-sm text-foreground/80 line-clamp-2">
                      {preview(s.content)}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {scorePill(score)}
                  <span className="text-xs font-mono text-primary">View feedback →</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
