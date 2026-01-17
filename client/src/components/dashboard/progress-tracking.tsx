import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Clock, 
  BookOpen, 
  Users, 
  Award,
  Download,
  Share2,
  Flame,
  Target,
  Zap
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

// Mock data
const skillsData = [
  { skill: "Hablar", value: 70, fullMark: 100 },
  { skill: "Escuchar", value: 85, fullMark: 100 },
  { skill: "Leer", value: 90, fullMark: 100 },
  { skill: "Escribir", value: 65, fullMark: 100 },
  { skill: "Vocabulario", value: 75, fullMark: 100 },
  { skill: "Gramática", value: 80, fullMark: 100 },
];

const weeklyProgress = [
  { day: "Lun", minutes: 45 },
  { day: "Mar", minutes: 60 },
  { day: "Mié", minutes: 30 },
  { day: "Jue", minutes: 90 },
  { day: "Vie", minutes: 45 },
  { day: "Sáb", minutes: 120 },
  { day: "Dom", minutes: 60 },
];

const certificates = [
  {
    id: "1",
    title: "Nivel A2 Completado",
    issueDate: "15 de Octubre, 2024",
    credential: "CB-A2-2024-001234",
  },
  {
    id: "2",
    title: "Fundamentos de Inglés de Negocios",
    issueDate: "20 de Noviembre, 2024",
    credential: "CB-BEF-2024-001567",
  },
  {
    id: "3",
    title: "Nivel B1 Completado",
    issueDate: "10 de Enero, 2025",
    credential: "CB-B1-2025-000234",
  },
];

const achievements = [
  { icon: Flame, title: "Racha de 7 Días", description: "Estudia 7 días seguidos", unlocked: true },
  { icon: Users, title: "Asistente Regular", description: "Asiste a 10 labs de conversación", unlocked: true },
  { icon: BookOpen, title: "Maestro de Cursos", description: "Completa 5 cursos", unlocked: false },
  { icon: Zap, title: "Aprendiz Veloz", description: "Termina un curso en una semana", unlocked: true },
];

export function ProgressTracking() {
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
          <p className="text-3xl font-display">3</p>
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

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Skills radar */}
        <Card className="p-6 border-border">
          <h3 className="text-lg font-display uppercase mb-6">Desglose de Habilidades</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={skillsData}>
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
        <Card className="p-6 border-border">
          <h3 className="text-lg font-display uppercase mb-6">Actividad de Esta Semana</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyProgress}>
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

      {/* Achievements */}
      <Card className="p-6 border-border">
        <h3 className="text-lg font-display uppercase mb-6">Logros</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {achievements.map((achievement, index) => (
            <div 
              key={index}
              className={`p-4 border ${achievement.unlocked ? "border-primary bg-primary/5" : "border-border opacity-50"}`}
            >
              <div className={`w-12 h-12 flex items-center justify-center mb-3 ${achievement.unlocked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <achievement.icon className="w-6 h-6" />
              </div>
              <p className="font-mono font-semibold mb-1">{achievement.title}</p>
              <p className="text-xs font-mono text-muted-foreground">{achievement.description}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Certificates */}
      <Card className="p-6 border-border">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-display uppercase">Certificados</h3>
          <span className="text-sm font-mono text-muted-foreground">{certificates.length} obtenidos</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {certificates.map((cert) => (
            <div key={cert.id} className="p-5 border border-border bg-gradient-to-br from-primary/5 to-accent/5 hover-elevate">
              <div className="w-12 h-12 bg-primary flex items-center justify-center mb-4">
                <Award className="w-6 h-6 text-primary-foreground" />
              </div>
              <h4 className="font-mono font-semibold mb-1">{cert.title}</h4>
              <p className="text-xs font-mono text-muted-foreground mb-3">
                Emitido: {cert.issueDate}
              </p>
              <p className="text-xs font-mono text-muted-foreground mb-4">
                Credencial: {cert.credential}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 font-mono text-xs" data-testid={`button-download-${cert.id}`}>
                  <Download className="w-3 h-3 mr-1" />
                  Descargar
                </Button>
                <Button variant="outline" size="sm" className="flex-1 font-mono text-xs" data-testid={`button-share-${cert.id}`}>
                  <Share2 className="w-3 h-3 mr-1" />
                  Compartir
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
