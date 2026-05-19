import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Users,
  Clock,
  TrendingUp,
  Calendar,
  ArrowRight,
  MessageSquare,
  Loader2,
  Sprout,
  Sun,
  Mountain,
  Compass,
  Crown,
  GraduationCap,
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { LiveNowWidget } from "@/components/dashboard/live-now-widget";
import { DailyChallengeWidget } from "@/components/dashboard/daily-challenge-widget";
import type { LiveSession, SessionRoom, UserStats, Enrollment, Course } from "@shared/schema";

/**
 * Per-CEFR-level visual identity used across the student-facing surface.
 * Each level gets its own colour family + evocative lucide icon, so a
 * student instantly recognises "this is my A1 course" vs another level.
 *
 * Keep this object in sync with the equivalent map in course-catalog.tsx.
 */
const LEVEL_IDENTITY: Record<string, {
  icon: React.ElementType;
  gradient: string;          // Tailwind gradient classes for thumbnails
  iconColor: string;         // text class for the icon over the gradient
  chipBg: string;            // chip background for the level label
  chipText: string;          // chip text colour for the level label
  dot: string;               // small status-dot colour
  ctaBg: string;             // button base colour
  ctaHover: string;          // button hover colour
}> = {
  A1: {
    icon: Sprout,
    gradient: "from-emerald-100 to-emerald-200",
    iconColor: "text-emerald-700",
    chipBg: "bg-emerald-100",
    chipText: "text-emerald-700",
    dot: "bg-emerald-500",
    ctaBg: "bg-emerald-500",
    ctaHover: "hover:bg-emerald-600",
  },
  A2: {
    icon: Sun,
    gradient: "from-sky-100 to-sky-200",
    iconColor: "text-sky-700",
    chipBg: "bg-sky-100",
    chipText: "text-sky-700",
    dot: "bg-sky-500",
    ctaBg: "bg-sky-500",
    ctaHover: "hover:bg-sky-600",
  },
  B1: {
    icon: Mountain,
    gradient: "from-indigo-100 to-indigo-200",
    iconColor: "text-indigo-700",
    chipBg: "bg-indigo-100",
    chipText: "text-indigo-700",
    dot: "bg-indigo-500",
    ctaBg: "bg-indigo-500",
    ctaHover: "hover:bg-indigo-600",
  },
  B2: {
    icon: Compass,
    gradient: "from-purple-100 to-purple-200",
    iconColor: "text-purple-700",
    chipBg: "bg-purple-100",
    chipText: "text-purple-700",
    dot: "bg-purple-500",
    ctaBg: "bg-purple-500",
    ctaHover: "hover:bg-purple-600",
  },
  C1: {
    icon: Crown,
    gradient: "from-amber-100 to-amber-200",
    iconColor: "text-amber-700",
    chipBg: "bg-amber-100",
    chipText: "text-amber-800",
    dot: "bg-amber-500",
    ctaBg: "bg-amber-500",
    ctaHover: "hover:bg-amber-600",
  },
};

function getLevelIdentity(level: string) {
  return LEVEL_IDENTITY[level] || LEVEL_IDENTITY.A1;
}

const LEVEL_LABEL: Record<string, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper Intermediate",
  C1: "Advanced",
};

const courseTopicsEn: Record<string, string> = {
  "Business English": "Business English",
  "Travel & Tourism": "Travel & Tourism",
  "Technology": "Technology",
  "Culture & Arts": "Culture & Arts",
  "Healthcare": "Healthcare",
  "Finance": "Finance",
  "Academic English": "Academic English",
  "Everyday Conversations": "Everyday Conversations",
};
const getTopicLabel = (topic: string) => courseTopicsEn[topic] || topic;

