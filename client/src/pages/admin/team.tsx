import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, UserCheck, Users, Mail, MoreVertical, ShieldCheck, ShieldOff, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import type { Instructor } from "@shared/schema";

interface TeamMember extends User {
  role: "superadmin" | "admin" | "user";
}

export default function AdminTeam() {
  const { toast } = useToast();

  const { data: admins, isLoading: adminsLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/team/admins"],
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
          <Card className="p-4" data-testid="card-team-instructors-count">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#33CBFB]/15 flex items-center justify-center rounded">
                <UserCheck className="w-5 h-5 text-[#33CBFB]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{instructors?.filter(i => i.isActive).length || 0}</p>
                <p className="text-sm text-muted-foreground">Instructores Activos</p>
              </div>
            </div>
          </Card>
          <Card className="p-4" data-testid="card-team-total">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/15 flex items-center justify-center rounded">
                <Users className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(admins?.length || 0) + (instructors?.length || 0)}</p>
                <p className="text-sm text-muted-foreground">Total del Equipo</p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="admins" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="admins" data-testid="tab-admins">
              <Shield className="w-4 h-4 mr-2" />
              Administradores
            </TabsTrigger>
            <TabsTrigger value="instructors" data-testid="tab-instructors">
              <UserCheck className="w-4 h-4 mr-2" />
              Instructores
            </TabsTrigger>
          </TabsList>

          <TabsContent value="admins" className="mt-6">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Administradores del Sistema</h2>
              </div>
              
              {adminsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : admins?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
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
                          <p className="font-medium" data-testid={`text-admin-name-${admin.id}`}>
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

          <TabsContent value="instructors" className="mt-6">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Instructores</h2>
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
                <p className="text-muted-foreground text-center py-8">
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
                          <AvatarFallback className="bg-[#33CBFB] text-black">
                            {instructor.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "IN"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium" data-testid={`text-instructor-name-${instructor.id}`}>
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
                        <span className="text-sm text-muted-foreground">
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
