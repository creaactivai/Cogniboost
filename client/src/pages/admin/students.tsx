import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Users, Search, BookOpen, Clock, Star } from "lucide-react";
import { useState } from "react";
import type { UserStats, Enrollment } from "@shared/schema";

export default function AdminStudents() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: userStats, isLoading: statsLoading } = useQuery<UserStats[]>({
    queryKey: ["/api/admin/user-stats"],
  });

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery<Enrollment[]>({
    queryKey: ["/api/admin/enrollments"],
  });

  const levelColors: Record<string, string> = {
    A1: "#10B981",
    A2: "#34D399",
    B1: "#33CBFB",
    B2: "#3B82F6",
    C1: "#8B5CF6",
    C2: "#FD335A",
  };

  const filteredStats = userStats?.filter((stat) =>
    stat.userId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout title="Progreso de Estudiantes">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar estudiante..."
              className="pl-10"
              data-testid="input-search-students"
            />
          </div>
          <Badge variant="secondary">
            {userStats?.length || 0} estudiantes
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#33CBFB] flex items-center justify-center">
                <Users className="w-5 h-5 text-black" />
              </div>
              <div>
                <p className="text-2xl font-black" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  {userStats?.length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Total Estudiantes</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#FD335A] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-black" />
              </div>
              <div>
                <p className="text-2xl font-black" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  {enrollments?.length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Inscripciones</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#10B981] flex items-center justify-center">
                <Clock className="w-5 h-5 text-black" />
              </div>
              <div>
                <p className="text-2xl font-black" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  {userStats?.reduce((acc, s) => acc + Number(s.totalHoursStudied || 0), 0).toFixed(0)}h
                </p>
                <p className="text-xs text-muted-foreground">Horas Totales</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#8B5CF6] flex items-center justify-center">
                <Star className="w-5 h-5 text-black" />
              </div>
              <div>
                <p className="text-2xl font-black" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  {userStats?.reduce((acc, s) => acc + (s.coursesCompleted || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Cursos Completados</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <h2 
            className="text-lg font-black mb-4" 
            style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
          >
            Lista de Estudiantes
          </h2>
          
          {statsLoading ? (
            <p className="text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              Cargando estudiantes...
            </p>
          ) : filteredStats?.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                No hay estudiantes registrados todavía
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStats?.map((stat) => (
                <div
                  key={stat.id}
                  className="flex items-center justify-between p-4 bg-muted/50 hover-elevate"
                  data-testid={`student-row-${stat.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#33CBFB] flex items-center justify-center">
                      <span className="font-black text-black">
                        {stat.userId.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {stat.userId.substring(0, 8)}...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {stat.xpPoints} XP · {stat.vocabularyWords} palabras
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-sm font-bold">{Number(stat.totalHoursStudied || 0).toFixed(1)}h</p>
                      <p className="text-xs text-muted-foreground">Estudiado</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold">{stat.coursesCompleted}</p>
                      <p className="text-xs text-muted-foreground">Cursos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold">{stat.labsAttended}</p>
                      <p className="text-xs text-muted-foreground">Labs</p>
                    </div>
                    <Badge
                      style={{ backgroundColor: levelColors[stat.currentLevel] || '#33CBFB' }}
                    >
                      {stat.currentLevel}
                    </Badge>
                    <div className="w-32">
                      <Progress value={(stat.xpPoints % 1000) / 10} className="h-2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