/* ------------------------------------------------------------------ */
/* Compact stat card — 2x2 grid friendly, soft-coloured icon container */
/* ------------------------------------------------------------------ */
interface StatCardProps {
  icon: React.ElementType;
  label: string;          // "HOURS", "COURSES" etc
  value: string | number;
  sublabel?: string;      // tiny line under value, e.g. "studied total"
  iconBg: string;         // tailwind soft bg colour class
  iconText: string;       // tailwind text colour for the icon
  isLoading?: boolean;
}
function StatCard({ icon: Icon, label, value, sublabel, iconBg, iconText, isLoading }: StatCardProps) {
  return (
    <Card className="p-4 border-border hover-elevate rounded-xl">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-3.5 h-3.5 ${iconText}`} strokeWidth={2.5} />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-1" />
      ) : (
        <>
          <p className="text-2xl font-bold leading-none mt-1.5">{value}</p>
          {sublabel && <p className="text-[11px] text-muted-foreground mt-1">{sublabel}</p>}
        </>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Continue Learning card — uses the course's CEFR level for its       */
/* thumbnail identity (gradient + icon).                                */
/* ------------------------------------------------------------------ */
interface ContinueLearningCardProps {
  title: string;
  level: string;
  progress: number;
  courseId: string;
  moduleLabel?: string;
}
function ContinueLearningCard({ title, level, progress, courseId, moduleLabel }: ContinueLearningCardProps) {
  const id = getLevelIdentity(level);
  const Icon = id.icon;
  return (
    <Link href={`/dashboard/courses/${courseId}`}>
      <Card className="p-3 border-border hover-elevate rounded-xl cursor-pointer">
        <div className="flex items-center gap-3">
          <div className={`w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center bg-gradient-to-br ${id.gradient}`}>
            <Icon className={`w-7 h-7 ${id.iconColor}`} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${id.chipBg} ${id.chipText}`}>{level}</span>
              {moduleLabel && <span className="text-[10px] text-muted-foreground truncate">{moduleLabel}</span>}
            </div>
            <p className="text-sm font-semibold truncate leading-tight">{title}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${id.ctaBg}`} style={{ width: `${progress}%` }} />
              </div>
              <span className={`text-[10px] font-bold ${id.chipText}`}>{progress}%</span>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        </div>
      </Card>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Upcoming session card (compact) — fallback if /api/live-sessions   */
/* still feeds the dashboard. Visual: indigo accent.                  */
/* ------------------------------------------------------------------ */
type SessionWithRooms = LiveSession & { rooms: SessionRoom[] };

function formatSessionDate(dateStr: string): { label: string; time: string } {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let label = `${date.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][date.getMonth()]}`;
  if (date.toDateString() === today.toDateString()) label = "Today";
  else if (date.toDateString() === tomorrow.toDateString()) label = "Tomorrow";

  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return { label, time };
}

function UpcomingSessionCard({ session }: { session: SessionWithRooms }) {
  const dateInfo = formatSessionDate(session.scheduledAt as unknown as string);
  const totalSpots = session.rooms.reduce((sum, r) => sum + (r.maxParticipants - r.currentParticipants), 0);
  const topicLabels = session.rooms.slice(0, 2).map(r => getTopicLabel(r.topic));

  return (
    <Card className="p-4 border-border hover-elevate rounded-xl">
      <div className="flex items-start justify-between mb-2">
        <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-indigo-700" />
        </div>
        <span className="text-[10px] text-muted-foreground">{totalSpots} spots</span>
      </div>
      <p className="text-sm font-semibold mb-1 leading-tight">{session.title}</p>
      {topicLabels.length > 0 && (
        <p className="text-[11px] text-muted-foreground truncate mb-2">{topicLabels.join(" · ")}</p>
      )}
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Calendar className="w-3 h-3" />
        <span>{dateInfo.label}</span>
        <span>·</span>
        <span>{dateInfo.time}</span>
      </div>
    </Card>
  );
}

type EnrollmentWithCourse = Enrollment & { course?: Course };

export function DashboardOverview() {
  const { user } = useAuth();

  const { data: sessions = [] } = useQuery<LiveSession[]>({
    queryKey: ["/api/live-sessions"],
  });

  const { data: userStats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ["/api/user-stats"],
  });

  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery<EnrollmentWithCourse[]>({
    queryKey: ["/api/enrollments/with-progress"],
  });

  const sessionsWithRooms: SessionWithRooms[] = sessions.map(session => ({
    ...session,
    rooms: (session as any).rooms || [],
  }));

  const now = new Date();
  const upcomingSessions = sessionsWithRooms
    .filter(s => new Date(s.scheduledAt) > now)
    .slice(0, 2);

  const hoursStudied = userStats?.totalHoursStudied ? parseFloat(userStats.totalHoursStudied as string) : 0;
  const currentLevel = userStats?.currentLevel || user?.placementLevel || "A1";
  const xpPoints = userStats?.xpPoints || 0;
  const firstName = user?.firstName || user?.email?.split('@')[0] || "Student";

  return (
    <div className="space-y-6">
      {/* ---------- LIVE NOW WIDGET (top, only when sessions are live) ---------- */}
      <LiveNowWidget />

      {/* ---------- DAILY CHALLENGE compact entry ---------- */}
      <DailyChallengeWidget variant="compact" />

      {/* ---------- HERO CARD ---------- */}
      {/* Brand-aligned: white card, "WELCOME, {NAME}" in display uppercase,
          name accent in primary indigo, level chip below with cyan dot.
          Two faint radial halos in brand cyan + indigo for depth without
          dominating the visual. */}
      <Card className="relative overflow-hidden border-border p-5 sm:p-6 rounded-2xl">
        <div
          className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #33CBFB 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-10 -left-10 w-32 h-32 rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }}
        />

        <div className="relative">
          <h1 className="text-3xl font-display uppercase tracking-tight mb-1">
            Welcome, <span className="text-primary">{firstName}</span>
          </h1>
          <p className="text-sm font-mono text-muted-foreground mb-3">
            Continue your path to English fluency.
          </p>

          {/* Level + XP chip */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/8 border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#33CBFB" }} />
            <span className="text-xs font-bold text-primary tracking-wide">
              {currentLevel} · {(LEVEL_LABEL[currentLevel] || "Beginner").toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs font-semibold text-foreground/70">
              {xpPoints} XP
            </span>
          </div>
        </div>
      </Card>

      {/* ---------- STAT GRID (2x2 on mobile, 4 cols on lg) ---------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Clock}
          label="Hours"
          value={hoursStudied.toFixed(1)}
          sublabel="studied total"
          iconBg="bg-emerald-100"
          iconText="text-emerald-600"
          isLoading={statsLoading}
        />
        <StatCard
          icon={BookOpen}
          label="Courses"
          value={userStats?.coursesCompleted || 0}
          sublabel="completed"
          iconBg="bg-indigo-100"
          iconText="text-indigo-600"
          isLoading={statsLoading}
        />
        <StatCard
          icon={Users}
          label="Labs"
          value={userStats?.labsAttended || 0}
          sublabel="attended"
          iconBg="bg-amber-100"
          iconText="text-amber-600"
          isLoading={statsLoading}
        />
        <StatCard
          icon={TrendingUp}
          label="Level"
          value={currentLevel}
          sublabel={`${xpPoints} XP`}
          iconBg="bg-orange-100"
          iconText="text-orange-600"
          isLoading={statsLoading}
        />
      </div>

      {/* ---------- CONTINUE LEARNING ---------- */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Continue Learning</h2>
          <Link href="/dashboard/courses">
            <Button variant="ghost" size="sm" className="text-primary font-semibold" data-testid="link-view-all-courses">
              View all
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="space-y-3">
          {enrollmentsLoading ? (
            <Card className="p-6 border-border text-center rounded-xl">
              <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto mb-2" />
              <p className="text-xs font-mono text-muted-foreground">Loading your courses...</p>
            </Card>
          ) : enrollments.length > 0 ? (
            enrollments.slice(0, 3).map((enrollment) => (
              <ContinueLearningCard
                key={enrollment.id}
                title={enrollment.course?.title || "Course"}
                level={enrollment.course?.level || "A1"}
                progress={(enrollment as any).progress || 0}
                courseId={enrollment.courseId}
              />
            ))
          ) : (
            <Card className="p-6 border-border text-center rounded-xl">
              <GraduationCap className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-4">You're not enrolled in any courses yet</p>
              <Link href="/dashboard/courses">
                <Button data-testid="button-explore-courses">
                  Explore Courses
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </div>

      {/* ---------- UPCOMING LABS ---------- */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Upcoming Labs</h2>
          <Link href="/dashboard/labs">
            <Button variant="ghost" size="sm" className="text-primary font-semibold" data-testid="link-view-all-labs">
              View all
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
        {upcomingSessions.length > 0 ? (
          <div className="space-y-3">
            {upcomingSessions.map((session) => (
              <UpcomingSessionCard key={session.id} session={session} />
            ))}
          </div>
        ) : (
          /* Friendly empty state — gradient amber/orange invites the student
             to book a live Lab rather than showing dead grey space. */
          <Card className="p-6 text-center rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
            <div className="w-12 h-12 rounded-full bg-white shadow-sm mx-auto mb-3 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-amber-500" />
            </div>
            <p className="text-sm font-bold text-foreground">No upcoming sessions</p>
            <p className="text-xs text-muted-foreground mb-4">Practice live with a teacher in your level</p>
            <Link href="/dashboard/labs">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold" data-testid="button-book-lab">
                Book a Lab
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
