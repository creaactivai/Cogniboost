import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, BookOpen, Calendar, DollarSign } from "lucide-react";
import type { Course } from "@shared/schema";

interface AdminStats {
  totalStudents: number;
  totalCourses: number;
  totalLabs: number;
  totalRevenue: string;
  activeSubscriptions: number;
}

export default function AdminOverview() {
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: courses, isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/admin/courses"],
  });

  const statCards = [
    {
      title: "Estudiantes Totales",
      value: stats?.totalStudents || 0,
      icon: Users,
      bgColor: "bg-success",
      textColor: "text-success-foreground",
    },
    {
      title: "Cursos Activos",
      value: stats?.totalCourses || 0,
      icon: BookOpen,
      bgColor: "bg-primary",
      textColor: "text-primary-foreground",
    },
    {
      title: "Laboratorios",
      value: stats?.totalLabs || 0,
      icon: Calendar,
      bgColor: "bg-accent",
      textColor: "text-accent-foreground",
    },
    {
      title: "Ingresos Totales",
      value: `$${Number(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      bgColor: "bg-success",
      textColor: "text-success-foreground",
    },
  ];

  return (
    <AdminLayout title="Panel General">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <Card key={index} className="p-4" data-testid={`card-stat-${index}`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 flex items-center justify-center ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
                </div>
              </div>
              <p 
                className="text-2xl font-display uppercase tracking-tight mb-1" 
                data-testid={`text-stat-value-${index}`}
              >
                {statsLoading ? "..." : stat.value}
              </p>
              <p className="text-sm font-mono text-muted-foreground">
                {stat.title}
              </p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-4">
              <h2 className="text-lg font-display uppercase tracking-tight mb-4">
                Cursos Recientes
              </h2>
              <div className="space-y-3">
                {coursesLoading ? (
                  <p className="font-mono text-muted-foreground">
                    Cargando cursos...
                  </p>
                ) : courses?.length === 0 ? (
                  <p className="font-mono text-muted-foreground">
                    No hay cursos todavía
                  </p>
                ) : (
                  courses?.slice(0, 5).map((course) => (
                    <div 
                      key={course.id} 
                      className="flex items-center justify-between p-3 bg-muted/50 hover-elevate"
                      data-testid={`course-item-${course.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center bg-primary">
                          <BookOpen className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                          <p className="font-mono font-medium">
                            {course.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Nivel {course.level}
                          </p>
                        </div>
                      </div>
                      <Badge variant={course.isPublished ? "default" : "secondary"}>
                        {course.isPublished ? "Publicado" : "Borrador"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <div>
            <Card className="p-4">
              <h2 className="text-lg font-display uppercase tracking-tight mb-4">
                Suscripciones
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-mono">
                      Suscripciones Activas
                    </span>
                    <span className="font-bold" data-testid="text-active-subs">
                      {stats?.activeSubscriptions || 0}
                    </span>
                  </div>
                  <Progress value={stats?.activeSubscriptions ? 100 : 0} className="h-2" />
                </div>
                {stats?.activeSubscriptions === 0 && (
                  <p className="text-sm font-mono text-muted-foreground text-center py-2">
                    Sin suscriptores aún
                  </p>
                )}
              </div>
            </Card>

            <Card className="p-4 mt-4">
              <h2 className="text-lg font-display uppercase tracking-tight mb-4">
                Laboratorios en Vivo
              </h2>
              <div className="space-y-2">
                <div className="p-2 bg-muted/50 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-success" />
                  <span className="text-sm font-mono">
                    {stats?.totalLabs || 0} sesiones configuradas
                  </span>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Ver calendario completo en Labs
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
