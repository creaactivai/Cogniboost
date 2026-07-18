/**
 * LIVE NOW widget — visible on dashboard top whenever a Conversation
 * Lab the student qualifies for is happening RIGHT NOW.
 *
 * Polls /api/labs/live-now every 30 seconds. Shows pulsing red badge,
 * session title, interest icon, and a big JOIN button that opens
 * the meeting URL in a new tab.
 *
 * Auto-hides itself when no sessions are live.
 */

import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Radio, Users } from "lucide-react";

interface LiveSession {
  id: string;
  title: string;
  level: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingUrl: string | null;
  interestName?: string;
  interestIcon?: string;
  startsInMs: number;
  relation?: "mine" | "up" | "down" | "far";  // level vs the student
  canJoin?: boolean;                            // within ±1 of student level
}

// Short Spanish label for an other-level live class.
const REL_LABEL: Record<string, string> = { up: "reto ↑", down: "repaso ↓", far: "no es tu nivel" };

export function LiveNowWidget() {
  const [, setLocation] = useLocation();
  const { data: sessions = [] } = useQuery<LiveSession[]>({
    queryKey: ["/api/labs/live-now"],
    refetchInterval: 30_000, // poll every 30s
  });

  if (sessions.length === 0) return null;

  // Own-level (and ±1 joinable) classes first, other levels after; then by
  // time. So the student's own live class is always the top card.
  const rank = (s: LiveSession) => (s.relation === "mine" ? 0 : s.canJoin ? 1 : 2);
  const ordered = [...sessions].sort((a, b) => rank(a) - rank(b) || a.startsInMs - b.startsInMs);

  return (
    <div className="mb-6 space-y-2">
      {ordered.map((s) => {
        const startsInMin = Math.round(s.startsInMs / 60_000);
        const status: "starting_soon" | "live" | "ending_soon" =
          startsInMin > 0 ? "starting_soon"
          : Math.abs(startsInMin) > s.durationMinutes - 10 ? "ending_soon"
          : "live";
        const other = s.canJoin === false;  // level too far to join

        return (
          <Card
            key={s.id}
            className={other
              ? "overflow-hidden border border-border bg-muted/30"
              : "overflow-hidden border-2 border-red-500/40 bg-gradient-to-r from-red-500/5 via-red-500/10 to-rose-500/5"}
            data-testid={`live-now-${s.id}`}
          >
            <div className="flex items-stretch">
              {/* Pulse strip */}
              <div className={other ? "w-1.5 bg-muted-foreground/40" : "w-1.5 bg-red-500 animate-pulse"} />

              {/* Mobile: stack title above JOIN button (full-width).
                  Desktop (sm+): title and button side-by-side as before. */}
              <div className="flex-1 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <div className="relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 mt-0.5 sm:mt-0">
                    {!other && <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40" />}
                    <div className={other ? "relative w-3 h-3 rounded-full bg-muted-foreground/60" : "relative w-3 h-3 rounded-full bg-red-500"} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[10px] font-black tracking-widest uppercase ${other ? "text-muted-foreground" : "text-red-600"}`}>
                        {status === "starting_soon" ? `Starts in ${startsInMin} min` : "LIVE NOW"}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{s.level}</Badge>
                      {s.relation && s.relation !== "mine" && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                          {REL_LABEL[s.relation]}
                        </Badge>
                      )}
                      {s.interestName && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {s.interestIcon || "🎯"} {s.interestName}
                        </Badge>
                      )}
                    </div>
                    {/* No truncate — let title wrap onto 2 lines on small screens. */}
                    <p className="text-sm font-semibold leading-tight mt-1 break-words">{s.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <Users className="w-3 h-3 flex-shrink-0" />
                      <span>{s.durationMinutes} min · {new Date(s.scheduledAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                    </p>
                  </div>
                </div>

                {other ? (
                  // Other-level live class — visible so the student knows it's
                  // happening, but not joinable (outside their ±1 range).
                  <span
                    className="text-[11px] font-semibold text-muted-foreground w-full sm:w-auto sm:flex-shrink-0 text-center sm:text-right"
                    data-testid={`live-now-otherlevel-${s.id}`}
                  >
                    En vivo · otro nivel
                  </span>
                ) : (
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto sm:flex-shrink-0"
                    onClick={() => {
                      // Stay on the platform — embed Jitsi via /dashboard/labs/:id/room
                      // (uses LiveVideoPanel iframe with the right hash params already
                      // applied for mobile-friendly join). No more new-tab popup.
                      if (s.meetingUrl) setLocation(`/dashboard/labs/${s.id}/room`);
                    }}
                    disabled={!s.meetingUrl}
                    data-testid={`button-join-${s.id}`}
                  >
                    <Radio className="w-4 h-4 mr-1.5" />
                    {status === "starting_soon" ? "Get Ready" : "JOIN NOW"}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
