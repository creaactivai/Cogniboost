/**
 * Scenario Sprint — student-facing text role-play with an in-character AI.
 *
 * Route: /dashboard/scenario-sprint/:moduleId   (Fase 2 — Scenario Sprints)
 *
 * Three phases (mirrors the approved mockup):
 *   1. INTRO     — scenario brief: your role, who you'll talk to, your goal.
 *   2. CHAT      — type replies; the AI character answers in-character at the
 *                  student's CEFR level. Each AI line has a 🔊 Play button
 *                  (native-accent TTS). Mic is Phase 2 (disabled).
 *   3. FEEDBACK  — a coach reviews the whole conversation and returns a score
 *                  + what went well + things to polish + useful vocab.
 *
 * Endpoints: GET /api/scenario-projects/by-module/:moduleId, POST
 * /api/scenario/chat, POST /api/scenario/feedback, GET /api/scenario/audio.
 */

import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft, ArrowRight, AlertTriangle, Loader2, Send, Volume2,
  Mic, CheckCircle2, Target, MessageSquare, Sparkles, RotateCcw,
} from "lucide-react";

interface ScenarioProject {
  id: string;
  moduleId: string;
  level: string;
  title: string;
  subtitle: string | null;
  studentRole: string;
  characterName: string;
  characterRole: string;
  accent: string;
  goal: string;
  openingLine: string;
  minTurns: number;
}

interface Turn { role: "ai" | "student"; text: string; }

interface Feedback {
  submissionId: string | null;
  score: number;
  didWell: string[];
  toPolish: Array<{ quote?: string; tip: string }>;
  vocab: Array<{ term: string; meaning: string }>;
}

const ACCENT_LABELS: Record<string, string> = {
  american: "🇺🇸 American accent",
  british: "🇬🇧 British accent",
  australian: "🇦🇺 Australian accent",
};

