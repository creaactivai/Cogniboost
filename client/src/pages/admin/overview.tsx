import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AdminLayout } from "@/components/admin/admin-layout";
import { LiveNowWidget } from "@/components/dashboard/live-now-widget";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, CreditCard, DollarSign, Radio, BookOpen, ClipboardCheck, ArrowRight } from "lucide-react";

interface AdminStats {
  totalStudents: number;
  totalCourses: number;
  totalLabs: number;
  totalRevenue: string;
  activeSubscriptions: number;
  classesThisWeek: number;
  estimatedMrr: string;
  tierCounts: { free: number; flex: number; basic: number; premium: number };
}

interface UpcomingLab {
  id: string;
  title: string;
  level: string;
  scheduledAt: string;
  bookedCount?: number;
}

export default function AdminOverview() {
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 30000,
  });
  const { data: upcoming = [] } = useQuery<UpcomingLab[]>({
    queryKey: ["/api/lab-sessions/upcoming?level=all"],
  });

  const t = stats?.tierCounts || { free: 0, flex: 0, basic: 0, premium: 0 };
  const paying = t.flex + t.basic + t.premium;
  const nextClasses = [...upcoming].slice(0, 4);

  const tiles = [
    {
      icon: Users, title: "Estudiantes",
      value: statsLoading ? "…" : stats?.totalStudents ?? 0,
      sub: `${t.free} free · ${paying} pagando`,
    },
    {
      icon: CreditCard, title: "Suscripciones activas",
      value: statsLoading ? "…" : stats?.activeSubscriptions ?? 0,
      sub: `${t.basic} Basic · ${t.premium} Premium`,
    },
    {
      icon: Calendar, title: "Clases esta semana",
      value: statsLoading ? "…" : stats?.classesThisWeek ?? 0,
      sub: `${stats?.totalLabs ?? 0} programadas en total`,
    },
    {
      icon: DollarSign, title: "Ingreso mensual est.",
      value: statsLoading ? "…" : `$${Number(stats?.estimatedMrr || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      sub: "estimado de tus planes",
    },
  ];

  return (
    <AdminLayout title="Panel General">
      <div className="space-y-6">
        <LiveNowWidget />

        {/* Stat tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {tiles.map((tile, i) => (
            <Card key={i} className="p-4" data-testid={`card-stat-${i}`}>
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <tile.icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <p className="text-2xl font-display uppercase tracking-tight" data-testid={`text-stat-value-${i}`}>{tile.value}</p>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">{tile.title}</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">{tile.sub}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: teacher command center + courses */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display uppercase tracking-tight flex items-center gap-2">
                  <Radio className="w-4 h-4 text-primary" /> Tus próximas clases
                </h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/teacher/classes" className="text-xs">Ver planeación <ArrowRight className="w-3 h-3 ml-1" /></Link>
                </Button>
              </div>
              {nextClasses.length === 0 ? (
                <p className="font-mono text-sm text-muted-foreground">No hay clases próximas.</p>
              ) : (
                <div className="space-y-2">
                  {nextClasses.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg" data-testid={`next-class-${s.id}`}>
                      <div className="w-14 shrink-0">
                        <div className="text-sm font-bold tabular-nums">{formatTime(s.scheduledAt)}</div>
                        <div className="text-[10px] text-muted-foreground">{formatDay(s.scheduledAt)}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{topicTitle(s.title)} <Badge variant="outline" className="text-[10px] ml-1">{s.level}</Badge></p>
                        <p className="text-[11px] text-muted-foreground">{s.bookedCount ?? 0} agendados</p>
                      </div>
                      <Button size="sm" asChild>
                        <Link href={`/dashboard/labs/${s.id}/room`} className="flex items-center gap-1.5"><Radio className="w-3.5 h-3.5" /> Iniciar</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <h2 className="text-lg font-display uppercase tracking-tight mb-4 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-primary" /> Por revisar
              </h2>
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                <p className="text-sm text-muted-foreground">Revisa los trabajos de tus estudiantes que esperan calificación.</p>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/dashboard/teacher">Ir a la cola</Link>
                </Button>
              </div>
            </Card>
          </div>

          {/* Right: business summary */}
          <div className="space-y-6">
            <Card className="p-4">
              <h2 className="text-lg font-display uppercase tracking-tight mb-4">Suscripciones</h2>
              <div className="space-y-3">
                <TierBar label="Premium" n={t.premium} total={stats?.totalStudents || 1} color="bg-primary" />
                <TierBar label="Basic" n={t.basic} total={stats?.totalStudents || 1} color="bg-cyan-500" />
                <TierBar label="Free" n={t.free} total={stats?.totalStudents || 1} color="bg-muted-foreground/40" />
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="text-lg font-display uppercase tracking-tight mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" /> Currículum
              </h2>
              <p className="text-sm text-muted-foreground">Guiones de Labs por nivel. Revisa la cobertura y genera los que falten.</p>
              <Button variant="ghost" size="sm" className="mt-2 px-0" asChild>
                <Link href="/admin/labs" className="text-xs text-primary">Ver Laboratorios <ArrowRight className="w-3 h-3 ml-1" /></Link>
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function TierBar({ label, n, total, color }: { label: string; n: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((n / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-16 font-mono text-muted-foreground">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-bold w-6 text-right tabular-nums">{n}</span>
    </div>
  );
}

function topicTitle(title: string): string {
  return title
    .replace(/^Conversation Lab\s*·\s*[A-C][12]\s*·\s*/, "")
    .replace(/\s*\((Morning|Evening(?:\s*TT|\s*MW)?)\)\s*$/, "")
    .trim() || title;
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es", { hour: "numeric", minute: "2-digit" });
}
function formatDay(iso: string): string {
  const s = new Date(iso).toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
