/**
 * Vocabulary SRS — Spaced Repetition flashcards.
 *
 * Route: /dashboard/vocabulary
 *
 * UX:
 *   - Top: stats row (mastered / familiar / learning / new + due-now + today)
 *   - Center: flashcard. Front = term (+ POS, level chip). Click "Show answer"
 *     → reveals translation + example. Then 4 rating buttons.
 *   - Bottom toolbar: "Sync from my projects" pulls new cards from writing/
 *     speaking/lab projects at the student's current level and below.
 *   - When queue empties: friendly empty state with sync CTA.
 *
 * SRS sources (per Coral's spec):
 *   - Writing project target vocabulary + target expressions
 *   - Speaking project target vocabulary + target expressions
 *   - Conversation Lab brief expressions
 *   - (Future) lesson hover-clicked words + grader feedback corrections
 */

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Sparkles, BookOpen, RefreshCw, Trophy, Loader2, Quote, ArrowRight,
  CheckCircle2, Layers, Brain, Flame, Volume2,
} from "lucide-react";

interface VocabCard {
  id: string;
  term: string;
  translation?: string;
  exampleEn?: string;
  exampleEs?: string;
  partOfSpeech?: string;
  isExpression: boolean;
  masteryLevel: "new" | "learning" | "familiar" | "mastered";
  reviewCount: number;
  level?: string;
  sourceType: string;
}

interface VocabStats {
  total: number;
  new: number;
  learning: number;
  familiar: number;
  mastered: number;
  dueNow: number;
  reviewedToday: number;
}

const MASTERY_COLORS: Record<string, string> = {
  new: "bg-slate-400",
  learning: "bg-amber-500",
  familiar: "bg-blue-500",
  mastered: "bg-emerald-500",
};

const SOURCE_LABELS: Record<string, string> = {
  writing_project: "Writing project",
  speaking_project: "Speaking project",
  lab: "Conversation Lab",
  lesson: "Lesson",
  grader_correction: "Grader feedback",
  manual: "Added by you",
};

