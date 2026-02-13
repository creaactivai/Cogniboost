import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Shield, UserCheck, Users, Mail, MoreVertical, ShieldOff, Loader2, Plus, UserPlus, Clock, Trash2, Send, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User, AdminInvitation, StaffInvitation } from "@shared/schema";
import type { Instructor } from "@shared/schema";

type StaffRole = "admin" | "instructor";

const staffInvitationFormSchema = z.object({
  email: z.string().email("El email no es válido"),
  role: z.enum(["admin", "instructor"], { errorMap: () => ({ message: "Selecciona un rol" }) }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  department: z.string().optional(),
});

type StaffInvitationFormData = z.infer<typeof staffInvitationFormSchema>;

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
  const [staffInviteDialogOpen, setStaffInviteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    department: "",
  });
  const staffForm = useForm<StaffInvitationFormData>({
    resolver: zodResolver(staffInvitationFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      department: "",
      role: "instructor",
    },
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

  const { data: staffInvitations, isLoading: staffInvitationsLoading } = useQuery<StaffInvitation[]>({
    queryKey: ["/api/admin/staff-invitations"],
  });

  const createStaffInvitationMutation = useMutation({
    mutationFn: async (data: StaffInvitationFormData) => {
      return apiRequest("POST", "/api/admin/staff-invitations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff-invitations"] });
      toast({
        title: "Invitación enviada",
        description: "El usuario recibirá un email con el enlace de invitación.",
      });
      setStaffInviteDialogOpen(false);
      staffForm.reset();
    },
    onError: async (error: any) => {
      let message = "No se pudo enviar la invitación.";
      try {
        const data = await error.json?.();
        message = data?.error || message;
      } catch {}
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const revokeStaffInvitationMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/admin/staff-invitations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff-invitations"] });
      toast({
        title: "Invitación revocada",
        description: "La invitación ha sido cancelada.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo revocar la invitación.",
        variant: "destructive",
      });
    },
  });

  const resendStaffInvitationMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/admin/staff-invitations/${id}/resend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff-invitations"] });
      toast({
        title: "Invitación reenviada",
        description: "Se ha enviado un nuevo email de invitación.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo reenviar la invitación.",
        variant: "destructive",
      });
    },
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

  const handleSubmitStaffInvitation = (data: StaffInvitationFormData) => {
    createStaffInvitationMutation.mutate(data);
  };

  const getRoleLabel = (role: string) => {
    return role === "admin" ? "Administrador" : "Instructor";
  };

  const getInvitationStatus = (invitation: StaffInvitation) => {
    if (invitation.usedAt) return "used";
    if (invitation.isRevoked) return "revoked";
    if (new Date(invitation.expiresAt) < new Date()) return "expired";
    return "pending";
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

        <Tabs defaultValue="staff-invitations" className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="staff-invitations" data-testid="tab-staff-invitations">
              <Send className="w-4 h-4 mr-2" />
              Invitar Staff
            </TabsTrigger>
            <TabsTrigger value="admins" data-testid="tab-admins">
              <Shield className="w-4 h-4 mr-2" />
              Admins
            </TabsTrigger>
            <TabsTrigger value="invitations" data-testid="tab-invitations">
              <UserPlus className="w-4 h-4 mr-2" />
              Auto-Admin
            </TabsTrigger>
            <TabsTrigger value="instructors" data-testid="tab-instructors">
              <UserCheck className="w-4 h-4 mr-2" />
              Instructores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="staff-invitations" className="mt-6">
            <Card className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-display uppercase tracking-tight">Invitaciones por Email</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Envía invitaciones con enlace mágico para admin o instructor
                  </p>
                </div>
                <Dialog open={staffInviteDialogOpen} onOpenChange={setStaffInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-invite-staff">
                      <Send className="w-4 h-4 mr-2" />
                      Invitar Staff
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <Form {...staffForm}>
                      <form onSubmit={staffForm.handleSubmit(handleSubmitStaffInvitation)}>
                        <DialogHeader>
                          <DialogTitle>Invitar Nuevo Miembro</DialogTitle>
                          <DialogDescription>
                            Enviaremos un email con un enlace mágico. El usuario podrá aceptar la invitación y recibir el rol asignado.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <FormField
                            control={staffForm.control}
                            name="role"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Rol *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-staff-role">
                                      <SelectValue placeholder="Seleccionar rol" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="instructor">Instructor</SelectItem>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={staffForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="email"
                                    placeholder="usuario@ejemplo.com"
                                    data-testid="input-staff-email"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={staffForm.control}
                              name="firstName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Nombre</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Juan"
                                      data-testid="input-staff-firstname"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={staffForm.control}
                              name="lastName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Apellido</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Pérez"
                                      data-testid="input-staff-lastname"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={staffForm.control}
                            name="department"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Departamento</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-staff-department">
                                      <SelectValue placeholder="Seleccionar departamento" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {DEPARTMENTS.map((dept) => (
                                      <SelectItem key={dept.value} value={dept.value}>
                                        {dept.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setStaffInviteDialogOpen(false)} data-testid="button-cancel-staff-invite">
                            Cancelar
                          </Button>
                          <Button 
                            type="submit" 
                            disabled={createStaffInvitationMutation.isPending}
                            data-testid="button-submit-staff-invite"
                          >
                            {createStaffInvitationMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Enviar Invitación
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
              
              {staffInvitationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : staffInvitations?.length === 0 ? (
                <div className="text-center py-8">
                  <Send className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground font-mono">
                    No hay invitaciones enviadas
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Haz clic en "Invitar Staff" para agregar administradores o instructores
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {staffInvitations?.map((invitation) => {
                    const status = getInvitationStatus(invitation);
                    return (
                      <div 
                        key={invitation.id} 
                        className="flex items-center justify-between flex-wrap gap-3 p-3 bg-muted/50 rounded hover-elevate"
                        data-testid={`staff-invitation-item-${invitation.id}`}
                      >
                        <div className="flex items-center gap-3 flex-wrap">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {getInitials(invitation.firstName, invitation.lastName, invitation.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium font-mono" data-testid={`text-staff-name-${invitation.id}`}>
                                {invitation.firstName || invitation.lastName 
                                  ? `${invitation.firstName || ""} ${invitation.lastName || ""}`.trim()
                                  : invitation.email}
                              </p>
                              <Badge variant={invitation.role === 'admin' ? "default" : "secondary"} data-testid={`badge-role-${invitation.id}`}>
                                {invitation.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <UserCheck className="w-3 h-3 mr-1" />}
                                {getRoleLabel(invitation.role)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground" data-testid={`text-email-${invitation.id}`}>{invitation.email}</span>
                            </div>
                            {invitation.department && (
                              <Badge variant="outline" className="mt-1 text-xs" data-testid={`badge-department-${invitation.id}`}>
                                {getDepartmentLabel(invitation.department)}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {status === "pending" && (
                            <>
                              <Badge variant="outline" data-testid={`badge-status-pending-${invitation.id}`}>
                                <Clock className="w-3 h-3 mr-1" />
                                Pendiente
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => resendStaffInvitationMutation.mutate(invitation.id)}
                                disabled={resendStaffInvitationMutation.isPending}
                                title="Reenviar invitación"
                                data-testid={`button-resend-staff-${invitation.id}`}
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => revokeStaffInvitationMutation.mutate(invitation.id)}
                                disabled={revokeStaffInvitationMutation.isPending}
                                title="Revocar invitación"
                                data-testid={`button-revoke-staff-${invitation.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {status === "used" && (
                            <Badge variant="secondary" data-testid={`badge-status-used-${invitation.id}`}>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Aceptada
                            </Badge>
                          )}
                          {status === "revoked" && (
                            <Badge variant="destructive" data-testid={`badge-status-revoked-${invitation.id}`}>
                              <XCircle className="w-3 h-3 mr-1" />
                              Revocada
                            </Badge>
                          )}
                          {status === "expired" && (
                            <Badge variant="secondary" data-testid={`badge-status-expired-${invitation.id}`}>
                              <Clock className="w-3 h-3 mr-1" />
                              Expirada
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>

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
                            Este email será usado para la invitación del usuario
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
