/**
 * ActionPlan — "Plan de Trabajo" / "Your Work Plan"
 *
 * Surfaces the most recurring `improvement_priorities` across a student's
 * graded writing + speaking submissions. Phase 1: pure aggregation read-only.
 * Phase 2 (future) will add status toggling + weekly email digest.
 *
 * Reusable for both student self-view and admin/teacher view via the
 * optional `studentId` prop (mirrors ProgressTrajectory).
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Target,
  PenTool,
  Mic,
  Sparkles,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface FocusItem {
  focus: string;
  occurrences: number;
  lastSeenAt: string | null;
  firstSeenAt: string | null;
  sourceMix: "writing" | "speaking" | "both";
  submissionIds: string[];
}

interface ActionPlanResponse {
  plan: FocusItem[];
  meta: {
    submissionsAnalyzed: number;
    gradedSubmissionsWithPriorities: number;
    totalPriorityOccurrences: number;
    clusterCount: number;
  };
}

interface ActionPlanProps {
  /** Teacher view — when provided, fetches plan for that student. */
  studentId?: string;
}

function relativeDate(iso: string | null, es: boolean): string {
  if (!iso) return "";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return es ? "hoy" : "today";
  if (days === 1) return es ? "ayer" : "yesterday";
  if (days < 7) return es ? `hace ${days} días` : `${days}d ago`;
  if (days < 30) return es ? `hace ${Math.floor(days / 7)} sem` : `${Math.floor(days / 7)}w ago`;
  return es ? `hace ${Math.floor(days / 30)} mes` : `${Math.floor(days / 30)}mo ago`;
}

export function ActionPlan({ studentId }: ActionPlanProps = {}) {
  const { locale } = useTranslation();
  const es = locale === "es";
  // Must be declared BEFORE the loading/error early returns below, or the
  // hook count changes between renders → React #310 ("rendered fewer hooks
  // than expected"). Keep all hooks above any conditional return.
  const [expanded, setExpanded] = useState(false);

  const url = studentId
    ? `/api/student/${studentId}/action-plan`
    : "/api/student/action-plan";

  const { data, isLoading, error } = useQuery<ActionPlanResponse>({
    queryKey: [url],
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-sm font-mono text-muted-foreground">
          {es ? "No pudimos construir el plan de trabajo." : "Couldn't build your work plan."}
        </p>
      </Card>
    );
  }

  const plan = data?.plan ?? [];
  const headerTitle = studentId
    ? (es ? "Plan de Trabajo del Estudiante" : "Student Work Plan")
    : (es ? "Tu Plan de Trabajo" : "Your Work Plan");

  return (
    <Card className="border-border rounded-2xl overflow-hidden" data-testid="card-action-plan">
      {/* Always-visible header (collapsible trigger) */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-5 hover:bg-muted/30 transition-colors"
        aria-expanded={expanded}
        data-testid="button-action-plan-toggle"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-display uppercase tracking-tight mb-1">
              {headerTitle}
            </h2>
            <p className="text-sm text-muted-foreground leading-snug">
              {es
                ? "Los consejos que más se han repetido en tus correcciones"
                : "The advice that has appeared most often in your feedback"}
            </p>
            <div className="flex items-center gap-2 mt-2.5">
              <Badge variant="outline" className="font-mono text-xs">
                {plan.length === 0
                  ? (es ? "Aún sin datos" : "No data yet")
                  : (es ? `${plan.length} áreas` : `${plan.length} focus areas`)}
              </Badge>
              {data?.meta && plan.length > 0 && (
                <Badge variant="secondary" className="font-mono text-xs">
                  {es
                    ? `${data.meta.submissionsAnalyzed} tareas revisadas`
                    : `${data.meta.submissionsAnalyzed} tasks reviewed`}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 mt-1">
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>

      {/* Expandable detail */}
      {expanded && (
        <div className="px-5 pb-5 pt-0 border-t border-border">
          {plan.length === 0 ? (
            <div className="py-8 text-center">
              <Sparkles className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-mono text-muted-foreground">
                {es
                  ? "Completa algunas tareas escritas o habladas y tu plan personalizado aparecerá aquí."
                  : "Complete a few writing or speaking tasks and your personalized plan will appear here."}
              </p>
            </div>
          ) : (
            <ol className="space-y-3 mt-4">
              {plan.map((item, idx) => {
                const isHighFrequency = item.occurrences >= 3;
                return (
                  <li
                    key={`${item.focus}-${idx}`}
                    className="flex gap-3 p-3 border border-border rounded-lg bg-background hover-elevate"
                    data-testid={`focus-item-${idx}`}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-display text-primary">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug mb-2">{item.focus}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={isHighFrequency ? "default" : "secondary"}
                          className="font-mono text-xs"
                          data-testid={`focus-occurrences-${idx}`}
                        >
                          {es
                            ? `Visto ${item.occurrences}×`
                            : `Seen ${item.occurrences}×`}
                        </Badge>
                        {item.sourceMix === "writing" && (
                          <Badge variant="outline" className="font-mono text-xs gap-1">
                            <PenTool className="w-3 h-3" />
                            {es ? "Escritura" : "Writing"}
                          </Badge>
                        )}
                        {item.sourceMix === "speaking" && (
                          <Badge variant="outline" className="font-mono text-xs gap-1">
                            <Mic className="w-3 h-3" />
                            {es ? "Habla" : "Speaking"}
                          </Badge>
                        )}
                        {item.sourceMix === "both" && (
                          <Badge variant="outline" className="font-mono text-xs gap-1">
                            <PenTool className="w-3 h-3" />
                            <Mic className="w-3 h-3" />
                            {es ? "Ambas" : "Both"}
                          </Badge>
                        )}
                        {item.lastSeenAt && (
                          <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {es ? "última: " : "last: "}
                            {relativeDate(item.lastSeenAt, es)}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </Card>
  );
}
