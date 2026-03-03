import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  TrendingUp,
  Clock,
  BookOpen,
  Users,
  Award,
  Flame,
  Target,
  Zap,
  Trophy,
  GraduationCap,
  CheckCircle,
  Lock,
  Unlock,
  Loader2
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

// Sample data for charts (shown as preview/demo for new users)
const sampleSkillsData = [
  { skill: "Speaking", value: 70, fullMark: 100 },
  { skill: "Listening", value: 85, fullMark: 100 },
  { skill: "Reading", value: 90, fullMark: 100 },
  { skill: "Writing", value: 65, fullMark: 100 },
  { skill: "Vocabulary", value: 75, fullMark: 100 },
  { skill: "Grammar", value: 80, fullMark: 100 },
];

const sampleWeeklyProgress = [
  { day: "Mon", minutes: 45 },
  { day: "Tue", minutes: 60 },
  { day: "Wed", minutes: 30 },
  { day: "Thu", minutes: 90 },
  { day: "Fri", minutes: 45 },
  { day: "Sat", minutes: 120 },
  { day: "Sun", minutes: 60 },
];

// Achievement definitions (system tracks unlock status from user activity)
const achievementDefinitions = [
  { icon: Flame, id: "streak_7", title: "7-Day Streak", description: "Study 7 days in a row" },
  { icon: Users, id: "labs_10", title: "Regular Attendee", description: "Attend 10 conversation labs" },
  { icon: BookOpen, id: "courses_5", title: "Course Master", description: "Complete 5 courses" },
  { icon: Zap, id: "fast_learner", title: "Fast Learner", description: "Finish a course in one week" },
];

interface CourseScore {
  courseId: string;
  courseTitle: string;
  courseLevel: string;
  score: number;
  gpa: number;
  isPassed: boolean;
  modulesCompleted: number;
  totalModules: number;
}

interface StudentScores {
  courses: CourseScore[];
  overallGpa: number;
  totalCoursesEnrolled: number;
  coursesPassed: number;
}

interface UserSubscription {
  tier?: string;
}

interface UserStatsData {
  totalHoursStudied?: string;
  coursesCompleted?: number;
  labsAttended?: number;
  currentLevel?: string;
  xpPoints?: number;
  speakingMinutes?: number;
  vocabularyWords?: number;
}

const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const getLevelLabel = (level: string) => {
  const labels: Record<string, string> = {
    A1: "Beginner",
    A2: "Elementary",
    B1: "Intermediate",
    B2: "Upper Intermediate",
    C1: "Advanced",
    C2: "Mastery",
  };
  return labels[level] || level;
};

