import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Loader2,
  Sparkles,
  PenTool,
  Mic,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface TimelineEntry {
  submissionId: string;
  date: string;
  skill: "writing" | "speaking";
  assignmentType: string;
  score: number | null;
  estimatedCefr: string | null;
  dimensions: Record<string, { score: number; feedback: string }> | null;
  wordsPerMinute: number | null;
  status: string;
  teacherReviewed: boolean;
  moduleId: string | null;
  lessonId: string | null;
}

interface TimelineSummary {
  totalSubmissions: number;
  firstSubmissionScore: number | null;
  latestSubmissionScore: number | null;
  scoreDelta: number | null;
  firstCefr: string | null;
  latestCefr: string | null;
  cefrMoved: boolean;
}

interface TimelineResponse {
  timeline: TimelineEntry[];
  summary: TimelineSummary;
}

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];

const formatShortDate = (iso: string, locale: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(locale === "es" ? "es-ES" : "en-US", {
    month: "short",
    day: "numeric",
  });
};

function MinSubmissionsCallout({ count, es }: { count: number; es: boolean }) {
  return (
    <Card className="p-6 border-dashed border-2 border-muted-foreground/30 bg-muted/30">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-lg uppercase mb-1">
            {es ? "Tu trayectoria aparecerá aquí" : "Your trajectory will appear here"}
          </h3>
          <p className="font-mono text-sm text-muted-foreground">
            {es
              ? `Necesitas al menos 3 entregas (writing o speaking) para que podamos mostrar tu progreso real. Llevas ${count}.`
              : `You need at least 3 submissions (writing or speaking) so we can show your real progress. You have ${count} so far.`}
          </p>
        </div>
      </div>
    </Card>
  );
}

interface ProgressTrajectoryProps {
  /** When provided (teacher view), fetches that student's timeline.
   *  When omitted (student self-view), fetches the caller's own. */
  studentId?: string;
}

