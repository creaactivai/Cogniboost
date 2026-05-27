/**
 * MyPlanPage — Phase 1.3 ESL Roadmap
 *
 * A dedicated /dashboard/my-plan page showing the student's curated 21-day
 * Work Plan: 3-4 actionable tactics personalized by Claude based on their
 * real submission data (errors, WPM, scores, focus areas).
 *
 * Lifecycle:
 *   - Student opens page → backend generates plan if none exists or
 *     previous one expired / all tried
 *   - Student checks "tried" → tactic marks complete with timestamp
 *   - When ALL 4 tactics tried OR 21 days pass → next visit generates
 *     a fresh plan
 *
 * Design choices (per Coral):
 *   - All English (immersion)
 *   - Lucide line icons (no emojis)
 *   - "I tried" checkbox, NOT "done" (honesty + agency)
 *   - 21-day cycle with progress bar
 *   - No manual refresh button (structure > flexibility for adults)
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Target,
  Clock,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Tactic {
  id: string;
  action: string;
  highlights?: string[];
  meta?: string[];
  durationLabel?: string;
  why?: string;
  validationHint?: string;
  status: "pending" | "tried";
  triedAt?: string;
  validation?: {
    success?: boolean;
    summary: string;
    metricBefore?: number;
    metricAfter?: number;
  };
}

interface WorkPlan {
  id: string;
  userId: string;
  tactics: Tactic[];
  cycleStart: string;
  cycleEnd: string;
  submissionsAnalyzed: number;
  status: string;
  createdAt: string;
}

interface PlanResponse {
  plan: WorkPlan;
}

/** Render action text with `highlights` words wrapped in a primary-color
 *  <strong>. Falls back to plain text if no highlights provided. */
