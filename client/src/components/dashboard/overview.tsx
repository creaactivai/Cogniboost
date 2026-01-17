import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, 
  Users, 
  Clock, 
  TrendingUp, 
  Play, 
  Calendar,
  ArrowRight,
  Flame
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

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

interface UpcomingLabCardProps {
  title: string;
  topic: string;
  date: string;
  time: string;
  spots: number;
}

function UpcomingLabCard({ title, topic, date, time, spots }: UpcomingLabCardProps) {
  return (
    <Card className="p-4 border-border hover-elevate">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-accent/10 flex items-center justify-center">
          <Users className="w-5 h-5 text-accent" />
        </div>
        <span className="text-xs font-mono text-muted-foreground">{spots} spots left</span>
      </div>
      <p className="font-mono text-sm font-medium mb-1">{title}</p>
      <p className="text-xs font-mono text-muted-foreground mb-3">{topic}</p>
      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
        <Calendar className="w-3 h-3" />
        <span>{date}</span>
        <span>•</span>
        <span>{time}</span>
      </div>
    </Card>
  );
}

export function DashboardOverview() {
  const { user } = useAuth();

  // Mock data - in real app, this would come from API
  const stats = {
    hoursStudied: 24.5,
    coursesCompleted: 3,
    labsAttended: 12,
    currentLevel: "B1",
    xpPoints: 2450,
    streak: 7,
  };

  const continueLearning = [
    { title: "Business English: Meetings & Presentations", level: "B1", progress: 65 },
    { title: "Everyday Conversations: At the Office", level: "A2", progress: 40 },
    { title: "Grammar Essentials: Past Tenses", level: "B1", progress: 20 },
  ];

  const upcomingLabs = [
    { title: "Tech Talk Tuesday", topic: "Artificial Intelligence in 2025", date: "Tomorrow", time: "6:00 PM", spots: 4 },
    { title: "Business Negotiations", topic: "Salary & Contract Discussions", date: "Jan 20", time: "7:00 PM", spots: 6 },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display uppercase mb-2">
            Welcome back, <span className="text-primary">{user?.firstName || "Learner"}</span>
          </h1>
          <p className="font-mono text-muted-foreground">
            Continue your journey to English fluency
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30">
          <Flame className="w-5 h-5 text-accent" />
          <span className="font-mono text-sm">
            <span className="font-bold">{stats.streak} day</span> streak
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Hours Studied" value={stats.hoursStudied} sublabel="This month" />
        <StatCard icon={BookOpen} label="Courses Completed" value={stats.coursesCompleted} />
        <StatCard icon={Users} label="Labs Attended" value={stats.labsAttended} color="accent" />
        <StatCard icon={TrendingUp} label="Current Level" value={stats.currentLevel} sublabel={`${stats.xpPoints} XP`} />
      </div>

      {/* Two column layout */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Continue learning */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display uppercase">Continue Learning</h2>
            <Link href="/dashboard/courses">
              <Button variant="ghost" className="font-mono text-sm" data-testid="link-view-all-courses">
                View All
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

        {/* Upcoming labs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display uppercase">Upcoming Labs</h2>
            <Link href="/dashboard/labs">
              <Button variant="ghost" className="font-mono text-sm" data-testid="link-view-all-labs">
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingLabs.map((lab, index) => (
              <UpcomingLabCard key={index} {...lab} />
            ))}
          </div>
          <Link href="/dashboard/labs">
            <Button className="w-full bg-accent text-accent-foreground font-mono uppercase tracking-wider" data-testid="button-book-lab">
              Book a Lab
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
