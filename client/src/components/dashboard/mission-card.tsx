/**
 * MissionCard — Phase 1.0 ESL Roadmap
 *
 * Surfaces ONE curated 30-min "Today's Mission" per student per day on
 * /dashboard. The mission is composed of 3-5 varied activities pulled from
 * across the platform (Daily Challenge, speaking project, vocab review,
 * listening, lab prep) by the curator endpoint.
 *
 * Pedagogical purpose:
 *  - REMOVE decision fatigue (one clear primary action vs 20 menu items)
 *  - TIME-BOXED (~30 min) — adults commit to short blocks, not "everything"
 *  - VARIED FORMATS — anti-boredom, anti-cognitive-fatigue
 *  - PERSONALIZED (action plan + upcoming lab + recent activity drive it)
 *  - RESPECTS LIVE CLASS — when a class is happening, mission yields priority
 *
 * Design notes (per Coral, May 26):
 *  - 100% English (the platform is English-first)
 *  - NO emojis — clean Lucide line icons only
 *  - Live class always wins (hidden when LiveNowWidget has content)
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  Clock,
  ArrowRight,
  Loader2,
  Zap,
  Headphones,
  Mic,
  BookOpen,
  Book,
  MessageSquare,
  Video,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MissionActivity {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  durationMinutes: number;
  route: string;
  iconKey: string;
  completed: boolean;
}

interface DailyMission {
  id: string;
  userId: string;
  missionDate: string;
  activities: MissionActivity[];
  totalMinutes: number;
  title: string;
  rationale: string | null;
  status: "not_started" | "in_progress" | "completed";
  startedAt: string | null;
  completedAt: string | null;
}

interface MissionResponse {
  mission: DailyMission;
}

const ICON_MAP: Record<string, any> = {
  zap: Zap,
  headphones: Headphones,
  mic: Mic,
  book: Book,
  "book-open": BookOpen,
  video: Video,
  message: MessageSquare,
};

function ActivityIcon({ iconKey, completed }: { iconKey: string; completed: boolean }) {
  const Icon = ICON_MAP[iconKey] || BookOpen;
  return (
    <div
      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
        completed
          ? "bg-emerald-100 text-emerald-600"
          : "bg-primary/8 text-primary"
      }`}
    >
      {completed ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
    </div>
  );
}

export function MissionCard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery<MissionResponse>({
    queryKey: ["/api/student/today-mission"],
    // Refetch when student returns to the tab — picks up activity
    // completions detected server-side (e.g., they did Daily Challenge
    // in another tab, came back here, mission now shows "1 of 4 done")
    refetchOnWindowFocus: true,
    refetchInterval: 60_000, // also poll every 60s as fallback
  });

  const markDoneMutation = useMutation({
    mutationFn: async ({ missionId, activityId }: { missionId: string; activityId: string }) => {
      const res = await apiRequest(
        "POST",
        `/api/student/mission/${missionId}/activities/${activityId}/done`,
        {},
      );
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/student/today-mission"] });
    },
  });

  // Respect live classes — if a class is happening RIGHT NOW, hide the
  // Mission card so the LiveNowWidget above has full attention. Mission
  // card returns after class ends (next dashboard load).
  const { data: liveSessions = [] } = useQuery<any[]>({
    queryKey: ["/api/labs/live-now"],
    refetchInterval: 30_000,
  });
  if (liveSessions.length > 0) return null;

  const startMutation = useMutation({
    mutationFn: async (missionId: string) => {
      const res = await apiRequest("POST", `/api/student/mission/${missionId}/start`, {});
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/student/today-mission"] });
    },
  });

  if (isLoading) {
    return (
      <Card className="p-6 border-border rounded-2xl">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (error || !data?.mission) {
    return null; // Silently hide if the curator failed — don't break the dashboard
  }

  const mission = data.mission;
  const completedCount = mission.activities.filter(a => a.completed).length;
  const totalCount = mission.activities.length;
  const isCompleted = mission.status === "completed";
  const inProgress = mission.status === "in_progress";

  function handleStart() {
    startMutation.mutate(mission.id);
    // Navigate to the first uncompleted activity
    const firstUndone = mission.activities.find(a => !a.completed) || mission.activities[0];
    if (firstUndone?.route) {
      setLocation(firstUndone.route);
    }
  }

  function handleActivityClick(activity: MissionActivity) {
    if (!inProgress) {
      startMutation.mutate(mission.id);
    }
    if (activity.route) {
      setLocation(activity.route);
    }
  }

  return (
    <Card
      className="relative overflow-hidden border-border rounded-2xl"
      data-testid="card-mission"
      style={{
        background: "linear-gradient(135deg, #FFFFFF 0%, #FAFBFE 100%)",
      }}
    >
      {/* Decorative halos — brand accents */}
      <div
        className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-50"
        style={{ background: "radial-gradient(circle, rgba(245,174,86,0.10) 0%, transparent 70%)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-10 w-32 h-32 rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, rgba(102,126,235,0.10) 0%, transparent 70%)" }}
      />

      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
            style={{
              background: "linear-gradient(135deg, #667EEB 0%, #5568D3 100%)",
              boxShadow: "0 4px 12px rgba(102,126,235,0.25)",
            }}
          >
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-accent-foreground" style={{ color: "#C97D1E" }}>
              Today's Mission
            </p>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight leading-tight mb-2 mt-2">
          {mission.title}
        </h2>

        {/* Rationale */}
        {mission.rationale && (
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {mission.rationale}
          </p>
        )}

        {/* Duration + Progress chip */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <Badge variant="outline" className="font-mono text-xs gap-1.5 py-1.5 px-3 bg-primary/8 border-primary/20 text-primary">
            <Clock className="w-3 h-3" />
            {mission.totalMinutes} min · {totalCount} activities
          </Badge>
          {(inProgress || isCompleted) && (
            <Badge variant="outline" className="font-mono text-xs gap-1.5 py-1.5 px-3 bg-emerald-50 border-emerald-200 text-emerald-700">
              <CheckCircle2 className="w-3 h-3" />
              {completedCount} of {totalCount} done
            </Badge>
          )}
        </div>

        {/* Activities list */}
        <div className="space-y-2.5 mb-5">
          {mission.activities.map((activity, idx) => (
            <div
              key={activity.id}
              className="flex items-center gap-3 p-3 sm:p-3.5 bg-white border border-border rounded-xl hover:border-primary/40 hover:shadow-sm transition-all"
              data-testid={`mission-activity-${idx}`}
            >
              <button
                type="button"
                onClick={() => handleActivityClick(activity)}
                className="flex items-center gap-3 flex-1 text-left min-w-0"
              >
                <ActivityIcon iconKey={activity.iconKey} completed={activity.completed} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                    Step {idx + 1}
                  </p>
                  <p className={`text-sm font-semibold leading-snug ${activity.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {activity.title}
                  </p>
                  {activity.subtitle && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {activity.subtitle}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-primary flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {activity.durationMinutes}m
                </div>
              </button>
              {/* "I did this" manual mark — only if not completed.
                  Auto-detection covers Daily Challenge + submissions,
                  but this button is a fallback for activities where
                  auto-detect isn't possible (vocab, reading random link, etc.) */}
              {!activity.completed && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    markDoneMutation.mutate({ missionId: mission.id, activityId: activity.id });
                  }}
                  disabled={markDoneMutation.isPending}
                  className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors font-semibold flex-shrink-0"
                  data-testid={`button-mark-done-${idx}`}
                  title="Mark this activity as done"
                >
                  Done?
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Primary CTA */}
        {isCompleted ? (
          <div className="flex items-center justify-center gap-2 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">Mission complete — see you tomorrow!</span>
          </div>
        ) : (
          <>
            <Button
              size="lg"
              className="w-full font-bold uppercase tracking-wider text-sm py-6 shadow-lg"
              style={{
                background: "linear-gradient(135deg, #667EEB 0%, #5568D3 100%)",
                boxShadow: "0 4px 14px rgba(102,126,235,0.3)",
              }}
              onClick={handleStart}
              data-testid="button-start-mission"
            >
              {inProgress ? "Continue Mission" : "Start Mission"}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <div className="text-center mt-3">
              <a
                href="/dashboard/courses"
                className="text-xs font-semibold text-muted-foreground hover:text-primary"
                data-testid="link-see-more-activities"
              >
                See more activities ›
              </a>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
