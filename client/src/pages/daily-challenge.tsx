/**
 * Daily Challenge — Expression Showdown.
 *
 * Per-level multi-choice quiz:
 *   A1 → ¿Cómo se dice…? (Spanish prompt, English options)
 *   A2 → Pick the natural English (everyday situations)
 *   B1 → Same meaning, different words (synonyms + intro idioms)
 *   B2 → Express it like a native (phrasal verbs + slang)
 *   C1 → Register & nuance (formal/casual/cultural)
 *
 * Wrong answers feed the student's SRS deck. Streak + XP gamification.
 * Audio of correct answer plays in Coral's cloned voice.
 *
 * Route: /dashboard/daily-challenge
 */

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Flame, Trophy, Sparkles, Volume2, CheckCircle2, XCircle,
  Loader2, Zap, ArrowRight, SkipForward,
} from "lucide-react";

interface ChallengeOption { letter: string; text: string; correct: boolean; }
interface ChallengeQuestion {
  id: string;
  level: string;
  questionType: string;
  prompt: string;
  context?: string | null;
  category?: string;
  difficulty?: number;
  options: ChallengeOption[];
}

interface ChallengeStats {
  currentStreak: number;
  longestStreak: number;
  totalCorrect: number;
  totalAttempts: number;
  totalXp: number;
  questionsToday: number;
  accuracyPct: number;
}

const CATEGORY_LABEL: Record<string, string> = {
  basic: "Vocabulary",
  collocation: "Collocation",
  idiom: "Idiom",
  phrasal_verb: "Phrasal verb",
  slang: "Slang",
  register: "Register",
};

