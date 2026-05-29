/**
 * Listening Project — student-facing listening + comprehension quiz.
 *
 * Route: /dashboard/listening/:moduleId   (Fase 2 — Listening Hub)
 *
 * Loads /api/listening-projects/by-module/:moduleId (transcript + answers
 * stripped). The student picks an accent, plays the clip (limited replays,
 * transcript hidden), then answers a mix of closed + open questions. On
 * submit, POSTs to /api/listening-submissions (closed auto-graded, open
 * graded by Claude) and navigates to the result view where the transcript
 * is finally revealed.
 */

import { useMemo, useRef, useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, ArrowRight, Headphones, CheckCircle2, Lock, AlertTriangle, Loader2, Play, Pause } from "lucide-react";

interface Question {
  id: string;
  type: "multiple_choice" | "true_false" | "fill_in" | "open";
  questionText: string;
  options?: string[];
}

interface ListeningProject {
  id: string;
  moduleId: string;
  level: string;
  title: string;
  accents: string[];
  questions: Question[];
  durationSeconds: number | null;
  maxPlays: number;
  passingScore: number;
}

const ACCENT_LABELS: Record<string, string> = {
  american: "🇺🇸 American",
  british: "🇬🇧 British",
  australian: "🇦🇺 Australian",
};

function fmt(t: number) {
  if (!isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ListeningAssignmentPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const { data: proj, isLoading, error } = useQuery<ListeningProject>({
    queryKey: [`/api/listening-projects/by-module/${moduleId}`],
    enabled: !!moduleId,
  });

  // --- audio player state ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [accent, setAccent] = useState<string>("american");
  const [playsUsed, setPlaysUsed] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Pick the first available accent once the project loads.
  useEffect(() => {
    if (proj?.accents?.length) setAccent(proj.accents[0]);
  }, [proj?.id]);

  const maxPlays = proj?.maxPlays ?? 3;
  const playsLeft = Math.max(0, maxPlays - playsUsed);

  const audioSrc = proj ? `/api/listening/audio?projectId=${proj.id}&accent=${accent}` : "";

  const handlePlayPause = () => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) {
      a.pause();
      return;
    }
    // Starting from the beginning (or after it ended) counts as one play.
    const atStart = a.ended || a.currentTime < 0.5;
    if (atStart) {
      if (playsLeft <= 0) {
        toast({ title: "No replays left", description: "You've used all your listens for this attempt.", variant: "destructive" });
        return;
      }
      setPlaysUsed((n) => n + 1);
    }
    a.play().catch(() => {});
  };

  // When the accent changes, reset to the start (a fresh listen).
  const switchAccent = (a: string) => {
    setAccent(a);
    const el = audioRef.current;
    if (el) { el.pause(); el.currentTime = 0; }
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const total = proj?.questions?.length ?? 0;
  const answeredCount = useMemo(() => Object.values(answers).filter((v) => v !== undefined && v !== "").length, [answers]);
  const allAnswered = total > 0 && answeredCount === total;

  const submit = useMutation({
    mutationFn: async () => {
      if (!proj) throw new Error("No listening");
      const r = await apiRequest("POST", "/api/listening-submissions", {
        listeningProjectId: proj.id,
        moduleId: proj.moduleId,
        answers,
      });
      return r.json();
    },
    onSuccess: (data) => {
      toast({ title: data.passed ? "You passed! 🎉" : "Keep practising — try again." });
      if (data.submissionId) navigate(`/dashboard/listening-submissions/${data.submissionId}`);
    },
    onError: (e: any) => toast({ title: "Couldn't submit", description: e?.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (error || !proj) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="p-8 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
          <h2 className="text-lg font-bold">No listening available for this module yet</h2>
          <p className="text-sm text-muted-foreground">Coral is still building this Listening activity.</p>
          <Button onClick={() => navigate("/dashboard/courses")}><ArrowLeft className="w-4 h-4 mr-2" /> Back to courses</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4" data-testid="page-listening-assignment">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="text-xl font-bold">{proj.title}</h1>
        <Badge variant="outline" className="text-xs">{proj.level}</Badge>
        <Badge className="text-xs bg-primary">Pass at {proj.passingScore}</Badge>
      </div>

      {/* Accent selector */}
      <Card className="p-4 bg-primary/5">
        <div className="text-[11px] font-bold text-muted-foreground mb-2 tracking-wide">CHOOSE AN ACCENT</div>
        <div className="flex flex-wrap gap-2">
          {proj.accents.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => switchAccent(a)}
              className={`pill rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${accent === a ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground hover:bg-muted/50"}`}
            >
              {ACCENT_LABELS[a] || a}
            </button>
          ))}
        </div>
      </Card>

      {/* Audio player — transcript hidden until submit */}
      <Card className="p-4 space-y-3">
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="none"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
          onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePlayPause}
            className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center text-xl shadow flex-shrink-0 disabled:opacity-40"
            disabled={!isPlaying && playsLeft <= 0 && currentTime < 0.5}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <div className="flex-1">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
              <span>{fmt(currentTime)}</span>
              <span>{fmt(duration || proj.durationSeconds || 0)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Lock className="w-3 h-3" />
          <span>The transcript stays hidden until you finish.</span>
          <span className="ml-auto font-medium">Listens: {playsUsed} / {maxPlays}</span>
        </div>
      </Card>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(answeredCount / Math.max(total, 1)) * 100}%` }} />
        </div>
        <span className="text-xs font-mono text-muted-foreground tabular-nums">{answeredCount}/{total}</span>
      </div>

      {/* Questions */}
      {proj.questions.map((q, idx) => (
        <Card key={q.id} className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-xs font-bold text-primary tabular-nums w-6 flex-shrink-0">{idx + 1}.</span>
            <p className="text-sm font-semibold leading-snug flex-1">
              {q.questionText}
              {q.type === "open" && <span className="ml-2 text-[10px] text-muted-foreground font-normal">(open question — graded by Claude)</span>}
            </p>
            {answers[q.id] && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
          </div>

          {q.type === "multiple_choice" && q.options && (
            <div className="space-y-2 ml-9">
              {q.options.map((opt, oi) => (
                <button type="button" key={oi}
                  onClick={() => setAnswers({ ...answers, [q.id]: String(oi) })}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${answers[q.id] === String(oi) ? "border-primary bg-primary/5 font-medium" : "border-border hover:bg-muted/50"}`}>
                  <span className="font-mono text-xs mr-2 text-muted-foreground">{String.fromCharCode(65 + oi)})</span>
                  {opt}
                </button>
              ))}
            </div>
          )}
          {q.type === "fill_in" && (
            <div className="ml-9">
              <input type="text" value={answers[q.id] || ""}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                placeholder="Type your answer"
                className="w-full p-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          )}
          {q.type === "open" && (
            <div className="ml-9">
              <textarea value={answers[q.id] || ""}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                placeholder="Write your answer in English…"
                rows={3}
                className="w-full p-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          )}
          {q.type === "true_false" && (
            <div className="flex gap-2 ml-9">
              {["true", "false"].map((v) => (
                <button key={v} type="button" onClick={() => setAnswers({ ...answers, [q.id]: v })}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${answers[q.id] === v ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                  {v}
                </button>
              ))}
            </div>
          )}
        </Card>
      ))}

      <Card className="p-4 sticky bottom-4 flex items-center justify-between gap-3 shadow-lg bg-card/95 backdrop-blur">
        <span className="text-sm">{allAnswered ? <span className="font-semibold text-emerald-700">All answered ✓</span> : <span className="text-muted-foreground">{total - answeredCount} more to answer</span>}</span>
        <Button disabled={!allAnswered || submit.isPending} onClick={() => submit.mutate()}>
          {submit.isPending ? "Grading…" : <>Submit answers <ArrowRight className="w-4 h-4 ml-1" /></>}
        </Button>
      </Card>
    </div>
  );
}
