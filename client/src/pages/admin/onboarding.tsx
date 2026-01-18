import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  CheckCircle, 
  Clock, 
  Mail, 
  Send, 
  TrendingUp,
  Loader2,
  UserCheck,
  AlertCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/models/auth";

interface OnboardingStats {
  totalUsers: number;
  completedOnboarding: number;
  pendingOnboarding: number;
  welcomeEmailsSent: number;
  remindersSent: number;
  completionRate: number;
}

interface ReminderResult {
  sent: number;
  failed: number;
  alreadySent: number;
}

export default function AdminOnboarding() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<OnboardingStats>({
    queryKey: ["/api/admin/onboarding/stats"],
  });

  const { data: students, isLoading: studentsLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/students"],
  });

  const sendRemindersMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/onboarding/send-reminders");
      return response.json() as Promise<ReminderResult>;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/onboarding/stats"] });
      toast({
        title: "Recordatorios enviados",
        description: `Enviados: ${result.sent}, Fallidos: ${result.failed}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudieron enviar los recordatorios",
        variant: "destructive",
      });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ userId, template }: { userId: string; template: string }) => {
      const response = await apiRequest("POST", `/api/admin/students/${userId}/send-email`, { template });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email enviado",
        description: "El correo se envió correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo enviar el correo",
        variant: "destructive",
      });
    },
  });

  const pendingStudents = students?.filter(s => !s.onboardingCompleted) || [];

  const statCards = [
    {
      title: "Usuarios Totales",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "#33CBFB",
    },
    {
      title: "Onboarding Completado",
      value: stats?.completedOnboarding || 0,
      icon: CheckCircle,
      color: "#10B981",
    },
    {
      title: "Pendientes",
      value: stats?.pendingOnboarding || 0,
      icon: Clock,
      color: "#F59E0B",
    },
    {
      title: "Tasa de Completado",
      value: `${stats?.completionRate || 0}%`,
      icon: TrendingUp,
      color: "#33CBFB",
    },
  ];

  const emailStats = [
    {
      title: "Emails de Bienvenida",
      value: stats?.welcomeEmailsSent || 0,
      icon: Mail,
      color: "#33CBFB",
    },
    {
      title: "Recordatorios Enviados",
      value: stats?.remindersSent || 0,
      icon: Send,
      color: "#FD335A",
    },
  ];

  return (
    <AdminLayout title="Onboarding y Emails">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <Card key={index} className="p-4" data-testid={`card-onboarding-stat-${index}`}>
              <div className="flex items-center justify-between mb-3">
                <div 
                  className="w-10 h-10 flex items-center justify-center"
                  style={{ backgroundColor: stat.color }}
                >
                  <stat.icon className="w-5 h-5 text-black" />
                </div>
              </div>
              <p 
                className="text-2xl font-black mb-1" 
                style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
                data-testid={`text-onboarding-value-${index}`}
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
              <div className="flex items-center justify-between mb-4">
                <h2 
                  className="text-lg font-black" 
                  style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
                >
                  Estudiantes Pendientes de Onboarding
                </h2>
                <Button
                  onClick={() => sendRemindersMutation.mutate()}
                  disabled={sendRemindersMutation.isPending || pendingStudents.length === 0}
                  data-testid="button-send-all-reminders"
                >
                  {sendRemindersMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Enviar Recordatorios
                </Button>
              </div>
              
              {studentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : pendingStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCheck className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    Todos los estudiantes han completado el onboarding
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingStudents.slice(0, 10).map((student) => (
                    <div 
                      key={student.id} 
                      className="flex items-center justify-between p-3 border border-border hover-elevate"
                      data-testid={`row-pending-student-${student.id}`}
                    >
                      <div className="flex items-center gap-3">
                        {student.profileImageUrl ? (
                          <img 
                            src={student.profileImageUrl} 
                            alt="" 
                            className="w-8 h-8 object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-primary/20 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">
                              {(student.firstName?.[0] || student.email?.[0] || '?').toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p 
                            className="font-medium"
                            style={{ fontFamily: 'JetBrains Mono, monospace' }}
                          >
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {student.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {student.onboardingReminderSent ? (
                          <Badge variant="secondary" className="text-xs">
                            Recordatorio enviado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Sin recordatorio
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => sendEmailMutation.mutate({ 
                            userId: student.id, 
                            template: 'onboarding_reminder' 
                          })}
                          disabled={sendEmailMutation.isPending}
                          data-testid={`button-send-reminder-${student.id}`}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {pendingStudents.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Y {pendingStudents.length - 10} más...
                    </p>
                  )}
                </div>
              )}
            </Card>
          </div>

          <div>
            <Card className="p-4">
              <h2 
                className="text-lg font-black mb-4" 
                style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
              >
                Estadísticas de Email
              </h2>
              <div className="space-y-4">
                {emailStats.map((stat, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 flex items-center justify-center"
                        style={{ backgroundColor: stat.color }}
                      >
                        <stat.icon className="w-4 h-4 text-black" />
                      </div>
                      <span 
                        className="text-sm"
                        style={{ fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        {stat.title}
                      </span>
                    </div>
                    <span 
                      className="text-xl font-black"
                      style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
                      data-testid={`text-email-stat-${index}`}
                    >
                      {statsLoading ? "..." : stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4 mt-4">
              <h2 
                className="text-lg font-black mb-4" 
                style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}
              >
                Acciones Rápidas
              </h2>
              <div className="space-y-2">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => sendRemindersMutation.mutate()}
                  disabled={sendRemindersMutation.isPending}
                  data-testid="button-quick-send-reminders"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Enviar todos los recordatorios
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
