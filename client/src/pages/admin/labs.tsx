import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Calendar, Users, Clock, Video, X, MessageCircle, Repeat, Radio, CalendarCheck, History, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Instructor, LiveSession, SessionRoom } from "@shared/schema";

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
const topics = ["general", "business", "travel", "technology", "culture", "current-events"];
const topicLabels: Record<string, string> = {
  general: "General",
  business: "Negocios",
  travel: "Viajes",
  technology: "Tecnología",
  culture: "Cultura",
  "current-events": "Actualidad",
};

interface LabGroup {
  topic: string;
  level: string;
}

interface LabWithRooms extends LiveSession {
  rooms?: SessionRoom[];
}

type LabFilter = "all" | "live" | "upcoming" | "past";

export default function AdminLabs() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<LabWithRooms | null>(null);
  const [activeFilter, setActiveFilter] = useState<LabFilter>("all");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    instructorId: "",
    scheduledAt: "",
    duration: 60,
    meetingUrl: "",
    isPremium: false,
    groups: [{ topic: "general", level: "A1" }] as LabGroup[],
    isRecurring: false,
    recurrenceWeeks: 4,
  });

  const { data: labs, isLoading } = useQuery<LabWithRooms[]>({
    queryKey: ["/api/admin/live-sessions"],
  });

  const { data: instructors } = useQuery<Instructor[]>({
    queryKey: ["/api/instructors"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      const payload = {
        ...data,
        scheduledAt: new Date(data.scheduledAt).toISOString(),
      };
      return apiRequest("POST", "/api/admin/live-sessions", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/live-sessions"] });
      toast({ title: "Laboratorio creado exitosamente" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error al crear laboratorio", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const payload = data.scheduledAt
        ? { ...data, scheduledAt: new Date(data.scheduledAt).toISOString() }
        : data;
      return apiRequest("PATCH", `/api/admin/live-sessions/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/live-sessions"] });
      toast({ title: "Laboratorio actualizado exitosamente" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error al actualizar laboratorio", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/live-sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/live-sessions"] });
      toast({ title: "Laboratorio eliminado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar laboratorio", variant: "destructive" });
    },
  });

  const deleteSeriesMutation = useMutation({
    mutationFn: (seriesId: string) => apiRequest("DELETE", `/api/admin/live-sessions/series/${seriesId}`),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/live-sessions"] });
      toast({ title: `Se eliminaron ${data.deleted || 0} sesiones de la serie` });
    },
    onError: () => {
      toast({ title: "Error al eliminar serie", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      instructorId: "",
      scheduledAt: "",
      duration: 60,
      meetingUrl: "",
      isPremium: false,
      groups: [{ topic: "general", level: "A1" }],
      isRecurring: false,
      recurrenceWeeks: 4,
    });
    setEditingLab(null);
  };

  const handleEdit = (lab: LabWithRooms) => {
    setEditingLab(lab);
    const scheduledDate = lab.scheduledAt ? new Date(lab.scheduledAt) : new Date();
    const groups = lab.rooms && lab.rooms.length > 0 
      ? lab.rooms.map(r => ({ topic: r.topic, level: r.level }))
      : [{ topic: "general", level: "A1" }];
    setFormData({
      title: lab.title,
      description: lab.description || "",
      instructorId: lab.instructorId,
      scheduledAt: scheduledDate.toISOString().slice(0, 16),
      duration: lab.duration,
      meetingUrl: lab.meetingUrl || "",
      isPremium: lab.isPremium,
      groups,
      isRecurring: false, // Don't allow editing recurring settings for existing labs
      recurrenceWeeks: 4,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    if (!formData.title.trim()) {
      toast({ title: "El título es requerido", variant: "destructive" });
      return;
    }
    if (!formData.instructorId) {
      toast({ title: "Debe seleccionar un instructor", variant: "destructive" });
      return;
    }
    if (!formData.scheduledAt) {
      toast({ title: "Debe seleccionar fecha y hora", variant: "destructive" });
      return;
    }
    if (formData.groups.length === 0) {
      toast({ title: "Debe agregar al menos un grupo", variant: "destructive" });
      return;
    }
    
    if (editingLab) {
      updateMutation.mutate({ id: editingLab.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addGroup = () => {
    setFormData({
      ...formData,
      groups: [...formData.groups, { topic: "general", level: "A1" }],
    });
  };

  const removeGroup = (index: number) => {
    if (formData.groups.length <= 1) {
      toast({ title: "Debe haber al menos un grupo", variant: "destructive" });
      return;
    }
    const newGroups = formData.groups.filter((_, i) => i !== index);
    setFormData({ ...formData, groups: newGroups });
  };

  const updateGroup = (index: number, field: keyof LabGroup, value: string) => {
    const newGroups = [...formData.groups];
    newGroups[index] = { ...newGroups[index], [field]: value };
    setFormData({ ...formData, groups: newGroups });
  };

  const getLabStatus = (lab: LabWithRooms) => {
    const now = new Date();
    const scheduled = new Date(lab.scheduledAt);
    const endTime = new Date(scheduled.getTime() + lab.duration * 60000);
    
    if (now < scheduled) return { label: "Próximo", color: "#33CBFB" };
    if (now >= scheduled && now <= endTime) return { label: "En Vivo", color: "#10B981" };
    return { label: "Finalizado", color: "#6B7280" };
  };

  const getTotalParticipants = (lab: LabWithRooms) => {
    if (!lab.rooms) return { current: 0, max: 0 };
    return lab.rooms.reduce(
      (acc, room) => ({
        current: acc.current + room.currentParticipants,
        max: acc.max + room.maxParticipants,
      }),
      { current: 0, max: 0 }
    );
  };

  const getLabStatusType = (lab: LabWithRooms): "live" | "upcoming" | "past" => {
    const now = new Date();
    const scheduled = new Date(lab.scheduledAt);
    const endTime = new Date(scheduled.getTime() + lab.duration * 60000);
    
    if (now >= scheduled && now <= endTime) return "live";
    if (now < scheduled) return "upcoming";
    return "past";
  };

  const filteredLabs = useMemo(() => {
    if (!labs) return [];
    if (activeFilter === "all") return labs;
    return labs.filter(lab => getLabStatusType(lab) === activeFilter);
  }, [labs, activeFilter]);

  const labCounts = useMemo(() => {
    if (!labs) return { all: 0, live: 0, upcoming: 0, past: 0 };
    return {
      all: labs.length,
      live: labs.filter(lab => getLabStatusType(lab) === "live").length,
      upcoming: labs.filter(lab => getLabStatusType(lab) === "upcoming").length,
      past: labs.filter(lab => getLabStatusType(lab) === "past").length,
    };
  }, [labs]);

  return (
    <AdminLayout title="Programación de Laboratorios">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as LabFilter)} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-4 w-full sm:w-auto">
              <TabsTrigger value="all" className="flex items-center gap-1.5" data-testid="tab-all">
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Todos</span>
                <Badge variant="secondary" className="ml-1 text-xs">{labCounts.all}</Badge>
              </TabsTrigger>
              <TabsTrigger value="live" className="flex items-center gap-1.5" data-testid="tab-live">
                <Radio className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">En Vivo</span>
                {labCounts.live > 0 && <Badge className="ml-1 text-xs bg-green-500">{labCounts.live}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="flex items-center gap-1.5" data-testid="tab-upcoming">
                <CalendarCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Próximos</span>
                <Badge variant="secondary" className="ml-1 text-xs">{labCounts.upcoming}</Badge>
              </TabsTrigger>
              <TabsTrigger value="past" className="flex items-center gap-1.5" data-testid="tab-past">
                <History className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pasados</span>
                <Badge variant="secondary" className="ml-1 text-xs">{labCounts.past}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-lab">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Laboratorio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  {editingLab ? "Editar Laboratorio" : "Crear Nuevo Laboratorio"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>Título</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Título del laboratorio"
                      required
                      data-testid="input-lab-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>Instructor</Label>
                    <Select value={formData.instructorId} onValueChange={(v) => setFormData({ ...formData, instructorId: v })}>
                      <SelectTrigger data-testid="select-lab-instructor">
                        <SelectValue placeholder="Seleccionar instructor" />
                      </SelectTrigger>
                      <SelectContent>
                        {instructors?.map((instructor) => (
                          <SelectItem key={instructor.id} value={instructor.id}>
                            {instructor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>Descripción</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción del laboratorio"
                    data-testid="input-lab-description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>Fecha y Hora</Label>
                    <Input
                      type="datetime-local"
                      value={formData.scheduledAt}
                      onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                      required
                      data-testid="input-lab-datetime"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>Duración (minutos)</Label>
                    <Input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                      data-testid="input-lab-duration"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>URL de Reunión Principal</Label>
                  <Input
                    value={formData.meetingUrl}
                    onChange={(e) => setFormData({ ...formData, meetingUrl: e.target.value })}
                    placeholder="https://zoom.us/..."
                    data-testid="input-lab-url"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      Grupos de Conversación ({formData.groups.length})
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addGroup}
                      data-testid="button-add-group"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar Grupo
                    </Button>
                  </div>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {formData.groups.map((group, index) => (
                      <div 
                        key={index} 
                        className="flex items-center gap-2 p-3 bg-muted/50 rounded-md"
                        data-testid={`group-row-${index}`}
                      >
                        <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <Select 
                            value={group.topic} 
                            onValueChange={(v) => updateGroup(index, 'topic', v)}
                          >
                            <SelectTrigger data-testid={`select-group-topic-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {topics.map((topic) => (
                                <SelectItem key={topic} value={topic}>{topicLabels[topic]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-24">
                          <Select 
                            value={group.level} 
                            onValueChange={(v) => updateGroup(index, 'level', v)}
                          >
                            <SelectTrigger data-testid={`select-group-level-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {levels.map((level) => (
                                <SelectItem key={level} value={level}>{level}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeGroup(index)}
                          disabled={formData.groups.length <= 1}
                          data-testid={`button-remove-group-${index}`}
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPremium}
                      onChange={(e) => setFormData({ ...formData, isPremium: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>Solo Premium</span>
                  </label>
                </div>

                {!editingLab && (
                  <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isRecurring}
                        onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                        className="w-4 h-4"
                        data-testid="checkbox-recurring"
                      />
                      <Repeat className="w-4 h-4 text-primary" />
                      <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        Sesión Recurrente (se repite cada semana)
                      </span>
                    </label>
                    
                    {formData.isRecurring && (
                      <div className="flex items-center gap-3 pl-6">
                        <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          Repetir durante
                        </Label>
                        <Select 
                          value={formData.recurrenceWeeks.toString()} 
                          onValueChange={(v) => setFormData({ ...formData, recurrenceWeeks: parseInt(v) })}
                        >
                          <SelectTrigger className="w-24" data-testid="select-recurrence-weeks">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[2, 3, 4, 5, 6, 7, 8, 10, 12].map((weeks) => (
                              <SelectItem key={weeks} value={weeks.toString()}>
                                {weeks}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-muted-foreground">semanas</span>
                      </div>
                    )}
                    
                    {formData.isRecurring && (
                      <p className="text-xs text-muted-foreground pl-6">
                        Se crearán {formData.recurrenceWeeks} sesiones, cada una el mismo día y hora de la semana.
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit-lab"
                  >
                    {editingLab ? "Guardar Cambios" : "Crear Laboratorio"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {isLoading ? (
            <p className="text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              Cargando laboratorios...
            </p>
          ) : filteredLabs.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {activeFilter === "all" 
                  ? "No hay laboratorios programados. Crea tu primer laboratorio."
                  : activeFilter === "live"
                  ? "No hay laboratorios en vivo en este momento."
                  : activeFilter === "upcoming"
                  ? "No hay laboratorios próximos programados."
                  : "No hay laboratorios pasados."}
              </p>
            </Card>
          ) : (
            filteredLabs.map((lab) => {
              const status = getLabStatus(lab);
              const instructor = instructors?.find((i) => i.id === lab.instructorId);
              const participants = getTotalParticipants(lab);
              return (
                <Card key={lab.id} className="p-4" data-testid={`card-lab-${lab.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div 
                        className="w-12 h-12 flex items-center justify-center shrink-0"
                        style={{ backgroundColor: status.color }}
                      >
                        <Video className="w-6 h-6 text-black" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {lab.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(lab.scheduledAt).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Instructor: {instructor?.name || "No asignado"}
                        </p>
                        
                        {lab.rooms && lab.rooms.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {lab.rooms.map((room) => (
                              <div 
                                key={room.id}
                                className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-xs"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>{topicLabels[room.topic] || room.topic}</span>
                                <Badge variant="secondary" className="text-[10px] px-1">
                                  {room.level}
                                </Badge>
                                <span className="text-muted-foreground">
                                  {room.currentParticipants}/{room.maxParticipants}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {lab.duration} min
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        {lab.rooms?.length || 0} grupos
                      </div>
                      <Badge style={{ backgroundColor: status.color }}>{status.label}</Badge>
                      {lab.isRecurring && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Repeat className="w-3 h-3" />
                          Semanal
                        </Badge>
                      )}
                      {lab.isPremium && (
                        <Badge style={{ backgroundColor: '#FD335A' }}>Premium</Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" data-testid={`button-lab-menu-${lab.id}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(lab)} data-testid={`menu-edit-lab-${lab.id}`}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          {lab.isRecurring && lab.seriesId && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => {
                                  if (confirm("¿Eliminar todas las sesiones futuras de esta serie?")) {
                                    deleteSeriesMutation.mutate(lab.seriesId!);
                                  }
                                }}
                                className="text-destructive"
                                data-testid={`menu-delete-series-${lab.id}`}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar Serie
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => {
                              if (confirm("¿Estás seguro de eliminar este laboratorio?")) {
                                deleteMutation.mutate(lab.id);
                              }
                            }}
                            className="text-destructive"
                            data-testid={`menu-delete-lab-${lab.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar Este
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
