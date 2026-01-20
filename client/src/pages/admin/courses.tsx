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
import { Plus, Pencil, Trash2, BookOpen, Eye, EyeOff, FileText } from "lucide-react";
import { Link } from "wouter";
import type { Course, CourseCategory } from "@shared/schema";

const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function AdminCourses() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    level: "A1",
    topic: "",
    duration: "",
    modulesCount: 1,
    lessonsCount: 0,
    thumbnailUrl: "",
    isPublished: false,
    isPremium: false,
  });

  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey: ["/api/admin/courses"],
  });

  const { data: categories = [] } = useQuery<CourseCategory[]>({
    queryKey: ["/api/admin/course-categories"],
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; displayName: string }) => {
      const response = await apiRequest("POST", "/api/admin/course-categories", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/course-categories"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => apiRequest("POST", "/api/admin/courses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses"] });
      toast({ title: "Curso creado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al crear curso", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData> }) =>
      apiRequest("PATCH", `/api/admin/courses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses"] });
      toast({ title: "Curso actualizado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al actualizar curso", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/courses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses"] });
      toast({ title: "Curso eliminado exitosamente" });
    },
    onError: () => {
      toast({ title: "Error al eliminar curso", variant: "destructive" });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      apiRequest("PATCH", `/api/admin/courses/${id}`, { isPublished }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses"] });
      toast({ title: "Estado de publicación actualizado" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      level: "A1",
      topic: "",
      duration: "",
      modulesCount: 1,
      lessonsCount: 0,
      thumbnailUrl: "",
      isPublished: false,
      isPremium: false,
    });
    setEditingCourse(null);
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    // Get the display name for the topic
    const categoryDisplayName = categories.find(c => c.name === course.topic)?.displayName || course.topic;
    setFormData({
      title: course.title,
      description: course.description || "",
      level: course.level,
      topic: categoryDisplayName,
      duration: course.duration || "",
      modulesCount: (course as any).modulesCount || 1,
      lessonsCount: course.lessonsCount,
      thumbnailUrl: course.thumbnailUrl || "",
      isPublished: course.isPublished,
      isPremium: course.isPremium,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.topic.trim()) {
      toast({ title: "Por favor ingresa una categoría", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    // Normalize the topic name
    const topicName = formData.topic.trim().toLowerCase().replace(/\s+/g, '_');
    const topicDisplayName = formData.topic.trim();
    
    // Check if category exists, if not create it
    const existingCategory = categories.find(c => c.name === topicName || c.displayName.toLowerCase() === topicDisplayName.toLowerCase());
    
    if (!existingCategory) {
      try {
        await createCategoryMutation.mutateAsync({ name: topicName, displayName: topicDisplayName });
      } catch (error) {
        // Category might already exist (race condition), continue
      }
    }

    const courseData = { ...formData, topic: topicName };
    
    try {
      if (editingCourse) {
        await updateMutation.mutateAsync({ id: editingCourse.id, data: courseData });
      } else {
        await createMutation.mutateAsync(courseData);
      }
      // Explicitly close dialog and reset form after successful mutation
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      // Error handling is done in mutation's onError
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout title="Gestión de Cursos">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {courses?.length || 0} cursos en total
          </p>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!isSubmitting) { setIsDialogOpen(open); if (!open) resetForm(); } }}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-course">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Curso
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  {editingCourse ? "Editar Curso" : "Crear Nuevo Curso"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>Título</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Título del curso"
                      required
                      data-testid="input-course-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>Nivel</Label>
                    <Select value={formData.level} onValueChange={(v) => setFormData({ ...formData, level: v })}>
                      <SelectTrigger data-testid="select-course-level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {levels.map((level) => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
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
                    placeholder="Descripción del curso"
                    data-testid="input-course-description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>Categoría</Label>
                    <Input
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      placeholder="Escribe o selecciona una categoría"
                      list="category-suggestions"
                      required
                      data-testid="input-course-topic"
                    />
                    <datalist id="category-suggestions">
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.displayName} />
                      ))}
                    </datalist>
                    {categories.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Categorías existentes: {categories.map(c => c.displayName).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>Duración</Label>
                    <Input
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="ej: 4 semanas"
                      data-testid="input-course-duration"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>Número de Módulos</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.modulesCount}
                      onChange={(e) => setFormData({ ...formData, modulesCount: Math.max(1, parseInt(e.target.value) || 1) })}
                      data-testid="input-course-modules"
                      disabled={!!editingCourse}
                    />
                    {!editingCourse && (
                      <p className="text-xs text-muted-foreground">
                        Los módulos se crearán automáticamente al guardar
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>URL de Imagen</Label>
                    <Input
                      value={formData.thumbnailUrl}
                      onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                      placeholder="https://..."
                      data-testid="input-course-thumbnail"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>Publicado</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPremium}
                      onChange={(e) => setFormData({ ...formData, isPremium: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>Premium</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    data-testid="button-submit-course"
                  >
                    {isSubmitting ? "Guardando..." : editingCourse ? "Guardar Cambios" : "Crear Curso"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {isLoading ? (
            <p className="text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              Cargando cursos...
            </p>
          ) : courses?.length === 0 ? (
            <Card className="p-8 text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                No hay cursos todavía. Crea tu primer curso.
              </p>
            </Card>
          ) : (
            courses?.map((course) => (
              <Card key={course.id} className="p-4" data-testid={`card-course-${course.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 flex items-center justify-center"
                      style={{ backgroundColor: '#33CBFB' }}
                    >
                      <BookOpen className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h3 className="font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {course.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {course.level} · {categories.find(c => c.name === course.topic)?.displayName || course.topic} · {(course as any).modulesCount || 1} módulos · {course.lessonsCount} lecciones
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={course.isPublished ? "default" : "secondary"}
                      style={{ backgroundColor: course.isPublished ? '#33CBFB' : undefined }}
                    >
                      {course.isPublished ? "Publicado" : "Borrador"}
                    </Badge>
                    {course.isPremium && (
                      <Badge style={{ backgroundColor: '#FD335A' }}>Premium</Badge>
                    )}
                    <Link href={`/admin/courses/${course.id}/lessons`}>
                      <Button
                        size="sm"
                        variant="outline"
                        data-testid={`button-lessons-${course.id}`}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Lecciones
                      </Button>
                    </Link>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => togglePublishMutation.mutate({ id: course.id, isPublished: !course.isPublished })}
                      data-testid={`button-toggle-publish-${course.id}`}
                    >
                      {course.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(course)}
                      data-testid={`button-edit-${course.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(course.id)}
                      data-testid={`button-delete-${course.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