function HighlightedAction({ action, highlights }: { action: string; highlights?: string[] }) {
  if (!highlights || highlights.length === 0) return <>{action}</>;
  // Build a regex that matches any of the highlights (escape special chars)
  const escaped = highlights.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "g");
  const parts = action.split(re);
  return (
    <>
      {parts.map((part, i) =>
        highlights.includes(part) ? (
          <strong key={i} className="text-primary">
            "{part}"
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function MyPlanPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [busyTacticId, setBusyTacticId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<PlanResponse>({
    queryKey: ["/api/student/my-plan"],
    // Plan generation is slow (Claude call). Don't retry — show error UI.
    retry: false,
  });

  const triedMutation = useMutation({
    mutationFn: async ({ planId, tacticId }: { planId: string; tacticId: string }) => {
      const res = await apiRequest(
        "POST",
        `/api/student/my-plan/${planId}/tactics/${tacticId}/tried`,
        {}
      );
      return res.json();
    },
    onMutate: ({ tacticId }) => {
      setBusyTacticId(tacticId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/student/my-plan"] });
      toast({
        title: "Marked as tried",
        description: "Keep going — you're building real habits.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't mark as tried",
        description: err?.message || "Try again in a moment",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setBusyTacticId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display uppercase mb-1">My Plan</h1>
          <p className="font-mono text-sm text-muted-foreground">
            Building your personalized 21-day plan…
          </p>
        </div>
        <Card className="p-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">
            Analyzing your last submissions and composing tactics. This takes 10-20 seconds.
          </p>
        </Card>
      </div>
    );
  }

  if (error || !data?.plan) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display uppercase mb-1">My Plan</h1>
        </div>
        <Card className="p-8 text-center space-y-3">
          <Sparkles className="w-10 h-10 mx-auto text-muted-foreground" />
          <h2 className="text-lg font-bold">Your plan isn't ready yet</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Complete a few writing and speaking projects so we have enough data to build a personalized plan for you.
          </p>
        </Card>
      </div>
    );
  }

  const plan = data.plan;
  const tactics = Array.isArray(plan.tactics) ? plan.tactics : [];
  const triedCount = tactics.filter((t) => t.status === "tried").length;
  const totalCount = tactics.length;
  const progressPct = totalCount > 0 ? Math.round((triedCount / totalCount) * 100) : 0;

  // Days remaining in cycle
  const cycleEnd = new Date(plan.cycleEnd);
  const now = Date.now();
  const cycleDays = 21;
  const dayInCycle = Math.min(
    cycleDays,
    Math.max(1, Math.ceil((now - new Date(plan.cycleStart).getTime()) / 86_400_000))
  );
  const daysRemaining = Math.max(0, Math.ceil((cycleEnd.getTime() - now) / 86_400_000));

  const allTried = triedCount === totalCount && totalCount > 0;

  return (
    <div className="space-y-6" data-testid="page-my-plan">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-display uppercase mb-1">My Plan</h1>
        <p className="font-mono text-sm text-muted-foreground">
          Personalized 21-day plan based on your last {plan.submissionsAnalyzed} submissions. Mark each tactic as you try it.
        </p>
      </div>

      {/* Plan card */}
      <Card className="p-6 border-border rounded-2xl">
        <div className="flex items-start gap-4 mb-2">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md"
            style={{
              background: "linear-gradient(135deg, #F5AE56 0%, #C97D1E 100%)",
              boxShadow: "0 4px 14px rgba(245,174,86,0.3)",
            }}
          >
            <Target className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-1">
              21-Day Plan
            </p>
            <p className="text-sm text-muted-foreground">
              Generated {formatRelative(plan.createdAt)} · Based on {plan.submissionsAnalyzed} graded tasks
            </p>
            <Badge
              variant="outline"
              className="mt-2.5 font-mono text-xs gap-1.5 py-1.5 px-3 bg-amber-50 border-amber-200 text-amber-700"
            >
              <Clock className="w-3 h-3" />
              Day {dayInCycle} of 21 · {daysRemaining} days remaining
            </Badge>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, #F5AE56 0%, #C97D1E 100%)",
              }}
            />
          </div>
          <p className="text-xs font-mono text-muted-foreground mt-1.5">
            {triedCount} of {totalCount} tried · Plan refreshes when all are tried OR 21 days pass
          </p>
        </div>

        {allTried && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm font-semibold">
              You completed all 4 tactics — a fresh plan is generated next time you visit.
            </p>
          </div>
        )}

        {/* Tactics list */}
        <div className="mt-6 space-y-3">
          {tactics.map((tactic, idx) => {
            const isTried = tactic.status === "tried";
            const isBusy = busyTacticId === tactic.id;
            return (
              <div
                key={tactic.id || idx}
                className={`flex gap-3 p-4 rounded-xl border ${
                  isTried
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-card border-border"
                }`}
                data-testid={`tactic-${tactic.id || idx}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (isTried || isBusy) return;
                    triedMutation.mutate({ planId: plan.id, tacticId: tactic.id });
                  }}
                  disabled={isTried || isBusy}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                    isTried
                      ? "bg-emerald-500 border-emerald-500"
                      : "border-2 border-muted-foreground/30 hover:border-primary"
                  }`}
                  aria-label={isTried ? "Already tried" : "Mark as tried"}
                  data-testid={`tactic-checkbox-${tactic.id}`}
                >
                  {isBusy ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : isTried ? (
                    <CheckCircle2 className="w-4 h-4 text-white" strokeWidth={3} />
                  ) : null}
                </button>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-semibold leading-snug mb-2 ${
                      isTried ? "line-through text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    <HighlightedAction action={tactic.action} highlights={tactic.highlights} />
                  </p>

                  {/* Meta chips */}
                  {(tactic.durationLabel || (tactic.meta && tactic.meta.length > 0)) && (
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      {tactic.durationLabel && (
                        <Badge variant="secondary" className="font-mono text-xs gap-1 py-0.5 px-2">
                          <Clock className="w-2.5 h-2.5" />
                          {tactic.durationLabel}
                        </Badge>
                      )}
                      {(tactic.meta || []).map((m, i) => (
                        <Badge key={i} variant="outline" className="font-mono text-xs py-0.5 px-2">
                          {m}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Why (only when not tried — when tried, the validation summary replaces it) */}
                  {!isTried && tactic.why && (
                    <p className="text-xs text-muted-foreground italic leading-relaxed p-2.5 bg-muted/30 rounded-lg">
                      {tactic.why}
                    </p>
                  )}

                  {/* Validation summary when tried */}
                  {isTried && tactic.validation?.summary && (
                    <div className="text-xs text-emerald-700 flex items-start gap-1.5 p-2.5 bg-emerald-100/50 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>{tactic.validation.summary}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Footer note */}
      <p className="text-center text-xs text-muted-foreground italic px-4">
        Tactics are generated by AI based on your real submission data. Honest reporting helps the next plan be more accurate.
      </p>
    </div>
  );
}
