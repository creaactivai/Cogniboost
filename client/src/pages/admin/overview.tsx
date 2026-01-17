import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, BookOpen, Calendar, DollarSign, TrendingUp } from "lucide-react";
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
      color: "#33CBFB",
      change: "+12%",
    },
    {
      title: "Cursos Activos",
      value: stats?.totalCourses || 0,
      icon: BookOpen,
      color: "#FD335A",
      change: "+3",
    },
    {
      title: "Laboratorios",
      value: stats?.totalLabs || 0,
      icon: Calendar,
      color: "#33CBFB",
      change: "+5",
    },
    {
      title: "Ingresos Totales",
      value: `$${Number(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "#10B981",
      change: "+18%",
    },
  ];

  return (
    <AdminLayout title="Panel General">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <Card key={index} className="p-4" data-testid={`card-stat-${index}`}>
              <div className="flex items-center justify-between mb-3">
                <div 
                  className="w-10 h-10 flex items-center justify-center"
                  style={{ backgroundColor: stat.color }}
                >
                  <stat.icon className="w-5 h-5 text-black" />
                </div>
                <Badge variant="secondary" className="text-xs" data-testid={`badge-change-${index}`}>
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {stat.change}
                </Badge>
              </div>
              <p 
                className="text-2xl font-black mb-1" 
                style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
                data-testid={`text-stat-value-${index}`}
              >
                {statsLoading ? "..." : stat.value}
              </p>
              <p 
                className="text-sm text-muted-foreground"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {stat.title}
              </p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-4">
              <h2 
                className="text-lg font-black mb-4" 
                style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
              >
                Cursos Recientes
              </h2>
              <div className="space-y-3">
                {coursesLoading ? (
                  <p className="text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    Cargando cursos...
                  </p>
                ) : courses?.length === 0 ? (
                  <p className="text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
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
                        <div 
                          className="w-10 h-10 flex items-center justify-center"
                          style={{ backgroundColor: '#33CBFB' }}
                        >
                          <BookOpen className="w-5 h-5 text-black" />
                        </div>
                        <div>
                          <p className="font-medium" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {course.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Nivel {course.level}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={course.isPublished ? "default" : "secondary"}
                        style={{ backgroundColor: course.isPublished ? '#33CBFB' : undefined }}
                      >
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
              <h2 
                className="text-lg font-black mb-4" 
                style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
              >
                Suscripciones
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-sm">
                      Suscripciones Activas
                    </span>
                    <span className="font-bold" data-testid="text-active-subs">
                      {stats?.activeSubscriptions || 0}
                    </span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-muted/50">
                    <p className="text-lg font-black" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                      65%
                    </p>
                    <p className="text-xs text-muted-foreground">Gratis</p>
                  </div>
                  <div className="p-2 bg-muted/50">
                    <p className="text-lg font-black" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                      25%
                    </p>
                    <p className="text-xs text-muted-foreground">Estándar</p>
                  </div>
                  <div className="p-2 bg-muted/50">
                    <p className="text-lg font-black" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                      10%
                    </p>
                    <p className="text-xs text-muted-foreground">Prémium</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-4 mt-4">
              <h2 
                className="text-lg font-black mb-4" 
                style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
              >
                Próximos Labs
              </h2>
              <div className="space-y-2">
                <div className="p-2 bg-muted/50 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#33CBFB]" />
                  <span className="text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    Hoy - 3 sesiones
                  </span>
                </div>
                <div className="p-2 bg-muted/50 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#FD335A]" />
                  <span className="text-sm" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    Mañana - 5 sesiones
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
