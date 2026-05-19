/**
 * Daily Challenge mini-widget — fits in the dashboard / labs page.
 * Shows streak, today's count, accuracy + a quick-play button.
 *
 * Different from the full /dashboard/daily-challenge page — this is
 * the entry point that lives inside the main flow so students don't
 * have to remember to visit a separate page.
 */

import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Flame, Zap, ArrowRight, Trophy } from "lucide-react";

interface ChallengeStats {
  currentStreak: number;
  longestStreak: number;
  totalCorrect: number;
  totalAttempts: number;
  totalXp: number;
  questionsToday: number;
  accuracyPct: number;
}

interface Props {
  /** "compact" inside Labs page; "full" on Dashboard Home */
  variant?: "compact" | "full";
}

export function DailyChallengeWidget({ variant = "full" }: Props) {
  const { data: stats } = useQuery<ChallengeStats>({
    queryKey: ["/api/daily-challenge/stats"],
  });

  const remaining = Math.max(0, 10 - (stats?.questionsToday ?? 0));
  const done = remaining === 0;

  if (variant === "compact") {
    return (
      <Card className="p-3 flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">Warm up: Daily Challenge</p>
          <p className="text-[11px] text-muted-foreground">
            {done
              ? "✓ Done for today — come back tomorrow"
              : `${remaining} quick questions to wake your English up`}
          </p>
        </div>
        <Link href="/dashboard/daily-challenge">
          <Button size="sm" variant={done ? "outline" : "default"}>
            {done ? "Stats" : "Play"} <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-rose-500/10 border-b">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">Daily Challenge</h2>
              <p className="text-[11px] text-muted-foreground">
                {done
                  ? "All done for today ✓"
                  : `${remaining} of 10 questions to go`}
              </p>
            </div>
          </div>
          {stats && stats.currentStreak > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-300">
              <Flame className="w-3.5 h-3.5 text-orange-600" />
              <span className="text-xs font-bold tabular-nums text-orange-700">
                {stats.currentStreak} day streak
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="p-4 grid grid-cols-3 gap-2 text-center">
        <div className="p-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Today</p>
          <p className="text-2xl font-bold tabular-nums">{stats?.questionsToday ?? 0}/10</p>
        </div>
        <div className="p-2 border-l border-r">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Accuracy</p>
          <p className="text-2xl font-bold tabular-nums">{stats?.accuracyPct ?? 0}%</p>
        </div>
        <div className="p-2 flex flex-col items-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">XP</p>
          <p className="text-2xl font-bold tabular-nums flex items-center gap-0.5">
            <Zap className="w-4 h-4 text-amber-500" />
            {stats?.totalXp ?? 0}
          </p>
        </div>
      </div>
      <div className="p-3 pt-0">
        <Link href="/dashboard/daily-challenge">
          <Button className="w-full" data-testid="button-play-daily-challenge">
            {done ? <><Trophy className="w-4 h-4 mr-1.5" /> View today's results</> : <>Play now <ArrowRight className="w-4 h-4 ml-1.5" /></>}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
