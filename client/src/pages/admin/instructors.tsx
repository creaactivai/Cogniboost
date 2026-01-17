import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, UserCheck, Star, Award, Globe } from "lucide-react";
import type { Instructor } from "@shared/schema";

export default function AdminInstructors() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    avatarUrl: "",
    specializations: [] as string[],
    languages: [] as string[],
    rating: "5.0",
    totalLabs: 0,
    isActive: true,
  });
  const [newSpecialization, setNewSpecialization] = useState("");
  const [newLanguage, setNewLanguage] = useState("");

  const { data: instructors, isLoading } = useQuery<Instructor[]>({
    queryKey: ["/api/instructors"],
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("/api/admin/instructors", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructors"] });
      toast({ title: "Instructor creado exitosamente" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error al crear instructor", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData> }) =>
      apiRequest(`/api/admin/instructors/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructors"] });
      toast({ title: "Instructor actualizado exitosamente" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error al actualizar instructor", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/instructors/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructors"] });
      toast({ title: "Instructor eliminado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar instructor", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest(`/api/admin/instructors/${id}`, { method: "PATCH", body: JSON.stringify({ isActive }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/instructors"] });
      toast({ title: "Estado del instructor actualizado" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      bio: "",
      avatarUrl: "",
      specializations: [],
      languages: [],
      rating: "5.0",
      totalLabs: 0,
      isActive: true,
    });
    setEditingInstructor(null);
    setNewSpecialization("");
    setNewLanguage("");
  };

  const handleEdit = (instructor: Instructor) => {
    setEditingInstructor(instructor);
    setFormData({
      name: instructor.name,
      bio: instructor.bio || "",
      avatarUrl: instructor.avatarUrl || "",
      specializations: instructor.specializations || [],
      languages: instructor.languages || [],
      rating: instructor.rating,
      totalLabs: instructor.totalLabs,
      isActive: instructor.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingInstructor) {
      updateMutation.mutate({ id: editingInstructor.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const addSpecialization = () => {
    if (newSpecialization.trim() && !formData.specializations.includes(newSpecialization.trim())) {
      setFormData({ ...formData, specializations: [...formData.specializations, newSpecialization.trim()] });
      setNewSpecialization("");
    }
  };

  const removeSpecialization = (spec: string) => {
    setFormData({ ...formData, specializations: formData.specializations.filter((s) => s !== spec) });
  };

  const addLanguage = () => {
    if (newLanguage.trim() && !formData.languages.includes(newLanguage.trim())) {
      setFormData({ ...formData, languages: [...formData.languages, newLanguage.trim()] });
      setNewLanguage("");
    }
  };

  const removeLanguage = (lang: string) => {
    setFormData({ ...formData, languages: formData.languages.filter((l) => l !== lang) });
  };

  return (
    <AdminLayout title="Gestión de Instructores">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {instructors?.length || 0} instructores registrados
          </p>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-instructor">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Instructor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  {editingInstructor ? "Editar Instructor" : "Crear Nuevo Instructor"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>Nombre</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nombre completo"
                      required
                      data-testid="input-instructor-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>URL de Avatar</Label>
                    <Input
                      value={formData.avatarUrl}
                      onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                      placeholder="https://..."
                      data-testid="input-instructor-avatar"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>Biografía</Label>
                  <Textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Descripción profesional del instructor"
                    data-testid="input-instructor-bio"
                  />
                </div>

                <div className="space-y-2">
                  <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>Especializaciones</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newSpecialization}
                      onChange={(e) => setNewSpecialization(e.target.value)}
                      placeholder="ej: Gramática Avanzada"
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSpecialization())}
                    />
                    <Button type="button" onClick={addSpecialization} variant="outline">
                      Agregar
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.specializations.map((spec) => (
                      <Badge key={spec} variant="secondary" className="cursor-pointer" onClick={() => removeSpecialization(spec)}>
                        {spec} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>Idiomas</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newLanguage}
                      onChange={(e) => setNewLanguage(e.target.value)}
                      placeholder="ej: Español, Inglés"
                      onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addLanguage())}
                    />
                    <Button type="button" onClick={addLanguage} variant="outline">
                      Agregar
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.languages.map((lang) => (
                      <Badge key={lang} variant="secondary" className="cursor-pointer" onClick={() => removeLanguage(lang)}>
                        {lang} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>Calificación</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      value={formData.rating}
                      onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                      data-testid="input-instructor-rating"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>Total de Labs Impartidos</Label>
                    <Input
                      type="number"
                      value={formData.totalLabs}
                      onChange={(e) => setFormData({ ...formData, totalLabs: parseInt(e.target.value) || 0 })}
                      data-testid="input-instructor-labs"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>Activo</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit-instructor"
                  >
                    {editingInstructor ? "Guardar Cambios" : "Crear Instructor"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <p className="text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              Cargando instructores...
            </p>
          ) : instructors?.length === 0 ? (
            <Card className="p-8 text-center col-span-full">
              <UserCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                No hay instructores registrados. Crea tu primer instructor.
              </p>
            </Card>
          ) : (
            instructors?.map((instructor) => (
              <Card key={instructor.id} className="p-4" data-testid={`card-instructor-${instructor.id}`}>
                <div className="flex items-start gap-4">
                  <div 
                    className="w-16 h-16 flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#33CBFB' }}
                  >
                    {instructor.avatarUrl ? (
                      <img src={instructor.avatarUrl} alt={instructor.name} className="w-full h-full object-cover" />
                    ) : (
                      <UserCheck className="w-8 h-8 text-black" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold truncate" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {instructor.name}
                      </h3>
                      <Badge 
                        variant={instructor.isActive ? "default" : "secondary"}
                        style={{ backgroundColor: instructor.isActive ? '#10B981' : undefined }}
                      >
                        {instructor.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {instructor.bio || "Sin biografía"}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span>{instructor.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Award className="w-4 h-4 text-[#33CBFB]" />
                        <span>{instructor.totalLabs} labs</span>
                      </div>
                      {instructor.languages && instructor.languages.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Globe className="w-4 h-4 text-muted-foreground" />
                          <span>{instructor.languages.length}</span>
                        </div>
                      )}
                    </div>
                    {instructor.specializations && instructor.specializations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {instructor.specializations.slice(0, 3).map((spec) => (
                          <Badge key={spec} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                        {instructor.specializations.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{instructor.specializations.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => toggleActiveMutation.mutate({ id: instructor.id, isActive: !instructor.isActive })}
                    data-testid={`button-toggle-instructor-${instructor.id}`}
                  >
                    {instructor.isActive ? "Desactivar" : "Activar"}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEdit(instructor)}
                    data-testid={`button-edit-instructor-${instructor.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(instructor.id)}
                    data-testid={`button-delete-instructor-${instructor.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
