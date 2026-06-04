import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  MessageSquare,
  Zap,
  Brain,
  Trophy,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  X,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const STORAGE_KEY = "cb_walkthrough_v1_done";

interface Step {
  icon: typeof BookOpen;
  titleEn: string;
  titleEs: string;
  bodyEn: string;
  bodyEs: string;
  cta?: { labelEn: string; labelEs: string; path: string };
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    titleEn: "Welcome to CogniBoost!",
    titleEs: "¡Bienvenido a CogniBoost!",
    bodyEn:
      "You're about to level up your English. This 60-second tour shows you the 4 things that make CogniBoost different — so you can hit the ground running.",
    bodyEs:
      "Estás a punto de subir de nivel en tu inglés. Este tour de 60 segundos te muestra las 4 cosas que hacen único a CogniBoost — para que arranques sin perder tiempo.",
  },
  {
    icon: BookOpen,
    titleEn: "Courses & Lessons",
    titleEs: "Cursos y Lecciones",
    bodyEn:
      "Start in Courses. Lessons unlock as you finish them — each one has a video, quick practice, and a short quiz. Take your time, there's no clock ticking.",
    bodyEs:
      "Empieza en Cursos. Las lecciones se desbloquean al terminarlas — cada una tiene un video, práctica rápida, y un mini-quiz. Tómate tu tiempo, no hay reloj corriendo.",
    cta: {
      labelEn: "See my courses",
      labelEs: "Ver mis cursos",
      path: "/dashboard/courses",
    },
  },
  {
    icon: MessageSquare,
    titleEn: "Conversation Labs",
    titleEs: "Conversation Labs",
    bodyEn:
      "Real conversation with real people — small groups, by level, on topics you actually care about. This is where speaking really clicks. Book your first one this week.",
    bodyEs:
      "Conversación real con personas reales — grupos pequeños, por nivel, sobre temas que te importan. Aquí es donde el speaking realmente hace click. Reserva tu primero esta semana.",
    cta: {
      labelEn: "Browse labs",
      labelEs: "Ver labs",
      path: "/dashboard/labs",
    },
  },
  {
    icon: Zap,
    titleEn: "Daily Challenge",
    titleEs: "Daily Challenge",
    bodyEn:
      "5 minutes a day, every day. A bite-sized prompt that keeps your English alive between lessons. Streaks build fast — and they really matter.",
    bodyEs:
      "5 minutos al día, todos los días. Un reto chiquito que mantiene tu inglés vivo entre lecciones. Las rachas crecen rápido — y de verdad cuentan.",
    cta: {
      labelEn: "Try today's challenge",
      labelEs: "Probar el de hoy",
      path: "/dashboard/daily-challenge",
    },
  },
  {
    icon: Brain,
    titleEn: "Vocabulary",
    titleEs: "Vocabulary",
    bodyEn:
      "Every word you struggle with gets saved here automatically. We bring it back when you're about to forget it — that's spaced repetition, and it's why the words stick.",
    bodyEs:
      "Cada palabra que se te complica se guarda aquí automáticamente. Te la traemos de vuelta justo cuando estás por olvidarla — eso es repetición espaciada, y por eso las palabras se quedan.",
    cta: {
      labelEn: "Open vocabulary",
      labelEs: "Abrir vocabulario",
      path: "/dashboard/vocabulary",
    },
  },
  {
    icon: Trophy,
    titleEn: "You're all set",
    titleEs: "¡Listo!",
    bodyEn:
      "Pro tip: stack one lesson + one Daily Challenge each day. Add a Conversation Lab once a week. That's the formula that gets people to B2 in months, not years.",
    bodyEs:
      "Tip pro: junta una lección + un Daily Challenge cada día. Agrega un Conversation Lab una vez por semana. Esa es la fórmula que lleva a la gente a B2 en meses, no años.",
  },
];

export function WelcomeWalkthrough() {
  const [, setLocation] = useLocation();
  const { locale } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);

  // Show ONCE per account. The source of truth is the server flag
  // `walkthroughSeen` (persists across browsers/devices); localStorage is
  // only a fast local short-circuit. Defer to next tick to avoid flashing
  // before auth/onboarding redirects finish.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user) return; // wait for auth to load
    if ((user as any).walkthroughSeen) return; // already seen on this account
    if (localStorage.getItem(STORAGE_KEY)) return; // already seen on this device
    const id = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(id);
  }, [user]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setOpen(false);
    // Persist server-side so it never reappears on another browser/device.
    // Fire-and-forget — a failure here only means the local flag still holds.
    apiRequest("POST", "/api/auth/walkthrough-seen").catch(() => {});
  };

  const next = () => {
    if (stepIdx < STEPS.length - 1) {
      setStepIdx(stepIdx + 1);
    } else {
      dismiss();
    }
  };

  const prev = () => {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  };

  const goToCta = (path: string) => {
    dismiss();
    setLocation(path);
  };

  const step = STEPS[stepIdx];
  const Icon = step.icon;
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === STEPS.length - 1;
  const es = locale === "es";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && dismiss()}>
      <DialogContent
        className="max-w-lg p-0 gap-0 overflow-hidden border-2"
        data-testid="welcome-walkthrough"
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          aria-label="Skip tour"
          className="absolute right-3 top-3 z-10 p-1.5 rounded-full hover:bg-muted transition-colors"
          data-testid="walkthrough-close"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Header with icon */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 px-6 pt-8 pb-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mb-4">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <Badge variant="outline" className="font-mono text-xs mb-3">
            {stepIdx + 1} / {STEPS.length}
          </Badge>
          <h2 className="text-2xl font-display uppercase tracking-tight mb-2">
            {es ? step.titleEs : step.titleEn}
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <p className="text-base font-mono text-muted-foreground leading-relaxed">
            {es ? step.bodyEs : step.bodyEn}
          </p>

          {step.cta && (
            <Button
              variant="outline"
              className="mt-5 w-full font-mono"
              onClick={() => goToCta(step.cta!.path)}
              data-testid="walkthrough-cta"
            >
              {es ? step.cta.labelEs : step.cta.labelEn}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Progress dots */}
        <div className="px-6 pb-2 flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIdx
                  ? "w-6 bg-primary"
                  : i < stepIdx
                  ? "w-1.5 bg-primary/40"
                  : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Footer nav */}
        <div className="px-6 py-4 flex items-center justify-between gap-2 border-t">
          <Button
            variant="ghost"
            onClick={prev}
            disabled={isFirst}
            className="font-mono"
            data-testid="walkthrough-prev"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            {es ? "Atrás" : "Back"}
          </Button>

          <button
            onClick={dismiss}
            className="text-xs font-mono text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            data-testid="walkthrough-skip"
          >
            {es ? "Saltar tour" : "Skip tour"}
          </button>

          <Button
            onClick={next}
            className="font-mono"
            data-testid="walkthrough-next"
          >
            {isLast ? (es ? "¡Empezar!" : "Let's go!") : es ? "Siguiente" : "Next"}
            {!isLast && <ChevronRight className="ml-1 h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
