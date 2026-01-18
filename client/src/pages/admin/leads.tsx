import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, Search, Mail, Phone, TrendingUp, UserPlus, Filter, Play, Send, Calendar, Target, BarChart3 } from "lucide-react";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Lead {
  id: string;
  email: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  placementLevel: string | null;
  placementConfidence: string | null;
  quizAttemptId: string | null;
  quizCompletedAt: string | null;
  status: string;
  score: string;
  source: string | null;
  resultEmailSent: boolean;
  day1EmailSent: boolean;
  day3EmailSent: boolean;
  day7EmailSent: boolean;
  convertedToUser: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LeadAnalytics {
  totalLeads: number;
  newLeads: number;
  engagedLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  inactiveLeads: number;
  conversionRate: number;
  avgScore: number;
  leadsThisWeek: number;
  leadsThisMonth: number;
  byLevel: Record<string, number>;
  bySource: Record<string, number>;
}

type StatusFilter = 'all' | 'new' | 'engaged' | 'nurture' | 'qualified' | 'converted' | 'inactive';

const statusLabels: Record<string, string> = {
  new: "Nuevo",
  engaged: "Comprometido",
  nurture: "En nurturing",
  qualified: "Calificado",
  converted: "Convertido",
  inactive: "Inactivo",
};

const statusColors: Record<string, string> = {
  new: "#3B82F6",
  engaged: "#8B5CF6",
  nurture: "#F59E0B",
  qualified: "#10B981",
  converted: "#059669",
  inactive: "#6B7280",
};

const levelLabels: Record<string, string> = {
  A1: "Principiante",
  A2: "Básico",
  B1: "Intermedio",
  B2: "Intermedio Alto",
  C1: "Avanzado",
  C2: "Maestría",
};

export default function AdminLeads() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const { toast } = useToast();

  const { data: analytics, isLoading: analyticsLoading } = useQuery<LeadAnalytics>({
    queryKey: ["/api/admin/leads/analytics"],
  });

  const leadsQueryUrl = statusFilter === 'all' 
    ? "/api/admin/leads" 
    : `/api/admin/leads?status=${statusFilter}`;
  
  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: [leadsQueryUrl],
  });

  const invalidateLeadsQueries = () => {
    queryClient.invalidateQueries({ predicate: (query) => 
      String(query.queryKey[0]).startsWith("/api/admin/leads")
    });
  };

  const runSequencesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/admin/leads/run-sequences');
    },
    onSuccess: (data: any) => {
      invalidateLeadsQueries();
      toast({ 
        title: "Secuencias ejecutadas", 
        description: data.message || "Emails enviados correctamente" 
      });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "No se pudieron ejecutar las secuencias de email.", 
        variant: "destructive" 
      });
    }
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ leadId, template }: { leadId: string; template: string }) => {
      return apiRequest('POST', `/api/admin/leads/${leadId}/send-email`, { template });
    },
    onSuccess: () => {
      invalidateLeadsQueries();
      toast({ title: "Email enviado", description: "El email se envió correctamente." });
      setEmailDialogOpen(false);
      setSelectedLead(null);
      setSelectedTemplate("");
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo enviar el email.", variant: "destructive" });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      return apiRequest('PATCH', `/api/admin/leads/${leadId}/status`, { status });
    },
    onSuccess: () => {
      invalidateLeadsQueries();
      toast({ title: "Estado actualizado", description: "El estado del lead se actualizó." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo actualizar el estado.", variant: "destructive" });
    }
  });

  const filteredLeads = leads?.filter((lead) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      lead.email.toLowerCase().includes(searchLower) ||
      lead.firstName.toLowerCase().includes(searchLower) ||
      (lead.lastName?.toLowerCase().includes(searchLower))
    );
  });

  const getEmailSequenceStatus = (lead: Lead) => {
    if (lead.convertedToUser) return { label: "Convertido", color: "#059669" };
    if (lead.day7EmailSent) return { label: "Secuencia completa", color: "#10B981" };
    if (lead.day3EmailSent) return { label: "Día 3 enviado", color: "#F59E0B" };
    if (lead.day1EmailSent) return { label: "Día 1 enviado", color: "#8B5CF6" };
    if (lead.resultEmailSent) return { label: "Resultado enviado", color: "#3B82F6" };
    return { label: "Pendiente", color: "#6B7280" };
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('es-MX', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <AdminLayout title="Leads">
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "Impact, 'Arial Black', sans-serif" }}>
              Gestión de Leads
            </h1>
            <p className="text-muted-foreground">Administra los prospectos y secuencias de email</p>
          </div>
          <Button 
            onClick={() => runSequencesMutation.mutate()}
            disabled={runSequencesMutation.isPending}
            data-testid="button-run-sequences"
          >
            <Play className="w-4 h-4 mr-2" />
            {runSequencesMutation.isPending ? "Ejecutando..." : "Ejecutar Secuencias"}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="w-4 h-4" />
              Total
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: "#33CBFB" }}>
              {analyticsLoading ? "..." : analytics?.totalLeads || 0}
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <UserPlus className="w-4 h-4" />
              Esta Semana
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: "#3B82F6" }}>
              {analyticsLoading ? "..." : analytics?.leadsThisWeek || 0}
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Target className="w-4 h-4" />
              Calificados
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: "#10B981" }}>
              {analyticsLoading ? "..." : analytics?.qualifiedLeads || 0}
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="w-4 h-4" />
              Convertidos
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: "#059669" }}>
              {analyticsLoading ? "..." : analytics?.convertedLeads || 0}
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <BarChart3 className="w-4 h-4" />
              Tasa Conv.
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: "#FD335A" }}>
              {analyticsLoading ? "..." : `${analytics?.conversionRate || 0}%`}
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Target className="w-4 h-4" />
              Score Prom.
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: "#8B5CF6" }}>
              {analyticsLoading ? "..." : Math.round(analytics?.avgScore || 0)}
            </div>
          </Card>
        </div>

        {analytics && (
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Por Nivel</h3>
              <div className="space-y-2">
                {Object.entries(analytics.byLevel || {}).map(([level, count]) => (
                  <div key={level} className="flex justify-between items-center">
                    <span className="text-sm">{level} - {levelLabels[level] || level}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
                {Object.keys(analytics.byLevel || {}).length === 0 && (
                  <p className="text-sm text-muted-foreground">Sin datos de nivel</p>
                )}
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Por Fuente</h3>
              <div className="space-y-2">
                {Object.entries(analytics.bySource || {}).map(([source, count]) => (
                  <div key={source} className="flex justify-between items-center">
                    <span className="text-sm capitalize">{source}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
                {Object.keys(analytics.bySource || {}).length === 0 && (
                  <p className="text-sm text-muted-foreground">Sin datos de fuente</p>
                )}
              </div>
            </Card>
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-leads"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="new">Nuevos</SelectItem>
                <SelectItem value="engaged">Comprometidos</SelectItem>
                <SelectItem value="nurture">En nurturing</SelectItem>
                <SelectItem value="qualified">Calificados</SelectItem>
                <SelectItem value="converted">Convertidos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="overflow-hidden">
          {leadsLoading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando leads...</div>
          ) : filteredLeads && filteredLeads.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Lead</th>
                    <th className="text-left p-3 font-medium">Nivel</th>
                    <th className="text-left p-3 font-medium">Estado</th>
                    <th className="text-left p-3 font-medium">Secuencia</th>
                    <th className="text-left p-3 font-medium">Score</th>
                    <th className="text-left p-3 font-medium">Fecha</th>
                    <th className="text-left p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => {
                    const sequenceStatus = getEmailSequenceStatus(lead);
                    return (
                      <tr key={lead.id} className="border-t hover-elevate" data-testid={`row-lead-${lead.id}`}>
                        <td className="p-3">
                          <div className="font-medium">{lead.firstName} {lead.lastName || ''}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {lead.email}
                          </div>
                          {lead.phone && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {lead.phone}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          {lead.placementLevel ? (
                            <Badge variant="outline" style={{ borderColor: "#33CBFB", color: "#33CBFB" }}>
                              {lead.placementLevel}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <Select 
                            value={lead.status || 'new'} 
                            onValueChange={(v) => updateStatusMutation.mutate({ leadId: lead.id, status: v })}
                          >
                            <SelectTrigger className="w-32 h-8" data-testid={`select-status-${lead.id}`}>
                              <Badge style={{ backgroundColor: statusColors[lead.status || 'new'], color: '#fff' }}>
                                {statusLabels[lead.status || 'new']}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          <Badge variant="secondary" style={{ backgroundColor: sequenceStatus.color + '20', color: sequenceStatus.color }}>
                            {sequenceStatus.label}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <div className="font-mono text-sm" style={{ color: parseInt(lead.score || '0') >= 50 ? '#10B981' : '#6B7280' }}>
                            {lead.score || '0'}/100
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm flex items-center gap-1 text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {formatDate(lead.createdAt)}
                          </div>
                        </td>
                        <td className="p-3">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => {
                              setSelectedLead(lead);
                              setEmailDialogOpen(true);
                            }}
                            disabled={lead.convertedToUser}
                            data-testid={`button-email-${lead.id}`}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              No hay leads que coincidan con los filtros
            </div>
          )}
        </Card>
      </div>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Email Manual</DialogTitle>
            <DialogDescription>
              Envía un email de la secuencia a {selectedLead?.firstName} ({selectedLead?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
              <SelectTrigger data-testid="select-email-template">
                <SelectValue placeholder="Selecciona un template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead_day1_followup">Día 1: Cursos Recomendados</SelectItem>
                <SelectItem value="lead_day3_lab_invite">Día 3: Invitación a Labs</SelectItem>
                <SelectItem value="lead_day7_offer">Día 7: Oferta 50% OFF</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (selectedLead && selectedTemplate) {
                  sendEmailMutation.mutate({ leadId: selectedLead.id, template: selectedTemplate });
                }
              }}
              disabled={!selectedTemplate || sendEmailMutation.isPending}
              data-testid="button-send-email-confirm"
            >
              {sendEmailMutation.isPending ? "Enviando..." : "Enviar Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