export function ProgressTrajectory({ studentId }: ProgressTrajectoryProps = {}) {
  const { locale } = useTranslation();
  const es = locale === "es";

  const url = studentId
    ? `/api/student/${studentId}/progress-timeline`
    : "/api/student/progress-timeline";

  const { data, isLoading, error } = useQuery<TimelineResponse>({
    queryKey: [url],
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-destructive/30 bg-destructive/5">
        <p className="font-mono text-sm text-destructive">
          {es
            ? "No pudimos cargar tu trayectoria. Intenta recargar la página."
            : "Couldn't load your trajectory. Try refreshing the page."}
        </p>
      </Card>
    );
  }

  const timeline = data?.timeline || [];
  const summary = data?.summary;

  // Need at least 3 submissions to make a meaningful chart
  if (timeline.length < 3) {
    return <MinSubmissionsCallout count={timeline.length} es={es} />;
  }

  // Build chart data with separate y-values per skill
  const chartData = timeline.map((entry) => ({
    date: formatShortDate(entry.date, locale),
    fullDate: entry.date,
    writing: entry.skill === "writing" ? entry.score : null,
    speaking: entry.skill === "speaking" ? entry.score : null,
    cefr: entry.estimatedCefr,
    skill: entry.skill,
  }));

  // Compute trend (last 3 vs first 3 averages)
  const firstThree = timeline.slice(0, 3).filter(t => t.score != null);
  const lastThree = timeline.slice(-3).filter(t => t.score != null);
  const firstAvg = firstThree.length
    ? firstThree.reduce((sum, t) => sum + (t.score || 0), 0) / firstThree.length
    : null;
  const lastAvg = lastThree.length
    ? lastThree.reduce((sum, t) => sum + (t.score || 0), 0) / lastThree.length
    : null;
  const trendDelta = firstAvg != null && lastAvg != null ? lastAvg - firstAvg : null;
  const TrendIcon =
    trendDelta == null ? Minus : trendDelta > 2 ? TrendingUp : trendDelta < -2 ? TrendingDown : Minus;
  const trendColor =
    trendDelta == null
      ? "text-muted-foreground"
      : trendDelta > 2
      ? "text-green-600 dark:text-green-400"
      : trendDelta < -2
      ? "text-orange-600 dark:text-orange-400"
      : "text-muted-foreground";

  // Count submissions per skill
  const writingCount = timeline.filter(t => t.skill === "writing").length;
  const speakingCount = timeline.filter(t => t.skill === "speaking").length;

  return (
    <div className="space-y-4">
      {/* Headline summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* CEFR movement */}
        <Card className="p-4 border-border">
          <p className="text-xs font-mono uppercase text-muted-foreground mb-2">
            {es ? "Nivel" : "Level"}
          </p>
          {summary?.cefrMoved ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-base px-2 py-0.5">
                {summary.firstCefr}
              </Badge>
              <ArrowRight className="w-4 h-4 text-primary" />
              <Badge className="font-mono text-base px-2 py-0.5 bg-primary">
                {summary.latestCefr}
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-base px-2 py-0.5">
                {summary?.latestCefr || "—"}
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">
                {es ? "Estable" : "Steady"}
              </span>
            </div>
          )}
        </Card>

        {/* Score progression */}
        <Card className="p-4 border-border">
          <p className="text-xs font-mono uppercase text-muted-foreground mb-2">
            {es ? "Cambio de nota" : "Score change"}
          </p>
          <div className="flex items-center gap-2">
            <TrendIcon className={`w-5 h-5 ${trendColor}`} />
            <span className={`text-2xl font-display ${trendColor}`}>
              {trendDelta != null
                ? `${trendDelta > 0 ? "+" : ""}${Math.round(trendDelta * 10) / 10}`
                : "—"}
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              {es ? "puntos" : "points"}
            </span>
          </div>
          {summary?.firstSubmissionScore != null &&
            summary?.latestSubmissionScore != null && (
              <p className="text-xs font-mono text-muted-foreground mt-1">
                {Math.round(summary.firstSubmissionScore)} →{" "}
                {Math.round(summary.latestSubmissionScore)}
              </p>
            )}
        </Card>

        {/* Submissions count */}
        <Card className="p-4 border-border">
          <p className="text-xs font-mono uppercase text-muted-foreground mb-2">
            {es ? "Entregas" : "Submissions"}
          </p>
          <p className="text-2xl font-display">{summary?.totalSubmissions || 0}</p>
          <div className="flex gap-3 mt-1">
            <span className="text-xs font-mono text-muted-foreground inline-flex items-center gap-1">
              <PenTool className="w-3 h-3" />
              {writingCount}
            </span>
            <span className="text-xs font-mono text-muted-foreground inline-flex items-center gap-1">
              <Mic className="w-3 h-3" />
              {speakingCount}
            </span>
          </div>
        </Card>
      </div>

      {/* Trajectory chart */}
      <Card className="p-6 border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-lg uppercase">
              {es ? "Tu trayectoria" : "Your trajectory"}
            </h3>
            <p className="text-xs font-mono text-muted-foreground">
              {es
                ? "Nota 0-100 por entrega · línea de paso = 70"
                : "Score 0-100 per submission · pass line = 70"}
            </p>
          </div>
          {summary?.cefrMoved && (
            <Badge variant="outline" className="font-mono">
              <Sparkles className="w-3 h-3 mr-1" />
              {es ? "¡Subiste de nivel!" : "Leveled up!"}
            </Badge>
          )}
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                className="text-xs font-mono"
                tick={{ fill: "currentColor", fontSize: 11 }}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 70, 100]}
                className="text-xs font-mono"
                tick={{ fill: "currentColor", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  fontFamily: "monospace",
                  fontSize: "12px",
                }}
                labelClassName="font-mono"
                formatter={(value: any, name: string) => {
                  if (value == null) return ["—", name];
                  return [`${Math.round(value)}/100`, name === "writing" ? (es ? "Writing" : "Writing") : (es ? "Speaking" : "Speaking")];
                }}
              />
              <Legend
                wrapperStyle={{ fontFamily: "monospace", fontSize: "12px" }}
                formatter={(v) => (v === "writing" ? "Writing" : "Speaking")}
              />
              <ReferenceLine
                y={70}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <Line
                type="monotone"
                dataKey="writing"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 4, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 6 }}
                connectNulls
                name="writing"
              />
              <Line
                type="monotone"
                dataKey="speaking"
                stroke="hsl(var(--chart-2, 220 70% 50%))"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
                name="speaking"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* CEFR ladder visual — shows where the student currently sits */}
        {summary?.latestCefr && (
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-xs font-mono uppercase text-muted-foreground mb-3">
              {es ? "Tu nivel actual en la escala CEFR" : "Your current spot on the CEFR ladder"}
            </p>
            <div className="flex items-center gap-1">
              {CEFR_ORDER.map((level) => {
                const latestIdx = CEFR_ORDER.indexOf(summary.latestCefr || "");
                const firstIdx = CEFR_ORDER.indexOf(summary.firstCefr || "");
                const idx = CEFR_ORDER.indexOf(level);
                const isCurrent = idx === latestIdx;
                const isPassed = idx < latestIdx && idx >= firstIdx;
                const isStartingPoint = idx === firstIdx && firstIdx !== latestIdx;
                return (
                  <div
                    key={level}
                    className={`flex-1 h-10 flex items-center justify-center font-mono text-sm border-2 transition-all ${
                      isCurrent
                        ? "bg-primary text-primary-foreground border-primary font-bold"
                        : isPassed
                        ? "bg-primary/15 border-primary/30 text-primary"
                        : isStartingPoint
                        ? "bg-muted border-dashed border-primary/40 text-muted-foreground"
                        : "border-border text-muted-foreground"
                    }`}
                    title={
                      isCurrent
                        ? es ? "Tu nivel ahora" : "Where you are now"
                        : isStartingPoint
                        ? es ? "Donde empezaste" : "Where you started"
                        : ""
                    }
                  >
                    {level}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
