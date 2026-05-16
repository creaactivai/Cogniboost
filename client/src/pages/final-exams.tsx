/**
 * Final Exams landing page — shows the student the CEFR Mastery Exam
 * for each level, their eligibility (must be 100% complete on the
 * level's course), and a CTA to start the exam when ready.
 *
 * Route: /dashboard/exams
 */

import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Award, Lock, CheckCircle2, ArrowRight, Trophy, Sprout, Sun, Mountain, Compass, Crown,
} from "lucide-react";

interface LevelEligibility {
  eligible: boolean;
  reason: string | null;
  completionPct?: number;
  totalLessons?: number;
  completedInCourse?: number;
  alreadyPassed?: boolean;
  attemptId?: string;
  exam?: {
    id: string;
    level: string;
    title: string;
    description: string;
    passingScore: number;
    durationMinutes: number;
    isPublished: boolean;
  };
}

const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;

const LEVEL_IDENTITY: Record<string, { icon: React.ElementType; gradient: string; iconColor: string; chipBg: string; chipText: string; dot: string; ctaBg: string; ctaHover: string; borderHover: string; label: string }> = {
  A1: { icon: Sprout, gradient: "from-emerald-100 to-emerald-200", iconColor: "text-emerald-700", chipBg: "bg-emerald-100", chipText: "text-emerald-700", dot: "bg-emerald-500", ctaBg: "bg-emerald-500", ctaHover: "hover:bg-emerald-600", borderHover: "hover:border-emerald-200", label: "Beginner" },
  A2: { icon: Sun, gradient: "from-sky-100 to-sky-200", iconColor: "text-sky-700", chipBg: "bg-sky-100", chipText: "text-sky-700", dot: "bg-sky-500", ctaBg: "bg-sky-500", ctaHover: "hover:bg-sky-600", borderHover: "hover:border-sky-200", label: "Elementary" },
  B1: { icon: Mountain, gradient: "from-indigo-100 to-indigo-200", iconColor: "text-indigo-700", chipBg: "bg-indigo-100", chipText: "text-indigo-700", dot: "bg-indigo-500", ctaBg: "bg-indigo-500", ctaHover: "hover:bg-indigo-600", borderHover: "hover:border-indigo-200", label: "Intermediate" },
  B2: { icon: Compass, gradient: "from-purple-100 to-purple-200", iconColor: "text-purple-700", chipBg: "bg-purple-100", chipText: "text-purple-700", dot: "bg-purple-500", ctaBg: "bg-purple-500", ctaHover: "hover:bg-purple-600", borderHover: "hover:border-purple-200", label: "Upper Int." },
  C1: { icon: Crown, gradient: "from-amber-100 to-amber-200", iconColor: "text-amber-700", chipBg: "bg-amber-100", chipText: "text-amber-800", dot: "bg-amber-500", ctaBg: "bg-amber-500", ctaHover: "hover:bg-amber-600", borderHover: "hover:border-amber-200", label: "Advanced" },
};

function LevelExamCard({ level }: { level: string }) {
  const [, navigate] = useLocation();
  const id = LEVEL_IDENTITY[level];
  const Icon = id.icon;
  const { data, isLoading } = useQuery<LevelEligibility>({
    queryKey: [`/api/final-exams/${level}/eligibility`],
  });

  const pct = data?.completionPct ?? 0;
  const examPublished = data?.exam?.isPublished;
  const passed = data?.alreadyPassed;
  const canStart = !!data?.eligible && !passed;

  return (
    <Card className={`overflow-hidden border-border ${id.borderHover} hover:shadow-xl transition-all rounded-2xl`}>
      <div className={`h-32 relative overflow-hidden bg-gradient-to-br ${id.gradient}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className={`w-16 h-16 ${id.iconColor} opacity-50`} strokeWidth={1.5} />
        </div>
        <div className={`absolute top-3 left-3 px-2.5 py-1 bg-white/95 rounded-lg shadow-sm flex items-center gap-1.5`}>
          <span className={`w-1.5 h-1.5 rounded-full ${id.dot}`} />
          <span className={`text-xs font-bold ${id.chipText}`}>{level} · {id.label}</span>
        </div>
        {passed && (
          <div className="absolute top-3 right-3 px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded inline-flex items-center gap-1">
            <Trophy className="w-3 h-3" /> CERTIFIED
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="text-lg font-bold leading-tight mb-1">
          {data?.exam?.title || `${level} Mastery Exam`}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[2.5rem]">
          {data?.exam?.description || "Demonstrate you have mastered this CEFR level."}
        </p>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Checking eligibility…</div>
        ) : passed ? (
          <Button onClick={() => navigate("/dashboard/certificates")} variant="outline" className="w-full">
            <Trophy className="w-4 h-4 mr-2" /> View certificate
          </Button>
        ) : !examPublished ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5" /> Exam coming soon
          </div>
        ) : canStart ? (
          <Button
            onClick={() => navigate(`/dashboard/exam/${level}`)}
            className={`w-full ${id.ctaBg} ${id.ctaHover} text-white font-semibold rounded-lg`}
            data-testid={`button-start-exam-${level}`}
          >
            <Award className="w-4 h-4 mr-2" /> Start Mastery Exam
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-3.5 h-3.5" />
              <span>
                Complete the course first ({data?.completedInCourse ?? 0}/{data?.totalLessons ?? 0} lessons)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${id.ctaBg} rounded-full transition-all`} style={{ width: `${pct}%` }} />
              </div>
              <span className={`text-[11px] font-bold ${id.chipText}`}>{pct}%</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function FinalExamsPage() {
  return (
    <div className="space-y-6" data-testid="page-final-exams">
      <div>
        <h1 className="text-3xl font-display uppercase mb-1">CEFR Mastery Exams</h1>
        <p className="font-mono text-sm text-muted-foreground">
          Prove you have mastered a level. Pass with 70+ and earn a verifiable CogniBoost certificate.
        </p>
      </div>

      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Award className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">How the exam works</p>
            <p className="text-muted-foreground">
              Three sections, weighted: <strong>Quiz (40%)</strong> tests vocabulary & grammar from each module ·
              <strong> Writing (30%)</strong> measures your written production at level ·
              <strong> Speaking (30%)</strong> measures your spoken production at level.
              Pass with a 70+ to earn a shareable certificate.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {LEVELS.map((lvl) => (
          <LevelExamCard key={lvl} level={lvl} />
        ))}
      </div>
    </div>
  );
}