export default function DailyChallengePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<{ correct: boolean; correctAnswer: string; explanation: string; xpEarned: number } | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const { data: stats } = useQuery<ChallengeStats>({
    queryKey: ["/api/daily-challenge/stats"],
  });

  const { data: payload, isLoading } = useQuery<{ level: string; questions: ChallengeQuestion[] }>({
    queryKey: ["/api/daily-challenge/today"],
  });

  const questions = payload?.questions || [];
  const level = payload?.level || "A1";
  const currentQ = questions[currentIdx];
  const totalQuestions = questions.length;

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, [currentQ?.id]);

  const submit = useMutation({
    mutationFn: async (letter: string) => {
      if (!currentQ) throw new Error("No question");
      const r = await apiRequest("POST", "/api/daily-challenge/answer", {
        questionId: currentQ.id,
        selectedAnswer: currentQ.options.find((o) => o.letter === letter)?.text,
        responseTimeMs: Date.now() - startTimeRef.current,
      });
      return r.json();
    },
    onSuccess: (data) => {
      setRevealed(data);
      queryClient.invalidateQueries({ queryKey: ["/api/daily-challenge/stats"] });
      // Audio of correct answer in Coral's voice.
      // Use <Audio src> directly so the browser can follow the 302 → GCS
      // redirect natively (fetch+blob breaks on the cross-origin redirect
      // because the GCS bucket isn't configured for cogniboost.co CORS).
      if (currentQ?.options) {
        const correct = currentQ.options.find((o) => o.correct);
        if (correct) {
          const audio = new Audio(`/api/vocab/audio?term=${encodeURIComponent(correct.text)}`);
          audio.play().catch(() => { /* silent if autoplay blocked */ });
        }
      }
    },
    onError: (e: any) => toast({ title: "Couldn't submit", description: e?.message, variant: "destructive" }),
  });

  const handleSelect = (letter: string) => {
    if (revealed || submit.isPending) return;
    setSelectedLetter(letter);
    submit.mutate(letter);
  };

  const handleNext = () => {
    setSelectedLetter(null);
    setRevealed(null);
    if (currentIdx + 1 < totalQuestions) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // Done — show summary
      queryClient.invalidateQueries({ queryKey: ["/api/daily-challenge/today"] });
      toast({
        title: "You finished today's challenge! 🎉",
        description: `Come back tomorrow for new questions.`,
      });
      setCurrentIdx(0);
    }
  };

  // Skip = jump to next question without grading. Doesn't count as wrong,
  // doesn't break streak. Useful when a question feels too hard or
  // off-topic.
  const handleSkip = () => {
    if (revealed) return; // can't skip after answering
    setSelectedLetter(null);
    setRevealed(null);
    if (currentIdx + 1 < totalQuestions) {
      setCurrentIdx(currentIdx + 1);
    } else {
      // No more — show summary
      queryClient.invalidateQueries({ queryKey: ["/api/daily-challenge/today"] });
      toast({ title: "You went through all of today's questions" });
      setCurrentIdx(0);
    }
    toast({ title: "Skipped — no points lost", description: "It won't count against your streak." });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentQ) {
    // Two different empty states:
    // 1. Student hit today's 10-question cap → friendly "see you tomorrow"
    // 2. No content at the level → "we're setting up X level"
    const hitDailyLimit = (payload as any)?.dailyLimitReached;
    if (hitDailyLimit) {
      return (
        <div className="max-w-2xl mx-auto p-6">
          <Card className="p-8 text-center space-y-3 border-emerald-200 bg-emerald-50/50">
            <Trophy className="w-12 h-12 mx-auto text-emerald-600" />
            <h2 className="text-xl font-bold text-emerald-900">¡Daily Challenge completado!</h2>
            <p className="text-sm text-emerald-800">
              Ya completaste tus {(payload as any)?.dailyCap || 10} preguntas de hoy. Vuelve mañana para mantener tu racha. 🔥
            </p>
            <p className="text-xs font-mono text-emerald-700/70 mt-2">
              See you tomorrow!
            </p>
          </Card>
        </div>
      );
    }
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="p-8 text-center space-y-3">
          <Trophy className="w-12 h-12 mx-auto text-amber-500" />
          <h2 className="text-xl font-bold">No questions available right now</h2>
          <p className="text-sm text-muted-foreground">
            We're still setting up Daily Challenge for level {level}. Come back soon!
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4" data-testid="page-daily-challenge">
      {/* Header with streak + XP */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">Daily Challenge</h1>
          <Badge variant="outline" className="text-xs">{level}</Badge>
        </div>
        {stats && (
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1" data-testid="stat-streak">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="font-bold tabular-nums">{stats.currentStreak}</span>
              <span className="text-xs text-muted-foreground">streak</span>
            </span>
            <span className="flex items-center gap-1" data-testid="stat-xp">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="font-bold tabular-nums">{stats.totalXp}</span>
              <span className="text-xs text-muted-foreground">XP</span>
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((currentIdx + (revealed ? 1 : 0)) / totalQuestions) * 100}%` }}
          />
        </div>
        <span className="text-xs font-mono text-muted-foreground tabular-nums">
          {currentIdx + 1}/{totalQuestions}
        </span>
      </div>

      {/* Question card */}
      <Card className="p-6 space-y-4 bg-gradient-to-br from-card to-muted/20">
        {currentQ.category && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-[10px]">
              {CATEGORY_LABEL[currentQ.category] || currentQ.category}
            </Badge>
            {currentQ.difficulty && (
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-xs ${i < currentQ.difficulty! ? "text-amber-500" : "text-muted-foreground/30"}`}
                  >★</span>
                ))}
              </div>
            )}
          </div>
        )}

        {currentQ.context && (
          <p className="text-sm italic text-muted-foreground">{currentQ.context}</p>
        )}

        <p className="text-lg md:text-xl font-semibold leading-snug">
          {currentQ.prompt}
        </p>

        {/* Options */}
        <div className="space-y-2 pt-2">
          {currentQ.options.map((opt) => {
            const isSelected = selectedLetter === opt.letter;
            const isCorrectReveal = revealed && opt.correct;
            const isWrongPicked = revealed && isSelected && !opt.correct;

            let cls = "border-border hover:bg-muted/40";
            if (revealed && opt.correct) cls = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40";
            if (revealed && isWrongPicked) cls = "border-red-500 bg-red-50 dark:bg-red-950/40";
            if (isSelected && !revealed) cls = "border-primary bg-primary/5";

            return (
              <button
                key={opt.letter}
                onClick={() => handleSelect(opt.letter)}
                disabled={!!revealed || submit.isPending}
                className={`w-full p-3 rounded-lg border-2 text-left transition-all flex items-center gap-3 ${cls} ${revealed ? "" : "hover:scale-[1.01]"}`}
                data-testid={`option-${opt.letter}`}
              >
                <span className={`w-8 h-8 rounded-md flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                  revealed && opt.correct
                    ? "bg-emerald-500 text-white"
                    : isWrongPicked
                      ? "bg-red-500 text-white"
                      : "bg-muted text-foreground"
                }`}>
                  {opt.letter}
                </span>
                <span className="flex-1">{opt.text}</span>
                {revealed && opt.correct && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
                {isWrongPicked && <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Reveal panel */}
        {revealed && (
          <div className={`p-3 rounded-lg border-2 ${revealed.correct ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30" : "border-amber-300 bg-amber-50/50 dark:bg-amber-950/30"}`}>
            <div className="flex items-center gap-2 mb-2">
              {revealed.correct ? (
                <><CheckCircle2 className="w-5 h-5 text-emerald-600" /><span className="font-bold text-emerald-700">Correct! +{revealed.xpEarned} XP</span></>
              ) : (
                <><XCircle className="w-5 h-5 text-amber-600" /><span className="font-bold text-amber-700">Not quite — added to your vocabulary deck</span></>
              )}
            </div>
            <p className="text-sm">{revealed.explanation}</p>
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 h-8"
              onClick={() => {
                // <Audio src> follows the 302 → GCS redirect without CORS issues
                const audio = new Audio(`/api/vocab/audio?term=${encodeURIComponent(revealed.correctAnswer)}`);
                audio.play().catch(() => {});
              }}
            >
              <Volume2 className="w-4 h-4 mr-1.5" /> Hear it
            </Button>
          </div>
        )}

        {revealed && (
          <Button onClick={handleNext} className="w-full" size="lg" data-testid="button-next-question">
            {currentIdx + 1 < totalQuestions ? (
              <>Next question <ArrowRight className="w-4 h-4 ml-2" /></>
            ) : (
              <>Finish today's challenge 🎉</>
            )}
          </Button>
        )}

        {/* Skip button — only available BEFORE answering */}
        {!revealed && (
          <div className="text-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-skip-question"
            >
              <SkipForward className="w-3.5 h-3.5 mr-1" />
              Skip — too hard or off-topic
            </Button>
            <p className="text-[10px] text-muted-foreground mt-1 italic">
              Doesn't count against your streak.
            </p>
          </div>
        )}
      </Card>

      {/* Footer stats */}
      {stats && (
        <Card className="p-3 grid grid-cols-3 text-center text-xs">
          <div>
            <p className="text-muted-foreground">Today</p>
            <p className="font-bold text-lg tabular-nums">{stats.questionsToday}/10</p>
          </div>
          <div>
            <p className="text-muted-foreground">Accuracy</p>
            <p className="font-bold text-lg tabular-nums">{stats.accuracyPct}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Longest streak</p>
            <p className="font-bold text-lg tabular-nums">{stats.longestStreak}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
