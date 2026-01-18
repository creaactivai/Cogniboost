import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, Search, BookOpen, Clock, Star, Lock, Unlock, TrendingDown, UserCheck, UserX, AlertTriangle } from "lucide-react";
import { useState } from "react";
import type { UserStats, Enrollment } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  isAdmin: boolean;
  status: 'active' | 'hold' | 'inactive';
  isLocked: boolean;
  lockedAt: string | null;
  lockedReason: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface StudentMetrics {
  totalStudents: number;
  activeStudents: number;
  holdStudents: number;
  inactiveStudents: number;
  churnRate: number;
  newStudentsThisMonth: number;
  churnedThisMonth: number;
}

type StatusTab = 'all' | 'active' | 'hold' | 'inactive';

const statusLabels: Record<string, string> = {
  active: "Activo",
  hold: "En espera",
  inactive: "Inactivo",
};

const statusColors: Record<string, string> = {
  active: "#10B981",
  hold: "#F59E0B",
  inactive: "#EF4444",
};

export default function AdminStudents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [lockReason, setLockReason] = useState("");
  const { toast } = useToast();

  const { data: metrics, isLoading: metricsLoading } = useQuery<StudentMetrics>({
    queryKey: ["/api/admin/students/metrics"],
  });

  const { data: students, isLoading: studentsLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/students", activeTab === 'all' ? undefined : activeTab],
    queryFn: async () => {
      const url = activeTab === 'all' 
        ? '/api/admin/students' 
        : `/api/admin/students?status=${activeTab}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to fetch students");
      return res.json();
    }
  });

  const { data: userStats, isLoading: statsLoading } = useQuery<UserStats[]>({
    queryKey: ["/api/admin/user-stats"],
  });

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery<Enrollment[]>({
    queryKey: ["/api/admin/enrollments"],
  });

  const lockMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      return apiRequest('POST', `/api/admin/students/${userId}/lock`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students/metrics"] });
      toast({ title: "Estudiante bloqueado", description: "El acceso del estudiante ha sido bloqueado." });
      setLockDialogOpen(false);
      setSelectedStudent(null);
      setLockReason("");
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo bloquear al estudiante.", variant: "destructive" });
    }
  });

  const unlockMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest('POST', `/api/admin/students/${userId}/unlock`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students/metrics"] });
      toast({ title: "Estudiante desbloqueado", description: "El acceso del estudiante ha sido restaurado." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo desbloquear al estudiante.", variant: "destructive" });
    }
  });

  const levelColors: Record<string, string> = {
    A1: "#10B981",
    A2: "#34D399",
    B1: "#33CBFB",
    B2: "#3B82F6",
    C1: "#8B5CF6",
    C2: "#FD335A",
  };

  const filteredStudents = students?.filter((student) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      student.email?.toLowerCase().includes(searchLower) ||
      student.firstName?.toLowerCase().includes(searchLower) ||
      student.lastName?.toLowerCase().includes(searchLower) ||
      student.id.toLowerCase().includes(searchLower)
    );
  });

  const getUserStat = (userId: string) => {
    return userStats?.find(s => s.userId === userId);
  };

  const handleLockClick = (student: User) => {
    setSelectedStudent(student);
    setLockDialogOpen(true);
  };

  const handleConfirmLock = () => {
    if (selectedStudent) {
      lockMutation.mutate({ userId: selectedStudent.id, reason: lockReason });
    }
  };

  const tabItems: { key: StatusTab; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: metrics?.totalStudents || 0 },
    { key: 'active', label: 'Activos', count: metrics?.activeStudents || 0 },
    { key: 'hold', label: 'En Espera', count: metrics?.holdStudents || 0 },
    { key: 'inactive', label: 'Inactivos', count: metrics?.inactiveStudents || 0 },
  ];

  return (
    <AdminLayout title="Gestión de Estudiantes">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#33CBFB] flex items-center justify-center">
                <Users className="w-5 h-5 text-black" />
              </div>
              <div>
                <p className="text-2xl font-black" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }} data-testid="text-total-students">
                  {metricsLoading ? "..." : metrics?.totalStudents || 0}
                </p>
                <p className="text-xs text-muted-foreground">Total Estudiantes</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#10B981] flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-black" />
              </div>
              <div>
                <p className="text-2xl font-black" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }} data-testid="text-active-students">
                  {metricsLoading ? "..." : metrics?.activeStudents || 0}
                </p>
                <p className="text-xs text-muted-foreground">Activos</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#F59E0B] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-black" />
              </div>
              <div>
                <p className="text-2xl font-black" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }} data-testid="text-hold-students">
                  {metricsLoading ? "..." : metrics?.holdStudents || 0}
                </p>
                <p className="text-xs text-muted-foreground">En Espera</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#FD335A] flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-black" />
              </div>
              <div>
                <p className="text-2xl font-black" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }} data-testid="text-churn-rate">
                  {metricsLoading ? "..." : `${metrics?.churnRate || 0}%`}
                </p>
                <p className="text-xs text-muted-foreground">Tasa de Abandono</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#10B981] flex items-center justify-center">
                <Star className="w-4 h-4 text-black" />
              </div>
              <div>
                <p className="text-lg font-black" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  +{metrics?.newStudentsThisMonth || 0}
                </p>
                <p className="text-xs text-muted-foreground">Nuevos este mes</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#EF4444] flex items-center justify-center">
                <UserX className="w-4 h-4 text-black" />
              </div>
              <div>
                <p className="text-lg font-black" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  {metrics?.churnedThisMonth || 0}
                </p>
                <p className="text-xs text-muted-foreground">Abandonaron este mes</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#8B5CF6] flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-black" />
              </div>
              <div>
                <p className="text-lg font-black" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  {enrollments?.length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Inscripciones Totales</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex gap-1">
            {tabItems.map(tab => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab.key)}
                className="gap-2"
                data-testid={`tab-${tab.key}`}
              >
                {tab.label}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {tab.count}
                </Badge>
              </Button>
            ))}
          </div>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              className="pl-10"
              data-testid="input-search-students"
            />
          </div>
        </div>

        <Card className="p-4">
          <h2 
            className="text-lg font-black mb-4" 
            style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
          >
            Lista de Estudiantes
          </h2>
          
          {studentsLoading ? (
            <p className="text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              Cargando estudiantes...
            </p>
          ) : filteredStudents?.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                No hay estudiantes en esta categoría
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStudents?.map((student) => {
                const stat = getUserStat(student.id);
                return (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 bg-muted/50 hover-elevate"
                    data-testid={`student-row-${student.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-10 h-10 flex items-center justify-center"
                        style={{ backgroundColor: statusColors[student.status] }}
                      >
                        <span className="font-black text-black">
                          {(student.firstName || student.email || student.id).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {student.firstName && student.lastName 
                              ? `${student.firstName} ${student.lastName}`
                              : student.email || student.id.substring(0, 12) + '...'}
                          </p>
                          {student.isLocked && (
                            <Badge variant="destructive" className="text-xs">
                              <Lock className="w-3 h-3 mr-1" />
                              Bloqueado
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {student.email || 'Sin correo'} · Desde {student.createdAt ? new Date(student.createdAt).toLocaleDateString('es-ES') : 'N/A'}
                        </p>
                        {student.lockedReason && (
                          <p className="text-xs text-destructive mt-1">
                            Razón: {student.lockedReason}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {stat && (
                        <>
                          <div className="text-center">
                            <p className="text-sm font-bold">{Number(stat.totalHoursStudied || 0).toFixed(1)}h</p>
                            <p className="text-xs text-muted-foreground">Estudiado</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold">{stat.coursesCompleted}</p>
                            <p className="text-xs text-muted-foreground">Cursos</p>
                          </div>
                          <Badge
                            style={{ backgroundColor: levelColors[stat.currentLevel] || '#33CBFB' }}
                          >
                            {stat.currentLevel}
                          </Badge>
                        </>
                      )}
                      
                      <Badge 
                        style={{ backgroundColor: statusColors[student.status] }}
                        className="text-black"
                      >
                        {statusLabels[student.status]}
                      </Badge>

                      {student.isLocked ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => unlockMutation.mutate(student.id)}
                          disabled={unlockMutation.isPending}
                          data-testid={`button-unlock-${student.id}`}
                        >
                          <Unlock className="w-4 h-4 text-green-500" />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleLockClick(student)}
                          data-testid={`button-lock-${student.id}`}
                        >
                          <Lock className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Dialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
              Bloquear Estudiante
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas bloquear el acceso de{' '}
              <strong>
                {selectedStudent?.firstName 
                  ? `${selectedStudent.firstName} ${selectedStudent.lastName || ''}`
                  : selectedStudent?.email || selectedStudent?.id}
              </strong>
              ? El estudiante no podrá acceder a la plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Razón del bloqueo (opcional)
            </label>
            <Textarea
              value={lockReason}
              onChange={(e) => setLockReason(e.target.value)}
              placeholder="Ej: Pago pendiente, comportamiento inadecuado..."
              data-testid="input-lock-reason"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setLockDialogOpen(false);
                setSelectedStudent(null);
                setLockReason("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmLock}
              disabled={lockMutation.isPending}
              data-testid="button-confirm-lock"
            >
              {lockMutation.isPending ? "Bloqueando..." : "Bloquear Estudiante"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
