import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, Search, BookOpen, Clock, Star, Lock, Unlock, TrendingDown, UserCheck, UserX, AlertTriangle, UserPlus, Trash2, Download } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  isAdmin: boolean;
  addedManually: boolean;
  status: 'active' | 'hold' | 'inactive';
  isLocked: boolean;
  lockedAt: string | null;
  lockedReason: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
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

type StatusTab = 'all' | 'active' | 'hold' | 'inactive' | 'deleted';

const statusLabels: Record<string, string> = {
  active: "Activo",
  hold: "En espera",
  inactive: "Inactivo",
  deleted: "Eliminado",
};

const statusColors: Record<string, string> = {
  active: "#10B981",
  hold: "#F59E0B",
  inactive: "#EF4444",
  deleted: "#6B7280",
};

export default function AdminStudents() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [lockReason, setLockReason] = useState("");
  const [addStudentDialogOpen, setAddStudentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [newStudentForm, setNewStudentForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    plan: "flex" as "flex" | "standard" | "premium",
    skipOnboarding: false,
  });
  const { toast } = useToast();

  const { data: metrics, isLoading: metricsLoading } = useQuery<StudentMetrics>({
    queryKey: ["/api/admin/students/metrics"],
  });

  const { data: students, isLoading: studentsLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/students", activeTab],
    queryFn: async () => {
      let url: string;
      if (activeTab === 'all') {
        url = '/api/admin/students';
      } else if (activeTab === 'deleted') {
        url = '/api/admin/students/deleted';
      } else {
        url = `/api/admin/students?status=${activeTab}`;
      }
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to fetch students");
      return res.json();
    }
  });

  const { data: deletedStudents } = useQuery<User[]>({
    queryKey: ["/api/admin/students/deleted"],
    queryFn: async () => {
      const res = await fetch('/api/admin/students/deleted', { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to fetch deleted students");
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

  const addStudentMutation = useMutation({
    mutationFn: async (data: typeof newStudentForm) => {
      return apiRequest('POST', '/api/admin/students/manual', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students/metrics"] });
      toast({ title: "Estudiante agregado", description: "Se ha enviado una invitación al correo del estudiante." });
      setAddStudentDialogOpen(false);
      setNewStudentForm({
        email: "",
        firstName: "",
        lastName: "",
        birthDate: "",
        plan: "flex",
        skipOnboarding: false,
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "No se pudo agregar al estudiante.", 
        variant: "destructive" 
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest('DELETE', `/api/admin/students/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students/deleted"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/students/metrics"] });
      toast({ title: "Estudiante eliminado", description: "El estudiante ha sido movido a eliminados." });
      setDeleteConfirmDialogOpen(false);
      setDeleteDialogOpen(false);
      setSelectedStudent(null);
      setDeleteConfirmText("");
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar al estudiante.", variant: "destructive" });
    }
  });

  const handleDeleteClick = (student: User) => {
    setSelectedStudent(student);
    setDeleteDialogOpen(true);
  };

  const handleFirstDeleteConfirm = () => {
    setDeleteDialogOpen(false);
    setDeleteConfirmDialogOpen(true);
  };

  const handleFinalDeleteConfirm = () => {
    if (deleteConfirmText === "ELIMINAR" && selectedStudent) {
      deleteMutation.mutate(selectedStudent.id);
    }
  };

  const exportStudentsCSV = async (statusFilter?: string) => {
    try {
      let url = '/api/admin/students/export';
      if (statusFilter) {
        url += `?status=${statusFilter}`;
      }
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to export");
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `estudiantes_${statusFilter || 'todos'}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      toast({ title: "Exportación completada", description: "El archivo CSV se ha descargado." });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo exportar los estudiantes.", variant: "destructive" });
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleAddStudent = () => {
    if (!newStudentForm.email || !newStudentForm.firstName || !newStudentForm.lastName || !newStudentForm.birthDate) {
      toast({ title: "Error", description: "Por favor completa todos los campos.", variant: "destructive" });
      return;
    }

    const age = calculateAge(newStudentForm.birthDate);
    if (age < 16) {
      toast({ title: "Error", description: "El estudiante debe tener al menos 16 años.", variant: "destructive" });
      return;
    }

    addStudentMutation.mutate(newStudentForm);
  };

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
    { key: 'deleted', label: 'Eliminados', count: deletedStudents?.length || 0 },
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
          <Button
            onClick={() => setAddStudentDialogOpen(true)}
            className="gap-2"
            data-testid="button-add-student"
          >
            <UserPlus className="w-4 h-4" />
            Agregar Estudiante
          </Button>
          <Button
            variant="outline"
            onClick={() => exportStudentsCSV(activeTab === 'all' ? undefined : activeTab)}
            className="gap-2"
            data-testid="button-export-students"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
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
                          {student.addedManually && (
                            <strong className="ml-2 text-primary">Agregado manualmente</strong>
                          )}
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

                      {activeTab !== 'deleted' && (
                        <>
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
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteClick(student)}
                            data-testid={`button-delete-${student.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </>
                      )}
                      {activeTab === 'deleted' && student.deletedAt && (
                        <span className="text-xs text-muted-foreground">
                          Eliminado: {new Date(student.deletedAt).toLocaleDateString('es-LA')}
                        </span>
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

      <Dialog open={addStudentDialogOpen} onOpenChange={setAddStudentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
              Agregar Estudiante Manualmente
            </DialogTitle>
            <DialogDescription>
              Ingresa los datos del estudiante. Se enviará una invitación al correo electrónico indicado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={newStudentForm.email}
                onChange={(e) => setNewStudentForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="estudiante@ejemplo.com"
                data-testid="input-new-student-email"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre</Label>
                <Input
                  id="firstName"
                  value={newStudentForm.firstName}
                  onChange={(e) => setNewStudentForm(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Nombre"
                  data-testid="input-new-student-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido</Label>
                <Input
                  id="lastName"
                  value={newStudentForm.lastName}
                  onChange={(e) => setNewStudentForm(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Apellido"
                  data-testid="input-new-student-lastname"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">Fecha de Nacimiento</Label>
              <Input
                id="birthDate"
                type="date"
                value={newStudentForm.birthDate}
                onChange={(e) => setNewStudentForm(prev => ({ ...prev, birthDate: e.target.value }))}
                data-testid="input-new-student-birthdate"
              />
              <p className="text-xs text-muted-foreground">El estudiante debe tener al menos 16 años</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan">Plan de Suscripción</Label>
              <Select
                value={newStudentForm.plan}
                onValueChange={(value) => setNewStudentForm(prev => ({ ...prev, plan: value as any }))}
              >
                <SelectTrigger data-testid="select-new-student-plan">
                  <SelectValue placeholder="Seleccionar plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flex">Flex - $14.99/mes</SelectItem>
                  <SelectItem value="standard">Estándar - $49.99/mes</SelectItem>
                  <SelectItem value="premium">Premium - $99.99/mes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="skipOnboarding"
                checked={newStudentForm.skipOnboarding}
                onCheckedChange={(checked) => setNewStudentForm(prev => ({ ...prev, skipOnboarding: !!checked }))}
                data-testid="checkbox-skip-onboarding"
              />
              <Label htmlFor="skipOnboarding" className="text-sm cursor-pointer">
                Saltar onboarding (acceso directo al dashboard)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setAddStudentDialogOpen(false);
                setNewStudentForm({
                  email: "",
                  firstName: "",
                  lastName: "",
                  birthDate: "",
                  plan: "flex",
                  skipOnboarding: false,
                });
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddStudent}
              disabled={addStudentMutation.isPending}
              data-testid="button-confirm-add-student"
            >
              {addStudentMutation.isPending ? "Agregando..." : "Agregar Estudiante"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
              Eliminar Estudiante
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar a{' '}
              <strong>
                {selectedStudent?.firstName 
                  ? `${selectedStudent.firstName} ${selectedStudent.lastName || ''}`
                  : selectedStudent?.email || selectedStudent?.id}
              </strong>
              ? Esta acción moverá al estudiante a la lista de eliminados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedStudent(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleFirstDeleteConfirm}
              data-testid="button-first-delete-confirm"
            >
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmDialogOpen} onOpenChange={setDeleteConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              Para confirmar la eliminación de{' '}
              <strong>
                {selectedStudent?.firstName 
                  ? `${selectedStudent.firstName} ${selectedStudent.lastName || ''}`
                  : selectedStudent?.email || selectedStudent?.id}
              </strong>
              , escribe <strong>ELIMINAR</strong> en el campo de abajo.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Escribe ELIMINAR para confirmar"
              data-testid="input-delete-confirm"
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setDeleteConfirmDialogOpen(false);
                setSelectedStudent(null);
                setDeleteConfirmText("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleFinalDeleteConfirm}
              disabled={deleteConfirmText !== "ELIMINAR" || deleteMutation.isPending}
              data-testid="button-final-delete-confirm"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar Permanentemente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
