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
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Radio, Users, ExternalLink } from "lucide-react";

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
}

export function LiveNowWidget() {
  const { data: sessions = [] } = useQuery<LiveSession[]>({
    queryKey: ["/api/labs/live-now"],
    refetchInterval: 30_000, // poll every 30s
  });

  if (sessions.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {sessions.map((s) => {
        const startsInMin = Math.round(s.startsInMs / 60_000);
        const status: "starting_soon" | "live" | "ending_soon" =
          startsInMin > 0 ? "starting_soon"
          : Math.abs(startsInMin) > s.durationMinutes - 10 ? "ending_soon"
          : "live";

        return (
          <Card
            key={s.id}
            className="overflow-hidden border-2 border-red-500/40 bg-gradient-to-r from-red-500/5 via-red-500/10 to-rose-500/5"
            data-testid={`live-now-${s.id}`}
          >
            <div className="flex items-stretch">
              {/* Pulse strip */}
              <div className="w-1.5 bg-red-500 animate-pulse" />

              <div className="flex-1 p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative flex items-center justify-center w-10 h-10 flex-shrink-0">
                    <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-40" />
                    <div className="relative w-3 h-3 rounded-full bg-red-500" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black tracking-widest text-red-600 uppercase">
                        {status === "starting_soon" ? `Starting in ${startsInMin} min` : "LIVE NOW"}
                      </span>
                      <Badge variant="outline" className="text-[10px]">{s.level}</Badge>
                      {s.interestName && (
                        <Badge variant="secondary" className="text-[10px]">
                          {s.interestIcon || "🎯"} {s.interestName}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-semibold leading-tight mt-0.5 truncate">{s.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <Users className="w-3 h-3" />
                      {s.durationMinutes} min · {new Date(s.scheduledAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0"
                  onClick={() => {
                    if (s.meetingUrl) window.open(s.meetingUrl, "_blank", "noopener,noreferrer");
                  }}
                  disabled={!s.meetingUrl}
                  data-testid={`button-join-${s.id}`}
                >
                  <Radio className="w-4 h-4 mr-1.5" />
                  {status === "starting_soon" ? "Get Ready" : "JOIN NOW"}
                  <ExternalLink className="w-3 h-3 ml-1.5 opacity-70" />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