export default function VocabularyPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [revealed, setRevealed] = useState(false);

  const { data: queue, isLoading: queueLoading, refetch: refetchQueue } = useQuery<VocabCard[]>({
    queryKey: ["/api/vocab/queue"],
  });

  const { data: stats } = useQuery<VocabStats>({
    queryKey: ["/api/vocab/stats"],
  });

  const currentCard = queue && queue.length > 0 ? queue[0] : null;

  // Reset reveal state when card changes
  useEffect(() => {
    setRevealed(false);
  }, [currentCard?.id]);

  // Auto-sync on first visit if student has no cards yet
  const [autoSynced, setAutoSynced] = useState(false);
  useEffect(() => {
    if (!autoSynced && stats && stats.total === 0) {
      setAutoSynced(true);
      sync.mutate();
    }
  }, [stats, autoSynced]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-enrich any cards missing translation (one-shot per mount).
  // Idempotent server-side — only touches cards lacking translation.
  const [autoEnriched, setAutoEnriched] = useState(false);
  useEffect(() => {
    if (!autoEnriched && currentCard && !currentCard.translation) {
      setAutoEnriched(true);
      enrich.mutate();
    }
  }, [currentCard, autoEnriched]); // eslint-disable-line react-hooks/exhaustive-deps

  const review = useMutation({
    mutationFn: async (rating: "again" | "hard" | "good" | "easy") => {
      if (!currentCard) throw new Error("No card");
      const r = await apiRequest("POST", "/api/vocab/review", { cardId: currentCard.id, rating });
      return r.json();
    },
    onSuccess: (_data, rating) => {
      if (rating === "easy" || rating === "good") {
        // small celebratory toast for mastery jumps (optional)
      }
      // Refresh queue + stats
      queryClient.invalidateQueries({ queryKey: ["/api/vocab/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vocab/stats"] });
    },
    onError: (e: any) => toast({ title: "Couldn't save review", description: e?.message, variant: "destructive" }),
  });

  const enrich = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/vocab/enrich", {});
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vocab/queue"] });
    },
  });

  const sync = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/vocab/sync", {});
      return r.json();
    },
    onSuccess: async (data) => {
      toast({
        title: data.added > 0 ? `Added ${data.added} new card${data.added === 1 ? "" : "s"} ✓` : "You're all caught up",
        description: data.added > 0
          ? `Pulled from your level and below. Adding translations now…`
          : `No new vocab found in your current level. Try completing more projects.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vocab/queue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vocab/stats"] });
      // Auto-enrich new cards with translation + example
      if (data.added > 0) {
        enrich.mutate();
      }
    },
    onError: (e: any) => toast({ title: "Sync failed", description: e?.message, variant: "destructive" }),
  });

  // Play audio in Coral's cloned voice (with browser-voice fallback)
  const playAudio = async (term: string) => {
    // First try server-side (ElevenLabs → GCS cache, in Coral's voice)
    try {
      const r = await fetch(`/api/vocab/audio?term=${encodeURIComponent(term)}`, { credentials: "include" });
      if (r.ok) {
        const blob = await r.blob();
        const audio = new Audio(URL.createObjectURL(blob));
        await audio.play();
        return;
      }
      // 503 = TTS not configured on backend → fallback to browser voice
      // 502 = ElevenLabs upstream error → fallback to browser voice
      console.warn(`Server TTS unavailable (${r.status}), using browser voice`);
    } catch (err) {
      console.warn("Server TTS fetch failed, using browser voice:", err);
    }
    // Fallback: browser SpeechSynthesis (works offline, free, decent quality)
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(term);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } else {
      toast({ title: "Audio not available", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4" data-testid="page-vocabulary">
      <div className="flex items-center gap-2 flex-wrap">
        <Brain className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold">My Vocabulary</h1>
        <Badge variant="outline" className="text-xs">Spaced repetition</Badge>
        <Button
          size="sm"
          variant="outline"
          onClick={() => sync.mutate()}
          disabled={sync.isPending}
          className="ml-auto"
          data-testid="button-sync-vocab"
        >
          {sync.isPending ? (
            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Syncing…</>
          ) : (
            <><RefreshCw className="w-3 h-3 mr-1" /> Sync from my projects</>
          )}
        </Button>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <StatTile
            label="Due now"
            value={stats.dueNow}
            icon={<Flame className="w-4 h-4 text-amber-500" />}
          />
          <StatTile
            label="Today"
            value={stats.reviewedToday}
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          />
          <StatTile
            label="Mastered"
            value={stats.mastered}
            icon={<Trophy className="w-4 h-4 text-amber-500" />}
          />
          <StatTile
            label="Total"
            value={stats.total}
            icon={<Layers className="w-4 h-4 text-blue-500" />}
          />
        </div>
      )}

      {/* Mastery progress bar (visual breakdown) */}
      {stats && stats.total > 0 && (
        <div className="space-y-1">
          <div className="flex h-2 rounded-full overflow-hidden bg-muted">
            {stats.mastered > 0 && <div className="bg-emerald-500" style={{ width: `${(stats.mastered / stats.total) * 100}%` }} />}
            {stats.familiar > 0 && <div className="bg-blue-500" style={{ width: `${(stats.familiar / stats.total) * 100}%` }} />}
            {stats.learning > 0 && <div className="bg-amber-500" style={{ width: `${(stats.learning / stats.total) * 100}%` }} />}
            {stats.new > 0 && <div className="bg-slate-400" style={{ width: `${(stats.new / stats.total) * 100}%` }} />}
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] font-mono text-muted-foreground">
            <Legend dot="bg-emerald-500" label={`Mastered ${stats.mastered}`} />
            <Legend dot="bg-blue-500" label={`Familiar ${stats.familiar}`} />
            <Legend dot="bg-amber-500" label={`Learning ${stats.learning}`} />
            <Legend dot="bg-slate-400" label={`New ${stats.new}`} />
          </div>
        </div>
      )}

      {/* Flashcard area */}
      {queueLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : currentCard ? (
        <Card className="p-8 space-y-6 text-center min-h-[360px] flex flex-col justify-between bg-gradient-to-br from-card to-muted/30">
          {/* Top tags */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Badge
              className={`text-white text-[10px] uppercase ${MASTERY_COLORS[currentCard.masteryLevel] || "bg-slate-400"}`}
            >
              {currentCard.masteryLevel}
            </Badge>
            {currentCard.isExpression && (
              <Badge variant="outline" className="text-[10px]">
                <Quote className="w-3 h-3 mr-1" /> Expression
              </Badge>
            )}
            {currentCard.level && (
              <Badge variant="outline" className="text-[10px]">{currentCard.level}</Badge>
            )}
            <Badge variant="secondary" className="text-[10px]">
              {SOURCE_LABELS[currentCard.sourceType] || currentCard.sourceType}
            </Badge>
          </div>

          {/* Term */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {revealed ? "Term" : currentCard.isExpression ? "Expression" : "Word"}
            </p>
            <div className="flex items-center justify-center gap-3">
              <h2
                className={`font-bold leading-tight ${currentCard.isExpression ? "text-2xl md:text-3xl italic" : "text-4xl md:text-5xl"}`}
                data-testid="text-vocab-term"
              >
                {currentCard.term}
              </h2>
              <button
                onClick={() => playAudio(currentCard.term)}
                className="p-2.5 rounded-full hover:bg-primary/10 text-primary transition-colors"
                title="Pronunciar"
                data-testid="button-vocab-audio"
              >
                <Volume2 className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
            {currentCard.partOfSpeech && (
              <p className="text-xs font-mono text-muted-foreground italic">{currentCard.partOfSpeech}</p>
            )}
          </div>

          {/* Reveal */}
          {!revealed ? (
            <Button
              onClick={() => setRevealed(true)}
              size="lg"
              className="mx-auto"
              data-testid="button-reveal-vocab"
            >
              <Sparkles className="w-4 h-4 mr-2" /> Show meaning
            </Button>
          ) : (
            <div className="space-y-4">
              {currentCard.translation && (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Meaning</p>
                  <p className="text-lg font-medium text-foreground">{currentCard.translation}</p>
                </div>
              )}
              {currentCard.exampleEn && (
                <div className="p-3 rounded-lg bg-muted/50 text-sm italic max-w-md mx-auto relative">
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex-1">"{currentCard.exampleEn}"</p>
                    <button
                      onClick={() => playAudio(currentCard.exampleEn!)}
                      className="p-1 rounded hover:bg-primary/10 text-primary transition-colors flex-shrink-0"
                      title="Escuchar oración"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  {currentCard.exampleEs && (
                    <p className="text-xs text-muted-foreground mt-1 not-italic">{currentCard.exampleEs}</p>
                  )}
                </div>
              )}
              {!currentCard.translation && !currentCard.exampleEn && (
                <div className="text-sm text-muted-foreground italic space-y-2">
                  {enrich.isPending ? (
                    <p className="flex items-center justify-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" /> Adding translation…
                    </p>
                  ) : (
                    <p>Translation loading — rate how well you know this word.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Rating buttons */}
          {revealed && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
              <RatingButton
                label="Again"
                hint="<1 min"
                color="bg-red-500 hover:bg-red-600 text-white"
                onClick={() => review.mutate("again")}
                disabled={review.isPending}
              />
              <RatingButton
                label="Hard"
                hint="~1d"
                color="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => review.mutate("hard")}
                disabled={review.isPending}
              />
              <RatingButton
                label="Good"
                hint="~3d"
                color="bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => review.mutate("good")}
                disabled={review.isPending}
              />
              <RatingButton
                label="Easy"
                hint="~7d"
                color="bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={() => review.mutate("easy")}
                disabled={review.isPending}
              />
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-12 text-center space-y-4">
          <Trophy className="w-12 h-12 mx-auto text-amber-500" />
          <h2 className="text-xl font-bold">No cards due right now ✨</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You're all caught up. Sync new vocab from your writing, speaking and Conversation Lab projects to keep learning.
          </p>
          <Button onClick={() => sync.mutate()} disabled={sync.isPending}>
            {sync.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sync new vocabulary
          </Button>
        </Card>
      )}

      {/* Footer info */}
      <Card className="p-4 text-xs text-muted-foreground space-y-1.5">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <BookOpen className="w-3.5 h-3.5 text-primary" /> How spaced repetition works
        </div>
        <p>
          The harder a card feels, the sooner it comes back. The easier it feels, the longer it waits before reappearing.
          Words you mark <strong>Easy</strong> 6 times in a row become <strong>mastered</strong> and stop showing up in your daily queue.
        </p>
      </Card>
    </div>
  );
}

function StatTile({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="p-3 flex items-center gap-2.5">
      {icon}
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
        <p className="text-xl font-bold tabular-nums leading-tight">{value}</p>
      </div>
    </Card>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span>{label}</span>
    </div>
  );
}

function RatingButton({
  label, hint, color, onClick, disabled,
}: {
  label: string; hint: string; color: string; onClick: () => void; disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 ${color}`}
      data-testid={`button-rating-${label.toLowerCase()}`}
    >
      <span className="block">{label}</span>
      <span className="block text-[10px] opacity-80 font-mono">{hint}</span>
    </button>
  );
}
