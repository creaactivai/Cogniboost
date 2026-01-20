import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
  Unlock
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
  { skill: "Hablar", value: 70, fullMark: 100 },
  { skill: "Escuchar", value: 85, fullMark: 100 },
  { skill: "Leer", value: 90, fullMark: 100 },
  { skill: "Escribir", value: 65, fullMark: 100 },
  { skill: "Vocabulario", value: 75, fullMark: 100 },
  { skill: "Gramática", value: 80, fullMark: 100 },
];

const sampleWeeklyProgress = [
  { day: "Lun", minutes: 45 },
  { day: "Mar", minutes: 60 },
  { day: "Mié", minutes: 30 },
  { day: "Jue", minutes: 90 },
  { day: "Vie", minutes: 45 },
  { day: "Sáb", minutes: 120 },
  { day: "Dom", minutes: 60 },
];

// Achievement definitions (system tracks unlock status from user activity)
const achievementDefinitions = [
  { icon: Flame, id: "streak_7", title: "Racha de 7 Días", description: "Estudia 7 días seguidos" },
  { icon: Users, id: "labs_10", title: "Asistente Regular", description: "Asiste a 10 labs de conversación" },
  { icon: BookOpen, id: "courses_5", title: "Maestro de Cursos", description: "Completa 5 cursos" },
  { icon: Zap, id: "fast_learner", title: "Aprendiz Veloz", description: "Termina un curso en una semana" },
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

export function ProgressTracking() {
  // Fetch student scores from API
  const { data: studentScores, isLoading: scoresLoading } = useQuery<StudentScores>({
    queryKey: ["/api/student/scores"],
  });
  
  // Fetch user subscription tier
  const { data: subscription } = useQuery<UserSubscription>({
    queryKey: ["/api/subscription"],
  });
  
  const isFreeUser = !subscription?.tier || subscription.tier === 'free';
  
  const currentLevel = "B1";
  const nextLevel = "B2";
  const xpProgress = 65; // % towards next level
  const totalXP = 2450;
  const xpNeeded = 3000;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display uppercase mb-2">Progreso y Certificados</h1>
        <p className="font-mono text-muted-foreground">
          Sigue tu camino de aprendizaje y logros
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
                <p className="font-display text-lg uppercase">Analíticas Avanzadas</p>
                <p className="text-sm text-muted-foreground">
                  Actualiza tu plan para acceder a gráficos de habilidades, certificados y logros detallados.
                </p>
              </div>
            </div>
            <Link href="/#pricing">
              <Button data-testid="button-upgrade-analytics">
                <Unlock className="w-4 h-4 mr-2" />
                Actualizar Plan
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Level progress */}
      <Card className="p-6 border-border bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            {/* Current level badge */}
            <div className="w-24 h-24 bg-primary flex items-center justify-center">
              <div className="text-center">
                <p className="text-3xl font-display text-primary-foreground">{currentLevel}</p>
                <p className="text-xs font-mono text-primary-foreground/70">NIVEL</p>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-display uppercase mb-2">Progreso de Nivel</h2>
              <p className="font-mono text-muted-foreground mb-3">
                {totalXP} / {xpNeeded} XP para alcanzar {nextLevel}
              </p>
              <div className="flex items-center gap-3">
                <Progress value={xpProgress} className="w-48 h-2" />
                <span className="text-sm font-mono text-primary">{xpProgress}%</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Card className="p-4 border-border">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-accent" />
                <span className="text-xs font-mono text-muted-foreground">Meta Diaria</span>
              </div>
              <p className="text-2xl font-display">30 min</p>
            </Card>
            <Card className="p-4 border-border">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-accent" />
                <span className="text-xs font-mono text-muted-foreground">Racha</span>
              </div>
              <p className="text-2xl font-display">7 días</p>
            </Card>
          </div>
        </div>
      </Card>

      {/* GPA and Course Scores Section */}
      {scoresLoading ? (
        <Card className="p-6 border-border">
          <div className="flex items-center gap-3 mb-6">
            <GraduationCap className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-display uppercase">Puntuaciones de Cursos</h3>
          </div>
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent animate-spin" />
          </div>
        </Card>
      ) : studentScores && (studentScores.courses?.length > 0 || studentScores.overallGpa > 0) ? (
        <Card className="p-6 border-border">
          <div className="flex items-center gap-3 mb-6">
            <GraduationCap className="w-6 h-6 text-primary" />
            <h3 className="text-lg font-display uppercase">Puntuaciones de Cursos</h3>
          </div>
          
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-xs font-mono text-muted-foreground">GPA Global</span>
              </div>
              <p className="text-3xl font-display text-primary">{studentScores.overallGpa.toFixed(2)}</p>
              <p className="text-xs font-mono text-muted-foreground">de 4.0</p>
            </Card>
            <Card className="p-4 border-border">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-accent" />
                <span className="text-xs font-mono text-muted-foreground">Cursos Inscritos</span>
              </div>
              <p className="text-3xl font-display">{studentScores.totalCoursesEnrolled}</p>
            </Card>
            <Card className="p-4 border-border">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs font-mono text-muted-foreground">Cursos Aprobados</span>
              </div>
              <p className="text-3xl font-display text-green-600">{studentScores.coursesPassed}</p>
            </Card>
            <Card className="p-4 border-border">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-accent" />
                <span className="text-xs font-mono text-muted-foreground">Promedio</span>
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
              <h4 className="text-sm font-mono text-muted-foreground uppercase">Desglose por Curso</h4>
              {studentScores.courses.map((course) => (
                <div key={course.courseId} className="flex items-center gap-4 p-3 bg-muted/30" data-testid={`score-course-${course.courseId}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{course.courseTitle}</p>
                      <Badge variant="outline" className="text-xs">{course.courseLevel}</Badge>
                      {course.isPassed ? (
                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Aprobado
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          En progreso
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="font-mono">{course.modulesCompleted}/{course.totalModules} módulos</span>
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
            <span className="text-xs font-mono text-muted-foreground uppercase">Horas Totales</span>
          </div>
          <p className="text-3xl font-display">24.5</p>
        </Card>
        <Card className="p-5 border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-mono text-muted-foreground uppercase">Cursos Hechos</span>
          </div>
          <p className="text-3xl font-display">{studentScores?.coursesPassed || 0}</p>
        </Card>
        <Card className="p-5 border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-accent/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <span className="text-xs font-mono text-muted-foreground uppercase">Labs Asistidos</span>
          </div>
          <p className="text-3xl font-display">12</p>
        </Card>
        <Card className="p-5 border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-accent/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <span className="text-xs font-mono text-muted-foreground uppercase">Palabras Aprendidas</span>
          </div>
          <p className="text-3xl font-display">847</p>
        </Card>
      </div>

      {/* Charts - Preview section */}
      <div className="grid lg:grid-cols-2 gap-6 relative">
        <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm flex items-center justify-center" data-testid="overlay-charts-preview">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <p className="font-display text-lg uppercase mb-2">Próximamente</p>
            <p className="text-sm text-muted-foreground mb-4">Gráficos de habilidades y actividad semanal estarán disponibles pronto</p>
            <Badge variant="outline" className="font-mono">Vista Previa</Badge>
          </div>
        </div>
        {/* Skills radar */}
        <Card className="p-6 border-border pointer-events-none opacity-50">
          <h3 className="text-lg font-display uppercase mb-6">Desglose de Habilidades</h3>
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
                  name="Habilidades"
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
              Áreas de enfoque: <span className="text-foreground">Escritura</span> y <span className="text-foreground">Habla</span>
            </p>
          </div>
        </Card>

        {/* Weekly activity */}
        <Card className="p-6 border-border pointer-events-none opacity-50">
          <h3 className="text-lg font-display uppercase mb-6">Actividad de Esta Semana</h3>
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
                  formatter={(value: number) => [`${value} min`, "Tiempo de Estudio"]}
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
              Total esta semana: <span className="text-primary font-semibold">7.5 horas</span>
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
            <p className="font-display text-lg uppercase mb-2">Próximamente</p>
            <p className="text-sm text-muted-foreground mb-4">Sistema de logros en desarrollo</p>
            <Badge variant="outline" className="font-mono">Vista Previa</Badge>
          </div>
        </div>
        <Card className="p-6 border-border pointer-events-none opacity-50">
          <h3 className="text-lg font-display uppercase mb-6">Logros</h3>
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
          <h3 className="text-lg font-display uppercase">Certificados</h3>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-primary" />
          </div>
          <p className="font-display text-lg uppercase mb-2">Próximamente</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Podrás descargar y compartir certificados cuando completes cursos y niveles. 
            ¡Sigue aprendiendo para desbloquear tus primeros certificados!
          </p>
        </div>
      </Card>
    </div>
  );
}
