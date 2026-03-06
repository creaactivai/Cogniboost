import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  CheckCircle,
  XCircle,
  GraduationCap,
  Award,
  Eye,
} from "lucide-react";

interface StudentProgress {
  student: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    status: string;
    englishLevel: string | null;
    createdAt: string | null;
    subscriptionTier: string | null;
  };
  stats: {
    totalHoursStudied: string;
    coursesCompleted: number;
    labsAttended: number;
    currentLevel: string;
    xpPoints: number;
  } | null;
  courseProgress: Array<{
    courseId: string;
    courseTitle: string;
    courseLevel: string;
    enrolledAt: string;
    completedAt: string | null;
    totalLessons: number;
    completedLessons: number;
    progressPercent: number;
  }>;
  quizAttempts: Array<{
    id: string;
    quizId: string;
    quizTitle: string;
    quizType: string;
    attemptNumber: number;
    score: number;
    isPassed: boolean;
    completedAt: string;
  }>;
  lessonProgress: Array<{
    id: string;
    lessonId: string;
    lessonTitle: string;
    isCompleted: boolean;
    quizPassed: boolean;
    watchedSeconds: number;
    lastWatchedAt: string | null;
  }>;
}

export default function AdminStudentDetail() {
  const { id: studentId } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery<StudentProgress>({
    queryKey: [`/api/admin/students/${studentId}/progress`],
    enabled: !!studentId,
  });

  if (isLoading) {
    return (
      <AdminLayout title="Cargando...">
        <p className="text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          Cargando progreso del estudiante...
        </p>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout title="Estudiante no encontrado">
        <Card className="p-8 text-center">
          <p style={{ fontFamily: 'JetBrains Mono, monospace' }}>El estudiante no existe.</p>
          <Link href="/admin/students">
            <Button className="mt-4" variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Estudiantes
            </Button>
          </Link>
        </Card>
      </AdminLayout>
    );
  }

  const { student, stats, courseProgress, quizAttempts, lessonProgress } = data;
  const studentName = student.firstName
    ? `${student.firstName} ${student.lastName || ""}`.trim()
    : student.email || student.id;

  const statusColors: Record<string, string> = {
    active: "#10B981",
    hold: "#F59E0B",
    inactive: "#EF4444",
  };

  const levelColors: Record<string, string> = {
    A1: "#10B981",
    A2: "#34D399",
    B1: "#33CBFB",
    B2: "#3B82F6",
    C1: "#8B5CF6",
    C2: "#FD335A",
  };

  const tierNames: Record<string, string> = {
    free: "Free",
    flex: "Flex ($14.99)",
    basic: "Standard ($49.99)",
    premium: "Premium ($99.99)",
  };

  return (
    <AdminLayout title={`Progreso: ${studentName}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin/students">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
              {studentName}
            </h2>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {student.email} · Desde {student.createdAt ? new Date(student.createdAt).toLocaleDateString('es-ES') : 'N/A'}
            </p>
          </div>
          <Badge style={{ backgroundColor: statusColors[student.status] || '#6B7280' }} className="text-black">
            {student.status === 'active' ? 'Activo' : student.status === 'hold' ? 'En espera' : 'Inactivo'}
          </Badge>
          {student.englishLevel && (
            <Badge style={{ backgroundColor: levelColors[student.englishLevel] || '#33CBFB' }}>
              {student.englishLevel}
            </Badge>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" style={{ color: '#33CBFB' }} />
              <div>
                <p className="text-xl font-black" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  {stats ? Number(stats.totalHoursStudied || 0).toFixed(1) : '0'}h
                </p>
                <p className="text-xs text-muted-foreground">Horas Estudiadas</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5" style={{ color: '#10B981' }} />
              <div>
                <p className="text-xl font-black" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  {courseProgress.length}
                </p>
                <p className="text-xs text-muted-foreground">Cursos Inscritos</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5" style={{ color: '#10B981' }} />
              <div>
                <p className="text-xl font-black" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  {lessonProgress.filter(lp => lp.isCompleted).length}
                </p>
                <p className="text-xs text-muted-foreground">Lecciones Completadas</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5" style={{ color: '#FD335A' }} />
              <div>
                <p className="text-xl font-black" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  {quizAttempts.length}
                </p>
                <p className="text-xs text-muted-foreground">Quizzes Tomados</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-5 h-5" style={{ color: '#8B5CF6' }} />
              <div>
                <p className="text-xl font-black" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  {tierNames[student.subscriptionTier || 'free'] || 'Free'}
                </p>
                <p className="text-xs text-muted-foreground">Plan</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Course Progress */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
            Progreso por Curso
          </h3>
          {courseProgress.length === 0 ? (
            <p className="text-muted-foreground text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              No está inscrito en ningún curso.
            </p>
          ) : (
            <div className="space-y-4">
              {courseProgress.map((cp) => (
                <div key={cp.courseId} className="p-4 bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {cp.courseTitle}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Nivel {cp.courseLevel} · Inscrito: {new Date(cp.enrolledAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold" style={{ color: cp.progressPercent === 100 ? '#10B981' : '#33CBFB' }}>
                        {cp.progressPercent}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cp.completedLessons}/{cp.totalLessons} lecciones
                      </p>
                    </div>
                  </div>
                  <Progress value={cp.progressPercent} className="h-2" />
                  {cp.completedAt && (
                    <Badge variant="default" className="text-xs" style={{ backgroundColor: '#10B981' }}>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Completado: {new Date(cp.completedAt).toLocaleDateString('es-ES')}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quiz Attempts */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
            Historial de Quizzes
          </h3>
          {quizAttempts.length === 0 ? (
            <p className="text-muted-foreground text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              No ha tomado ningún quiz.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-4 text-xs font-bold text-muted-foreground pb-2 border-b" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                <span>Quiz</span>
                <span>Tipo</span>
                <span>Puntuación</span>
                <span>Resultado</span>
                <span>Fecha</span>
              </div>
              {quizAttempts.map((attempt) => (
                <div key={attempt.id} className="grid grid-cols-5 gap-4 items-center p-2 bg-muted/30 text-sm">
                  <span className="truncate" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {attempt.quizTitle}
                  </span>
                  <Badge variant="secondary" className="text-xs w-fit">
                    {attempt.quizType === 'ai' ? 'IA' : 'Manual'}
                  </Badge>
                  <span className="font-bold" style={{ color: attempt.score >= 70 ? '#10B981' : '#EF4444' }}>
                    {attempt.score}%
                  </span>
                  <span>
                    {attempt.isPassed ? (
                      <Badge className="text-xs" style={{ backgroundColor: '#10B981' }}>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Aprobado
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        <XCircle className="w-3 h-3 mr-1" />
                        No aprobado
                      </Badge>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(attempt.completedAt).toLocaleDateString('es-ES')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Lesson Activity */}
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
            Actividad de Lecciones
          </h3>
          {lessonProgress.length === 0 ? (
            <p className="text-muted-foreground text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              No ha abierto ninguna lección.
            </p>
          ) : (
            <div className="space-y-1">
              <div className="grid grid-cols-4 gap-4 text-xs font-bold text-muted-foreground pb-2 border-b" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                <span>Lección</span>
                <span>Tiempo</span>
                <span>Estado</span>
                <span>Última vez</span>
              </div>
              {lessonProgress
                .sort((a, b) => {
                  const dateA = a.lastWatchedAt ? new Date(a.lastWatchedAt).getTime() : 0;
                  const dateB = b.lastWatchedAt ? new Date(b.lastWatchedAt).getTime() : 0;
                  return dateB - dateA;
                })
                .map((lp) => (
                <div key={lp.id} className="grid grid-cols-4 gap-4 items-center p-2 bg-muted/30 text-sm">
                  <span className="text-xs truncate" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {lp.lessonTitle}
                  </span>
                  <span className="text-xs">
                    {Math.round((lp.watchedSeconds || 0) / 60)} min
                  </span>
                  <span>
                    {lp.isCompleted ? (
                      <Badge className="text-xs" style={{ backgroundColor: '#10B981' }}>Completada</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        <Eye className="w-3 h-3 mr-1" />
                        En progreso
                      </Badge>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {lp.lastWatchedAt ? new Date(lp.lastWatchedAt).toLocaleDateString('es-ES') : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