export default function ScenarioAssignmentPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [phase, setPhase] = useState<"intro" | "chat" | "feedback">("intro");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const msgsRef = useRef<HTMLDivElement | null>(null);

  const { data: proj, isLoading, error } = useQuery<ScenarioProject>({
    queryKey: [`/api/scenario-projects/by-module/${moduleId}`],
    enabled: !!moduleId,
  });

  // Seed the conversation with the character's opening line.
  useEffect(() => {
    if (proj?.openingLine) setTurns([{ role: "ai", text: proj.openingLine }]);
  }, [proj?.id]);

  // Auto-scroll the message list as it grows.
  useEffect(() => {
    const el = msgsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns.length, phase]);

  const studentTurns = turns.filter((t) => t.role === "student").length;
  const minTurns = proj?.minTurns ?? 4;

  const playLine = (text: string) => {
    if (!proj) return;
    const url = `/api/scenario/audio?text=${encodeURIComponent(text)}&accent=${encodeURIComponent(proj.accent)}&level=${encodeURIComponent(proj.level)}`;
    const audio = new Audio(url);
    audio.play().catch(() => toast({ title: "Couldn't play audio", variant: "destructive" }));
  };

  const send = useMutation({
    mutationFn: async (studentText: string) => {
      if (!proj) throw new Error("No scenario");
      const history = [...turns, { role: "student" as const, text: studentText }];
      const r = await apiRequest("POST", "/api/scenario/chat", {
        scenarioProjectId: proj.id,
        history,
      });
      return (await r.json()) as { reply: string };
    },
    onSuccess: (data) => {
      setTurns((prev) => [...prev, { role: "ai", text: data.reply }]);
    },
    onError: (e: any) => {
      // Roll back the optimistic student turn so they can retry.
      setTurns((prev) => prev.slice(0, -1));
      toast({ title: "The character didn't reply", description: e?.message, variant: "destructive" });
    },
  });

  const handleSend = () => {
    const text = draft.trim();
    if (!text || send.isPending) return;
    setTurns((prev) => [...prev, { role: "student", text }]);
    setDraft("");
    send.mutate(text);
  };

  const finish = useMutation({
    mutationFn: async () => {
      if (!proj) throw new Error("No scenario");
      const r = await apiRequest("POST", "/api/scenario/feedback", {
        scenarioProjectId: proj.id,
        transcript: turns,
      });
      return (await r.json()) as Feedback;
    },
    onSuccess: (data) => {
      setFeedback(data);
      setPhase("feedback");
    },
    onError: (e: any) => toast({ title: "Couldn't get feedback", description: e?.message, variant: "destructive" }),
  });

  const restart = () => {
    setTurns(proj?.openingLine ? [{ role: "ai", text: proj.openingLine }] : []);
    setDraft("");
    setFeedback(null);
    setPhase("intro");
  };

  if (isLoading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (error || !proj) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="p-8 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
          <h2 className="text-lg font-bold">No role-play available for this module yet</h2>
          <p className="text-sm text-muted-foreground">Coral is still building this Scenario Sprint.</p>
          <Button onClick={() => navigate("/dashboard/courses")}><ArrowLeft className="w-4 h-4 mr-2" /> Back to courses</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4" data-testid="page-scenario-assignment">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <h1 className="text-xl font-bold">{proj.title}</h1>
        <Badge variant="outline" className="text-xs">{proj.level}</Badge>
        <Badge className="text-xs bg-primary">Role-play</Badge>
      </div>

      {/* ---------- INTRO ---------- */}
      {phase === "intro" && (
        <Card className="p-6 space-y-4">
          {proj.subtitle && <p className="text-sm text-muted-foreground">{proj.subtitle}</p>}

          <div className="rounded-xl bg-primary/5 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Your role</div>
            <p className="text-sm mt-1">{proj.studentRole}</p>
          </div>

          <div className="rounded-xl bg-primary/5 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Who you'll talk to</div>
            <p className="text-sm mt-1">
              <span className="font-semibold">{proj.characterName}</span>, the {proj.characterRole}.{" "}
              <span className="text-muted-foreground">{ACCENT_LABELS[proj.accent] || proj.accent}</span>
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <Target className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-amber-700">Your goal</div>
              <p className="text-sm mt-0.5">{proj.goal}</p>
            </div>
          </div>

          <Button className="w-full" size="lg" onClick={() => setPhase("chat")}>
            Start the role-play <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Card>
      )}

      {/* ---------- CHAT ---------- */}
      {phase === "chat" && (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-3 border-b px-5 py-3">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
              {proj.characterName.charAt(0)}
            </div>
            <div>
              <div className="font-bold text-sm">{proj.characterName} · {proj.characterRole}</div>
              <div className="text-[11px] text-emerald-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> in character</div>
            </div>
            <div className="ml-auto text-[11px] text-muted-foreground bg-muted rounded-md px-2 py-1">{ACCENT_LABELS[proj.accent] || proj.accent}</div>
          </div>

          <div ref={msgsRef} className="p-5 flex flex-col gap-3 max-h-[440px] overflow-y-auto">
            {turns.map((t, i) => (
              <div key={i} className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${t.role === "ai" ? "self-start bg-muted rounded-bl-sm" : "self-end bg-primary text-primary-foreground rounded-br-sm"}`}>
                <div>{t.text}</div>
                {t.role === "ai" && (
                  <button type="button" onClick={() => playLine(t.text)}
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-card border border-primary/30 rounded-full px-2 py-0.5 hover:bg-primary/5">
                    <Volume2 className="w-3 h-3" /> Play
                  </button>
                )}
              </div>
            ))}
            {send.isPending && (
              <div className="self-start text-xs text-muted-foreground italic pl-2">{proj.characterName} is typing…</div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t px-4 py-3">
            <button type="button" disabled title="Voice replies are coming soon"
              className="px-3 py-2.5 rounded-xl border border-dashed text-muted-foreground cursor-not-allowed">
              <Mic className="w-4 h-4" />
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Type your reply in English…"
              className="flex-1 px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <Button onClick={handleSend} disabled={!draft.trim() || send.isPending}>
              <Send className="w-4 h-4" />
            </Button>
          </div>

          <div className="px-4 pb-4">
            <Button variant="outline" className="w-full border-primary text-primary"
              disabled={studentTurns < minTurns || finish.isPending}
              onClick={() => finish.mutate()}>
              {finish.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Getting your feedback…</>
                : studentTurns < minTurns
                  ? `Reply ${minTurns - studentTurns} more time${minTurns - studentTurns === 1 ? "" : "s"} to finish`
                  : <><CheckCircle2 className="w-4 h-4 mr-2" /> Finish &amp; get feedback</>}
            </Button>
          </div>
        </Card>
      )}

      {/* ---------- FEEDBACK ---------- */}
      {phase === "feedback" && feedback && (
        <Card className="p-6 space-y-5">
          <div>
            <Badge className="bg-primary text-xs">Scenario complete</Badge>
            <h2 className="text-xl font-bold mt-3">Nice work! Here's your feedback</h2>
            <div className="flex items-baseline gap-2 mt-3">
              <span className="text-5xl font-extrabold text-emerald-600">{feedback.score}</span>
              <span className="text-muted-foreground">/ 100</span>
            </div>
          </div>

          {feedback.didWell.length > 0 && (
            <div>
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-emerald-600 mb-2 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> What you did well</h3>
              <ul className="space-y-2">
                {feedback.didWell.map((d, i) => <li key={i} className="text-sm bg-emerald-50 rounded-lg px-3 py-2.5">{d}</li>)}
              </ul>
            </div>
          )}

          {feedback.toPolish.length > 0 && (
            <div>
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-amber-600 mb-2 flex items-center gap-1"><Sparkles className="w-4 h-4" /> A few things to polish</h3>
              <ul className="space-y-2">
                {feedback.toPolish.map((p, i) => (
                  <li key={i} className="text-sm bg-amber-50 rounded-lg px-3 py-2.5">
                    {p.quote && <span className="font-semibold text-amber-700">"{p.quote}" </span>}
                    <span className="text-muted-foreground">{p.tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feedback.vocab.length > 0 && (
            <div>
              <h3 className="text-[13px] font-bold uppercase tracking-wide text-primary mb-2 flex items-center gap-1"><MessageSquare className="w-4 h-4" /> Vocabulary you could use</h3>
              <ul className="space-y-2">
                {feedback.vocab.map((v, i) => (
                  <li key={i} className="text-sm bg-primary/5 rounded-lg px-3 py-2.5">
                    <span className="font-semibold text-primary">{v.term}</span> — {v.meaning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={restart}>
              <RotateCcw className="w-4 h-4 mr-1" /> Try again
            </Button>
            <Button className="flex-1" onClick={() => navigate("/dashboard/courses")}>
              Back to courses <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">Feedback is generated by Claude, anchored to your level and module vocabulary.</p>
        </Card>
      )}
    </div>
  );
}
