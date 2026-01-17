import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Users, 
  Clock, 
  TrendingUp, 
  Play, 
  Calendar,
  ArrowRight,
  Flame,
  MessageSquare
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import type { LiveSession, SessionRoom } from "@shared/schema";

const courseTopicsEs: Record<string, string> = {
  "Business English": "Inglés de Negocios",
  "Travel & Tourism": "Viajes y Turismo",
  "Technology": "Tecnología",
  "Culture & Arts": "Cultura y Artes",
  "Healthcare": "Salud",
  "Finance": "Finanzas",
  "Academic English": "Inglés Académico",
  "Everyday Conversations": "Conversaciones Cotidianas",
};

const getTopicLabel = (topic: string) => courseTopicsEs[topic] || topic;

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sublabel?: string;
  color?: "primary" | "accent";
}

function StatCard({ icon: Icon, label, value, sublabel, color = "primary" }: StatCardProps) {
  return (
    <Card className="p-6 border-border hover-elevate">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 flex items-center justify-center ${color === "accent" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}`}>
          <Icon className="w-6 h-6" />
        </div>
        {sublabel && (
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            {sublabel}
          </span>
        )}
      </div>
      <p className="text-3xl font-display mb-1">{value}</p>
      <p className="text-sm font-mono text-muted-foreground">{label}</p>
    </Card>
  );
}

interface CourseCardProps {
  title: string;
  level: string;
  progress: number;
  thumbnail?: string;
}

function ContinueLearningCard({ title, level, progress, thumbnail }: CourseCardProps) {
  return (
    <Card className="p-4 border-border hover-elevate group">
      <div className="flex gap-4">
        <div className="w-24 h-16 bg-muted flex items-center justify-center flex-shrink-0">
          <Play className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-mono">{level}</span>
          </div>
          <p className="font-mono text-sm truncate mb-2">{title}</p>
          <div className="flex items-center gap-2">
            <Progress value={progress} className="h-1 flex-1" />
            <span className="text-xs font-mono text-muted-foreground">{progress}%</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

type SessionWithRooms = LiveSession & { rooms: SessionRoom[] };

function formatSessionDate(dateStr: string): { label: string; time: string } {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  let label = `${date.getDate()} ${["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][date.getMonth()]}`;
  if (date.toDateString() === today.toDateString()) {
    label = "Hoy";
  } else if (date.toDateString() === tomorrow.toDateString()) {
    label = "Mañana";
  }
  
  const time = date.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit", hour12: true });
  
  return { label, time };
}

interface UpcomingSessionCardProps {
  session: SessionWithRooms;
}

function UpcomingSessionCard({ session }: UpcomingSessionCardProps) {
  const dateInfo = formatSessionDate(session.scheduledAt as unknown as string);
  const totalSpots = session.rooms.reduce((sum, r) => sum + (r.maxParticipants - r.currentParticipants), 0);
  const topicLabels = session.rooms.slice(0, 2).map(r => getTopicLabel(r.topic));
  
  return (
    <Card className="p-4 border-border hover-elevate">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-accent/10 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-accent" />
        </div>
        <span className="text-xs font-mono text-muted-foreground">{totalSpots} lugares</span>
      </div>
      <p className="font-mono text-sm font-medium mb-1">{session.title}</p>
      <div className="flex flex-wrap gap-1 mb-3">
        {topicLabels.map((topic, i) => (
          <Badge key={i} variant="secondary" className="text-xs font-mono">{topic}</Badge>
        ))}
        {session.rooms.length > 2 && (
          <Badge variant="outline" className="text-xs font-mono">+{session.rooms.length - 2}</Badge>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
        <Calendar className="w-3 h-3" />
        <span>{dateInfo.label}</span>
        <span>•</span>
        <span>{dateInfo.time}</span>
      </div>
    </Card>
  );
}

export function DashboardOverview() {
  const { user } = useAuth();

  const { data: sessions = [] } = useQuery<LiveSession[]>({
    queryKey: ["/api/live-sessions"],
  });

  const sessionsWithRooms: SessionWithRooms[] = sessions.map(session => ({
    ...session,
    rooms: (session as any).rooms || [],
  }));

  const now = new Date();
  const upcomingSessions = sessionsWithRooms
    .filter(s => new Date(s.scheduledAt) > now)
    .slice(0, 2);

  const stats = {
    hoursStudied: 24.5,
    coursesCompleted: 3,
    labsAttended: 12,
    currentLevel: "B1",
    xpPoints: 2450,
    streak: 7,
  };

  const continueLearning = [
    { title: "Inglés de Negocios: Reuniones y Presentaciones", level: "B1", progress: 65 },
    { title: "Conversaciones Cotidianas: En la Oficina", level: "A2", progress: 40 },
    { title: "Gramática Esencial: Tiempos Pasados", level: "B1", progress: 20 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display uppercase mb-2">
            Bienvenido/a, <span className="text-primary">{user?.firstName || "Estudiante"}</span>
          </h1>
          <p className="font-mono text-muted-foreground">
            Continúa tu camino hacia la fluidez en inglés
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30">
          <Flame className="w-5 h-5 text-accent" />
          <span className="font-mono text-sm">
            Racha de <span className="font-bold">{stats.streak} días</span>
          </span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Horas Estudiadas" value={stats.hoursStudied} sublabel="Este mes" />
        <StatCard icon={BookOpen} label="Cursos Completados" value={stats.coursesCompleted} />
        <StatCard icon={Users} label="Labs Asistidos" value={stats.labsAttended} color="accent" />
        <StatCard icon={TrendingUp} label="Nivel Actual" value={stats.currentLevel} sublabel={`${stats.xpPoints} XP`} />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display uppercase">Continuar Aprendiendo</h2>
            <Link href="/dashboard/courses">
              <Button variant="ghost" className="font-mono text-sm" data-testid="link-view-all-courses">
                Ver Todos
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {continueLearning.map((course, index) => (
              <ContinueLearningCard key={index} {...course} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display uppercase">Próximas Sesiones</h2>
            <Link href="/dashboard/labs">
              <Button variant="ghost" className="font-mono text-sm" data-testid="link-view-all-labs">
                Ver Todos
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingSessions.length > 0 ? (
              upcomingSessions.map((session) => (
                <UpcomingSessionCard key={session.id} session={session} />
              ))
            ) : (
              <Card className="p-6 border-border text-center">
                <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs font-mono text-muted-foreground">
                  No hay sesiones programadas
                </p>
              </Card>
            )}
          </div>
          <Link href="/dashboard/labs">
            <Button className="w-full bg-accent text-accent-foreground font-mono uppercase tracking-wider" data-testid="button-book-lab">
              Reservar una Sala
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
