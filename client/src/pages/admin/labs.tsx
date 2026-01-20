import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Calendar, Users, Clock, Video, X, MessageCircle } from "lucide-react";
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

export default function AdminLabs() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<LabWithRooms | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    instructorId: "",
    scheduledAt: "",
    duration: 60,
    meetingUrl: "",
    isPremium: false,
    groups: [{ topic: "general", level: "A1" }] as LabGroup[],
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
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <AdminLayout title="Programación de Laboratorios">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {labs?.length || 0} laboratorios programados
          </p>
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
          ) : labs?.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                No hay laboratorios programados. Crea tu primer laboratorio.
              </p>
            </Card>
          ) : (
            labs?.map((lab) => {
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
                      {lab.isPremium && (
                        <Badge style={{ backgroundColor: '#FD335A' }}>Premium</Badge>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(lab)}
                        data-testid={`button-edit-lab-${lab.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(lab.id)}
                        data-testid={`button-delete-lab-${lab.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
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
