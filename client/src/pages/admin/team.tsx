import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, UserCheck, Users, Mail, MoreVertical, ShieldOff, Loader2, Plus, UserPlus, Clock, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User, AdminInvitation } from "@shared/schema";
import type { Instructor } from "@shared/schema";

const DEPARTMENTS = [
  { value: "management", label: "Dirección" },
  { value: "content", label: "Contenido" },
  { value: "support", label: "Soporte" },
  { value: "marketing", label: "Marketing" },
  { value: "sales", label: "Ventas" },
  { value: "tech", label: "Tecnología" },
];

export default function AdminTeam() {
  const { toast } = useToast();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    department: "",
  });

  const { data: admins, isLoading: adminsLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/team/admins"],
  });

  const { data: invitations, isLoading: invitationsLoading } = useQuery<AdminInvitation[]>({
    queryKey: ["/api/admin/team/invitations"],
  });

  const { data: instructors, isLoading: instructorsLoading } = useQuery<Instructor[]>({
    queryKey: ["/api/admin/instructors"],
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      return apiRequest("PATCH", `/api/admin/team/users/${userId}/admin`, { isAdmin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team/admins"] });
      toast({
        title: "Usuario actualizado",
        description: "Los permisos del usuario han sido actualizados.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el usuario.",
        variant: "destructive",
      });
    },
  });

  const createInvitationMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/admin/team/invitations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team/invitations"] });
      toast({
        title: "Invitación creada",
        description: "El usuario recibirá acceso de admin cuando inicie sesión.",
      });
      setInviteDialogOpen(false);
      setFormData({ email: "", firstName: "", lastName: "", department: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la invitación.",
        variant: "destructive",
      });
    },
  });

  const deleteInvitationMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/team/invitations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team/invitations"] });
      toast({
        title: "Invitación eliminada",
        description: "La invitación de admin ha sido revocada.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la invitación.",
        variant: "destructive",
      });
    },
  });

  const getInitials = (firstName?: string | null, lastName?: string | null, email?: string | null) => {
    if (firstName || lastName) {
      return `${firstName?.charAt(0) || ""}${lastName?.charAt(0) || ""}`.toUpperCase();
    }
    return email?.charAt(0).toUpperCase() || "U";
  };

  const getDisplayName = (user: User) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim();
    }
    return user.email || "Usuario";
  };

  const getDepartmentLabel = (value?: string | null) => {
    return DEPARTMENTS.find(d => d.value === value)?.label || value || "Sin departamento";
  };

  const handleSubmitInvitation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      toast({
        title: "Error",
        description: "El email es requerido",
        variant: "destructive",
      });
      return;
    }
    createInvitationMutation.mutate(formData);
  };

  return (
    <AdminLayout title="Equipo">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4" data-testid="card-team-admins-count">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/15 flex items-center justify-center rounded">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{admins?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Administradores</p>
              </div>
            </div>
          </Card>
          <Card className="p-4" data-testid="card-team-invitations-count">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/15 flex items-center justify-center rounded">
                <Clock className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{invitations?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Invitaciones Pendientes</p>
              </div>
            </div>
          </Card>
          <Card className="p-4" data-testid="card-team-instructors-count">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success/15 flex items-center justify-center rounded">
                <UserCheck className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{instructors?.filter(i => i.isActive).length || 0}</p>
                <p className="text-sm text-muted-foreground">Instructores Activos</p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="admins" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="admins" data-testid="tab-admins">
              <Shield className="w-4 h-4 mr-2" />
              Admins
            </TabsTrigger>
            <TabsTrigger value="invitations" data-testid="tab-invitations">
              <UserPlus className="w-4 h-4 mr-2" />
              Invitaciones
            </TabsTrigger>
            <TabsTrigger value="instructors" data-testid="tab-instructors">
              <UserCheck className="w-4 h-4 mr-2" />
              Instructores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="admins" className="mt-6">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display uppercase tracking-tight">Administradores del Sistema</h2>
              </div>
              
              {adminsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : admins?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 font-mono">
                  No hay administradores configurados
                </p>
              ) : (
                <div className="space-y-3">
                  {admins?.map((admin) => (
                    <div 
                      key={admin.id} 
                      className="flex items-center justify-between p-3 bg-muted/50 rounded hover-elevate"
                      data-testid={`admin-item-${admin.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={admin.profileImageUrl || undefined} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(admin.firstName, admin.lastName, admin.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium font-mono" data-testid={`text-admin-name-${admin.id}`}>
                            {getDisplayName(admin)}
                          </p>
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{admin.email}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-primary">
                          <Shield className="w-3 h-3 mr-1" />
                          Super Admin
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-admin-menu-${admin.id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => toggleAdminMutation.mutate({ userId: admin.id, isAdmin: false })}
                              className="text-destructive"
                              data-testid={`button-revoke-admin-${admin.id}`}
                            >
                              <ShieldOff className="w-4 h-4 mr-2" />
                              Revocar Admin
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="mt-6">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display uppercase tracking-tight">Invitaciones de Admin</h2>
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-invite-admin">
                      <Plus className="w-4 h-4 mr-2" />
                      Invitar Admin
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleSubmitInvitation}>
                      <DialogHeader>
                        <DialogTitle>Invitar Nuevo Administrador</DialogTitle>
                        <DialogDescription>
                          Ingresa los datos del nuevo administrador. Cuando inicie sesión con este email, tendrá acceso de admin automáticamente.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="email">Email de autenticación *</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="admin@ejemplo.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            data-testid="input-invite-email"
                          />
                          <p className="text-xs text-muted-foreground">
                            Este email debe coincidir con la cuenta de Replit del usuario
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="firstName">Nombre</Label>
                            <Input
                              id="firstName"
                              placeholder="Juan"
                              value={formData.firstName}
                              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                              data-testid="input-invite-firstname"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="lastName">Apellido</Label>
                            <Input
                              id="lastName"
                              placeholder="Pérez"
                              value={formData.lastName}
                              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                              data-testid="input-invite-lastname"
                            />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="department">Departamento</Label>
                          <Select
                            value={formData.department}
                            onValueChange={(value) => setFormData({ ...formData, department: value })}
                          >
                            <SelectTrigger data-testid="select-invite-department">
                              <SelectValue placeholder="Seleccionar departamento" />
                            </SelectTrigger>
                            <SelectContent>
                              {DEPARTMENTS.map((dept) => (
                                <SelectItem key={dept.value} value={dept.value}>
                                  {dept.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createInvitationMutation.isPending}
                          data-testid="button-submit-invite"
                        >
                          {createInvitationMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Creando...
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-2" />
                              Crear Invitación
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              
              {invitationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : invitations?.length === 0 ? (
                <div className="text-center py-8">
                  <UserPlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground font-mono">
                    No hay invitaciones pendientes
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Haz clic en "Invitar Admin" para agregar nuevos administradores
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invitations?.map((invitation) => (
                    <div 
                      key={invitation.id} 
                      className="flex items-center justify-between p-3 bg-muted/50 rounded hover-elevate"
                      data-testid={`invitation-item-${invitation.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-accent text-accent-foreground">
                            {getInitials(invitation.firstName, invitation.lastName, invitation.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium font-mono">
                            {invitation.firstName || invitation.lastName 
                              ? `${invitation.firstName || ""} ${invitation.lastName || ""}`.trim()
                              : "Sin nombre"}
                          </p>
                          <div className="flex items-center gap-2">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{invitation.email}</span>
                          </div>
                          {invitation.department && (
                            <Badge variant="secondary" className="mt-1 text-xs">
                              {getDepartmentLabel(invitation.department)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-accent border-accent">
                          <Clock className="w-3 h-3 mr-1" />
                          Pendiente
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteInvitationMutation.mutate(invitation.id)}
                          disabled={deleteInvitationMutation.isPending}
                          data-testid={`button-delete-invitation-${invitation.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="instructors" className="mt-6">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-display uppercase tracking-tight">Instructores</h2>
                <Button variant="outline" size="sm" asChild>
                  <a href="/admin/instructors" data-testid="link-manage-instructors">
                    Gestionar Instructores
                  </a>
                </Button>
              </div>
              
              {instructorsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : instructors?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8 font-mono">
                  No hay instructores registrados
                </p>
              ) : (
                <div className="space-y-3">
                  {instructors?.map((instructor) => (
                    <div 
                      key={instructor.id} 
                      className="flex items-center justify-between p-3 bg-muted/50 rounded hover-elevate"
                      data-testid={`instructor-item-${instructor.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={instructor.avatarUrl || undefined} />
                          <AvatarFallback className="bg-success text-success-foreground">
                            {instructor.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "IN"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium font-mono" data-testid={`text-instructor-name-${instructor.id}`}>
                            {instructor.name}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {instructor.specializations?.slice(0, 2).map((spec, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={instructor.isActive ? "default" : "secondary"}>
                          {instructor.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                        <span className="text-sm text-muted-foreground font-mono">
                          {instructor.totalLabs} labs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