export function ProgressTracking() {
  const { user } = useAuth();

  // Fetch student scores from API
  const { data: studentScores, isLoading: scoresLoading } = useQuery<StudentScores>({
    queryKey: ["/api/student/scores"],
  });

  // Fetch user stats (hours, labs, level, xp, etc.)
  const { data: userStats, isLoading: statsLoading } = useQuery<UserStatsData>({
    queryKey: ["/api/user-stats"],
  });

  // Fetch user subscription tier
  const { data: subscription } = useQuery<UserSubscription>({
    queryKey: ["/api/subscription"],
  });

  const isFreeUser = !subscription?.tier || subscription.tier === 'free';

  // Use real data from API — level comes from user-stats (which already resolves placementLevel → currentLevel)
  const currentLevel = userStats?.currentLevel || user?.placementLevel || "A1";
  const currentLevelIndex = levelOrder.indexOf(currentLevel);
  const nextLevel = currentLevelIndex < levelOrder.length - 1 ? levelOrder[currentLevelIndex + 1] : currentLevel;
  const totalXP = userStats?.xpPoints || 0;
  // XP needed per level — simple progression
  const xpPerLevel = 500;
  const xpNeeded = (currentLevelIndex + 1) * xpPerLevel;
  const xpProgress = xpNeeded > 0 ? Math.min(Math.round((totalXP / xpNeeded) * 100), 100) : 0;

  // Real stats from API
  const hoursStudied = userStats?.totalHoursStudied ? parseFloat(userStats.totalHoursStudied) : 0;
  const labsAttended = userStats?.labsAttended || 0;
  const vocabularyWords = userStats?.vocabularyWords || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display uppercase mb-2">Progress & Certificates</h1>
        <p className="font-mono text-muted-foreground">
          Track your learning journey and achievements
        </p>
      </div>
      
      {/* Free User Upgrade Banner */}
      {isFreeUser && (
        <Card className="p-5 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border-primary/20" data-testid="card-analytics-upgrade">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/20 flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-display text-lg uppercase">Advanced Analytics</p>
                <p className="text-sm text-muted-foreground">
                  Upgrade your plan to access skill charts, certificates, and detailed achievements.
                </p>
              </div>
            </div>
            <Link href="/#pricing">
              <Button data-testid="button-upgrade-analytics">
                <Unlock className="w-4 h-4 mr-2" />
                Upgrade Plan
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Level progress */}
      <Card className="p-6 border-border bg-gradient-to-r from-primary/5 to-accent/5">
        {statsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              {/* Current level badge */}
              <div className="w-24 h-24 bg-primary flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-display text-primary-foreground">{currentLevel}</p>
                  <p className="text-xs font-mono text-primary-foreground/70">{getLevelLabel(currentLevel)}</p>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-display uppercase mb-2">Level Progress</h2>
                {totalXP > 0 ? (
                  <>
                    <p className="font-mono text-muted-foreground mb-3">
                      {totalXP} / {xpNeeded} XP to reach {nextLevel}
                    </p>
                    <div className="flex items-center gap-3">
                      <Progress value={xpProgress} className="w-48 h-2" />
                      <span className="text-sm font-mono text-primary">{xpProgress}%</span>
                    </div>
                  </>
                ) : (
                  <p className="font-mono text-muted-foreground mb-3">
                    Current level: <strong className="text-primary">{currentLevel} - {getLevelLabel(currentLevel)}</strong>. Complete courses to earn XP!
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Card className="p-4 border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-accent" />
                  <span className="text-xs font-mono text-muted-foreground">Daily Goal</span>
                </div>
                <p className="text-2xl font-display">30 min</p>
              </Card>
              <Card className="p-4 border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="w-4 h-4 text-accent" />
                  <span className="text-xs font-mono text-muted-foreground">Streak</span>
                </div>
                <p className="text-2xl font-display">0 days</p>
              </Card>
            </div>
          </div>
        )}
      </Card>

      {/* GPA and Course Scores Section */}
      {scoresLoading ? (
        <Card className="p-6 border-border">
          <div className="flex items-center gap-3 mb-6">
            <GraduationCap className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-display uppercase">Course Scores</h3>
          </div>
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent animate-spin" />
          </div>
        </Card>
      ) : studentScores && (studentScores.courses?.length > 0 || studentScores.overallGpa > 0) ? (
        <Card className="p-6 border-border">
          <div className="flex items-center gap-3 mb-6">
            <GraduationCap className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-display uppercase">Course Scores</h3>
          </div>
          
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-xs font-mono text-muted-foreground">Overall GPA</span>
              </div>
              <p className="text-3xl font-display text-primary">{studentScores.overallGpa.toFixed(2)}</p>
              <p className="text-xs font-mono text-muted-foreground">of 4.0</p>
            </Card>
            <Card className="p-4 border-border">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-accent" />
                <span className="text-xs font-mono text-muted-foreground">Courses Enrolled</span>
              </div>
              <p className="text-3xl font-display">{studentScores.totalCoursesEnrolled}</p>
            </Card>
            <Card className="p-4 border-border">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs font-mono text-muted-foreground">Courses Passed</span>
              </div>
              <p className="text-3xl font-display text-green-600">{studentScores.coursesPassed}</p>
            </Card>
            <Card className="p-4 border-border">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-accent" />
                <span className="text-xs font-mono text-muted-foreground">Average</span>
              </div>
              <p className="text-3xl font-display">
                {studentScores.courses?.length > 0 
                  ? Math.round(studentScores.courses.reduce((sum, c) => sum + c.score, 0) / studentScores.courses.length) 
                  : 0}%
              </p>
            </Card>
          </div>
          
          {/* Course breakdown */}
          {studentScores.courses?.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-mono text-muted-foreground uppercase">Course Breakdown</h4>
              {studentScores.courses.map((course) => (
                <div key={course.courseId} className="flex items-center gap-4 p-3 bg-muted/30" data-testid={`score-course-${course.courseId}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{course.courseTitle}</p>
                      <Badge variant="outline" className="text-xs">{course.courseLevel}</Badge>
                      {course.isPassed ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Passed
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          In Progress
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="font-mono">{course.modulesCompleted}/{course.totalModules} modules</span>
                      <span className="font-mono">GPA: {course.gpa.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24">
                      <Progress value={course.score} className="h-2" />
                    </div>
                    <span className="font-mono font-bold text-lg w-12 text-right">{course.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {/* Stats grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-mono text-muted-foreground uppercase">Total Hours</span>
          </div>
          <p className="text-3xl font-display">{statsLoading ? "..." : hoursStudied.toFixed(1)}</p>
        </Card>
        <Card className="p-5 border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-mono text-muted-foreground uppercase">Courses Completed</span>
          </div>
          <p className="text-3xl font-display">{studentScores?.coursesPassed || 0}</p>
        </Card>
        <Card className="p-5 border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-accent/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <span className="text-xs font-mono text-muted-foreground uppercase">Labs Attended</span>
          </div>
          <p className="text-3xl font-display">{statsLoading ? "..." : labsAttended}</p>
        </Card>
        <Card className="p-5 border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-accent/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <span className="text-xs font-mono text-muted-foreground uppercase">Words Learned</span>
          </div>
          <p className="text-3xl font-display">{statsLoading ? "..." : vocabularyWords}</p>
        </Card>
      </div>

      {/* Charts - Preview section */}
      <div className="grid lg:grid-cols-2 gap-6 relative">
        <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm flex items-center justify-center" data-testid="overlay-charts-preview">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <p className="font-display text-lg uppercase mb-2">Coming Soon</p>
            <p className="text-sm text-muted-foreground mb-4">Skill charts and weekly activity will be available soon</p>
            <Badge variant="outline" className="font-mono">Preview</Badge>
          </div>
        </div>
        {/* Skills radar */}
        <Card className="p-6 border-border pointer-events-none opacity-50">
          <h3 className="text-lg font-display uppercase mb-6">Skills Breakdown</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={sampleSkillsData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis 
                  dataKey="skill" 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontFamily: "monospace" }}
                />
                <PolarRadiusAxis 
                  angle={30} 
                  domain={[0, 100]} 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <Radar
                  name="Skills"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm font-mono text-muted-foreground">
              Focus areas: <span className="text-foreground">Writing</span> and <span className="text-foreground">Speaking</span>
            </p>
          </div>
        </Card>

        {/* Weekly activity */}
        <Card className="p-6 border-border pointer-events-none opacity-50">
          <h3 className="text-lg font-display uppercase mb-6">This Week's Activity</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sampleWeeklyProgress}>
                <defs>
                  <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="day" 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontFamily: "monospace" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    fontFamily: "monospace"
                  }}
                  formatter={(value: number) => [`${value} min`, "Study Time"]}
                />
                <Area 
                  type="monotone" 
                  dataKey="minutes" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fill="url(#colorMinutes)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm font-mono text-muted-foreground">
              Total this week: <span className="text-primary font-semibold">7.5 hours</span>
            </p>
          </div>
        </Card>
      </div>

      {/* Achievements - Coming Soon */}
      <div className="relative">
        <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm flex items-center justify-center" data-testid="overlay-achievements-coming-soon">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <p className="font-display text-lg uppercase mb-2">Coming Soon</p>
            <p className="text-sm text-muted-foreground mb-4">Achievements system in development</p>
            <Badge variant="outline" className="font-mono">Preview</Badge>
          </div>
        </div>
        <Card className="p-6 border-border pointer-events-none opacity-50">
          <h3 className="text-lg font-display uppercase mb-6">Achievements</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {achievementDefinitions.map((achievement, index) => (
              <div 
                key={index}
                className="p-4 border border-border opacity-50"
              >
                <div className="w-12 h-12 flex items-center justify-center mb-3 bg-muted text-muted-foreground">
                  <achievement.icon className="w-6 h-6" />
                </div>
                <p className="font-mono font-semibold mb-1">{achievement.title}</p>
                <p className="text-xs font-mono text-muted-foreground">{achievement.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Certificates - Coming Soon */}
      <Card className="p-6 border-border">
        <div className="flex items-center gap-3 mb-6">
          <Award className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-display uppercase">Certificates</h3>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-primary" />
          </div>
          <p className="font-display text-lg uppercase mb-2">Coming Soon</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You'll be able to download and share certificates when you complete courses and levels.
            Keep learning to unlock your first certificates!
          </p>
        </div>
      </Card>
    </div>
  );
}
