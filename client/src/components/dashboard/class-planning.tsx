/**
 * Planeación de Clases — teacher/instructor command center for the week.
 *
 * Shows every upcoming Lab grouped by day. Per class the teacher sees:
 *   - who booked (roster, lazy-loaded on expand)
 *   - the full lesson plan / guion (5-phase, lazy-loaded on expand)
 *   - a button to start the live class
 *
 * Accessible to staff (admin + instructor). Reuses existing endpoints:
 *   GET /api/lab-sessions/upcoming?level=all
 *   GET /api/admin/lab-sessions/:id/registrations   (roster)
 *   GET /api/lab-sessions/:id/plan                    (full guion)
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarClock, Users, BookOpen, ChevronDown, Radio, Loader2 } from "lucide-react";

interface LabSession {
  id: string;
  title: string;
  level: string;
  interestTopicId: string;
  scheduledAt: string;
  durationMinutes: number;
  maxParticipants: number;
  bookedCount?: number;
}
interface RosterStudent {
  registrationId: string;
  attended?: boolean;
  student: { id: string; firstName?: string; lastName?: string; email?: string };
}
interface PlanData {
  available: boolean;
  planTitle?: string;
  objective?: string;
  grammarFocus?: string;
  previewBlurb?: string;
  vocabulary?: string[];
  expressions?: string[];
  plan?: Record<string, any>;
}

const PHASES: { key: string; label: string }[] = [
  { key: "hook", label: "1 · Enganche" },
  { key: "live", label: "2 · En vivo" },
  { key: "build", label: "3 · Construir" },
  { key: "anchor", label: "4 · Afianzar" },
  { key: "activate", label: "5 · Activar" },
];

export function ClassPlanning() {
  const { data: upcoming = [], isLoading } = useQuery<LabSession[]>({
    queryKey: ["/api/lab-sessions/upcoming?level=all"],
  });

  // Group by calendar day, next 7 days with classes.
  const order: string[] = [];
  const byDay = new Map<string, LabSession[]>();
  for (const s of upcoming) {
    const k = new Date(s.scheduledAt).toLocaleDateString("en-CA");
    if (!byDay.has(k)) { byDay.set(k, []); order.push(k); }
    byDay.get(k)!.push(s);
  }
  const days = order.slice(0, 7).map((k) => ({ key: k, sessions: byDay.get(k)! }));

  return (
    <div className="container mx-auto p-4 space-y-6" data-testid="page-class-planning">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-primary" />
          Planeación de Clases
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Tu semana de un vistazo — quién asiste a cada clase y tu guion listo.
        </p>
      </div>

      {isLoading ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Loader2 className="w-5 h-5 mx-auto animate-spin mb-2" /> Cargando tus clases…
        </Card>
      ) : days.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No hay clases programadas esta semana.
        </Card>
      ) : (
        days.map(({ key, sessions }) => (
          <div key={key} className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              {dayLabel(key)} <span className="text-muted-foreground/70 font-normal">{dateLabel(key)}</span>
            </h2>
            {sessions.map((s) => <ClassCard key={s.id} session={s} />)}
          </div>
        ))
      )}
    </div>
  );
}

function ClassCard({ session: s }: { session: LabSession }) {
  const [showRoster, setShowRoster] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const booked = s.bookedCount ?? 0;

  return (
    <Card className="p-4" data-testid={`plan-class-${s.id}`}>
      <div className="flex items-start gap-3 flex-wrap">
        <div className="w-16 shrink-0">
          <div className="text-lg font-bold tabular-nums leading-none">{formatTime(s.scheduledAt)}</div>
          <div className="text-[10px] uppercase text-muted-foreground mt-0.5">{s.durationMinutes} min</div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm">{topicTitle(s)}</h3>
          <Badge variant="outline" className="text-[10px] mt-1">{s.level}</Badge>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold tabular-nums">{booked}/{s.maxParticipants}</div>
          <div className="text-[10px] uppercase text-muted-foreground">agendados</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" asChild>
          <Link href={`/dashboard/labs/${s.id}/room`} className="flex items-center gap-1.5">
            <Radio className="w-4 h-4" /> Iniciar clase
          </Link>
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowPlan((o) => !o)} data-testid={`plan-guion-${s.id}`}>
          <BookOpen className="w-4 h-4 mr-1.5" /> Ver guion
          <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform ${showPlan ? "rotate-180" : ""}`} />
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowRoster((o) => !o)} data-testid={`plan-roster-${s.id}`}>
          <Users className="w-4 h-4 mr-1.5" /> Ver estudiantes ({booked})
          <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform ${showRoster ? "rotate-180" : ""}`} />
        </Button>
      </div>

      {showRoster && <Roster sessionId={s.id} />}
      {showPlan && <PlanView sessionId={s.id} />}
    </Card>
  );
}

function Roster({ sessionId }: { sessionId: string }) {
  const { data, isLoading } = useQuery<RosterStudent[]>({
    queryKey: [`/api/admin/lab-sessions/${sessionId}/registrations`],
    staleTime: 30_000,
  });
  return (
    <div className="mt-3 rounded-lg border bg-muted/20 p-3">
      <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Estudiantes que asistirán</p>
      {isLoading ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Cargando…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nadie ha agendado todavía — aparecerán aquí en cuanto reserven.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {data.map((r) => {
            const name = `${r.student.firstName || ""} ${r.student.lastName || ""}`.trim() || r.student.email || "Estudiante";
            const initials = (name.slice(0, 2)).toUpperCase();
            return (
              <span key={r.registrationId} className="flex items-center gap-2 bg-background border rounded-full pl-1 pr-3 py-0.5 text-xs font-medium" title={r.student.email}>
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold">{initials}</span>
                {name}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlanView({ sessionId }: { sessionId: string }) {
  const { data, isLoading } = useQuery<PlanData>({
    queryKey: [`/api/lab-sessions/${sessionId}/plan`],
    staleTime: 60 * 60 * 1000,
  });
  if (isLoading) {
    return <div className="mt-3 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Cargando el guion…</div>;
  }
  if (!data || !data.available) {
    return <div className="mt-3 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground italic">Aún no hay guion para esta clase.</div>;
  }
  return (
    <div className="mt-3 rounded-lg border bg-muted/20 p-4 space-y-4">
      {data.planTitle && <h4 className="font-bold text-sm">{data.planTitle}</h4>}
      {data.objective && (
        <p className="text-[13px]"><span className="font-semibold">Objetivo:</span> <span className="text-muted-foreground">{data.objective}</span></p>
      )}
      {data.grammarFocus && (
        <p className="text-[12px] rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2.5 py-1.5"><strong>Gramática:</strong> {data.grammarFocus}</p>
      )}

      {data.plan && (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Secuencia de la clase</p>
          {PHASES.map(({ key, label }) => (
            <PhaseBlock key={key} label={label} data={(data.plan as any)?.[key]} />
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3 pt-1">
        {data.vocabulary && data.vocabulary.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Vocabulario</p>
            <div className="flex flex-wrap gap-1.5">
              {data.vocabulary.map((w, i) => (
                <span key={i} className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/15 lowercase">{w}</span>
              ))}
            </div>
          </div>
        )}
        {data.expressions && data.expressions.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">Expresiones</p>
            <ul className="space-y-0.5">
              {data.expressions.map((e, i) => <li key={i} className="text-[12px] text-muted-foreground">• "{e}"</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function PhaseBlock({ label, data }: { label: string; data: any }) {
  if (!data) return null;
  const text = typeof data === "string"
    ? data
    : (data.prompt || data.description || data.activity || data.instructions || data.teacherScript || "");
  const variants: string[] = Array.isArray(data?.variants) ? data.variants : [];
  const script = typeof data === "object" ? (data.teacherScript || data.script) : "";
  if (!text && variants.length === 0) return null;
  return (
    <div className="border-l-2 border-primary/30 pl-3">
      <p className="text-[11px] font-bold text-primary uppercase tracking-wide">{label}</p>
      {text && <p className="text-[13px] mt-0.5">{text}</p>}
      {variants.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {variants.map((v, i) => <li key={i} className="text-[12px] text-muted-foreground">• {v}</li>)}
        </ul>
      )}
      {script && text !== script && <p className="text-[12px] text-muted-foreground italic mt-1">{script}</p>}
    </div>
  );
}

function dayFromKey(key: string): Date { return new Date(`${key}T12:00:00`); }
function dayLabel(key: string): string {
  const s = dayFromKey(key).toLocaleDateString("es", { weekday: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function dateLabel(key: string): string {
  return dayFromKey(key).toLocaleDateString("es", { day: "numeric", month: "short" });
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es", { hour: "numeric", minute: "2-digit" });
}
function topicTitle(s: LabSession): string {
  return s.title
    .replace(/^Conversation Lab\s*·\s*[A-C][12]\s*·\s*/, "")
    .replace(/\s*\((Morning|Evening(?:\s*TT|\s*MW)?)\)\s*$/, "")
    .trim() || s.title;
}
