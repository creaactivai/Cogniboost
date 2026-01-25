import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Video, FileText, Eye, EyeOff, ArrowLeft, GripVertical, Upload, X, ClipboardList, Layers, ExternalLink } from "lucide-react";
import type { Course, Lesson, CourseModule } from "@shared/schema";

interface LessonCardProps {
  lesson: Lesson;
  courseId: string;
  onEdit: (lesson: Lesson) => void;
  onDelete: () => void;
  onTogglePublish: (id: string, isPublished: boolean) => void;
}

function LessonCard({ lesson, courseId, onEdit, onDelete, onTogglePublish }: LessonCardProps) {
  return (
    <Card className="p-4" data-testid={`card-lesson-${lesson.id}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <GripVertical className="w-4 h-4" />
            <span className="text-sm font-mono w-6 text-center">{lesson.orderIndex + 1}</span>
          </div>
          <div 
            className="w-10 h-10 flex items-center justify-center"
            style={{ backgroundColor: lesson.vimeoId ? '#33CBFB' : '#e5e5e5' }}
          >
            <Video className="w-5 h-5" style={{ color: lesson.vimeoId ? 'black' : '#666' }} />
          </div>
          <div>
            <h3 className="font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {lesson.title}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {lesson.duration > 0 && <span>{lesson.duration} min</span>}
              {lesson.pdfMaterials && lesson.pdfMaterials.length > 0 && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {lesson.pdfMaterials.length} PDF
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={lesson.isPublished ? "default" : "secondary"}
            style={{ backgroundColor: lesson.isPublished ? '#33CBFB' : undefined }}
          >
            {lesson.isPublished ? "Publicado" : "Borrador"}
          </Badge>
          {lesson.isPreview && (
            <Badge variant="outline">Vista Previa</Badge>
          )}
          {lesson.isOpen && (
            <Badge variant="outline" className="border-primary text-primary">Abierta</Badge>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => window.open(`/admin/preview/courses/${courseId}`, '_blank')}
            data-testid={`button-preview-lesson-${lesson.id}`}
            title="Vista previa como estudiante"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Link href={`/admin/courses/${courseId}/lessons/${lesson.id}/quiz`}>
            <Button
              size="icon"
              variant="ghost"
              data-testid={`button-quiz-lesson-${lesson.id}`}
              title="Gestionar Quiz"
            >
              <ClipboardList className="w-4 h-4" />
            </Button>
          </Link>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onTogglePublish(lesson.id, !lesson.isPublished)}
            data-testid={`button-toggle-publish-lesson-${lesson.id}`}
          >
            {lesson.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEdit(lesson)}
            data-testid={`button-edit-lesson-${lesson.id}`}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onDelete}
            data-testid={`button-delete-lesson-${lesson.id}`}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function AdminCourseLessons() {
  const { id: courseId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    moduleId: "" as string | null,
    vimeoId: "",
    duration: 0,
    orderIndex: 0,
    pdfMaterials: [] as string[],
    isPreview: false,
    isOpen: false,
    isPublished: false,
  });

  const { data: course, isLoading: courseLoading } = useQuery<Course>({
    queryKey: [`/api/admin/courses/${courseId}`],
    enabled: !!courseId,
  });

  const { data: lessons, isLoading: lessonsLoading } = useQuery<Lesson[]>({
    queryKey: [`/api/admin/courses/${courseId}/lessons`],
    enabled: !!courseId,
  });

  const { data: modules = [] } = useQuery<CourseModule[]>({
    queryKey: [`/api/admin/courses/${courseId}/modules`],
    enabled: !!courseId,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => 
      apiRequest("POST", "/api/admin/lessons", { ...data, courseId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/courses/${courseId}/lessons`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses"] });
      toast({ title: "Lección creada exitosamente" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error al crear lección", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData> }) =>
      apiRequest("PATCH", `/api/admin/lessons/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/courses/${courseId}/lessons`] });
      toast({ title: "Lección actualizada exitosamente" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Error al actualizar lección", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/lessons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/courses/${courseId}/lessons`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/courses"] });
      toast({ title: "Lección eliminada exitosamente" });
      setLessonToDelete(null);
    },
    onError: () => {
      toast({ title: "Error al eliminar lección", variant: "destructive" });
    },
  });

  const togglePublishMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      apiRequest("PATCH", `/api/admin/lessons/${id}`, { isPublished }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/courses/${courseId}/lessons`] });
      toast({ title: "Estado de publicación actualizado" });
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      moduleId: modules.length > 0 ? modules[0].id : null,
      vimeoId: "",
      duration: 0,
      orderIndex: lessons?.length || 0,
      pdfMaterials: [],
      isPreview: false,
      isOpen: false,
      isPublished: false,
    });
    setEditingLesson(null);
  };

  const handleEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setFormData({
      title: lesson.title,
      description: lesson.description || "",
      moduleId: (lesson as any).moduleId || null,
      vimeoId: lesson.vimeoId || "",
      duration: lesson.duration,
      orderIndex: lesson.orderIndex,
      pdfMaterials: lesson.pdfMaterials || [],
      isPreview: lesson.isPreview,
      isOpen: lesson.isOpen,
      isPublished: lesson.isPublished,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLesson) {
      updateMutation.mutate({ id: editingLesson.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== "application/pdf") {
      toast({ title: "Solo se permiten archivos PDF", variant: "destructive" });
      return;
    }

    setUploadingPdf(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      
      const response = await fetch("/api/upload/pdf", {
        method: "POST",
        body: formDataUpload,
        credentials: "include",
      });
      
      if (!response.ok) throw new Error("Upload failed");
      
      const { url } = await response.json();
      setFormData(prev => ({
        ...prev,
        pdfMaterials: [...prev.pdfMaterials, url],
      }));
      toast({ title: "PDF subido exitosamente" });
    } catch {
      toast({ title: "Error al subir PDF", variant: "destructive" });
    } finally {
      setUploadingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePdf = (index: number) => {
    setFormData(prev => ({
      ...prev,
      pdfMaterials: prev.pdfMaterials.filter((_, i) => i !== index),
    }));
  };

  const extractVimeoId = (input: string): string => {
    const match = input.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
    return match ? match[1] : input;
  };

  if (courseLoading || lessonsLoading) {
    return (
      <AdminLayout title="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!course) {
    return (
      <AdminLayout title="Curso no encontrado">
        <Card className="p-8 text-center">
          <p style={{ fontFamily: 'JetBrains Mono, monospace' }}>El curso no existe.</p>
          <Link href="/admin/courses">
            <Button className="mt-4" variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Cursos
            </Button>
          </Link>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`Lecciones: ${course.title}`}>
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin/courses">
            <Button variant="ghost" size="icon" data-testid="button-back-courses">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
              {course.title}
            </h2>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {course.level} · {lessons?.length || 0} lecciones
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <p className="text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {lessons?.length || 0} lecciones en este curso
          </p>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-lesson">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Lección
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Impact, Arial Black, sans-serif' }}>
                  {editingLesson ? "Editar Lección" : "Crear Nueva Lección"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>Título</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Título de la lección"
                      required
                      data-testid="input-lesson-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>Orden</Label>
                    <Input
                      type="number"
                      value={formData.orderIndex}
                      onChange={(e) => setFormData({ ...formData, orderIndex: parseInt(e.target.value) || 0 })}
                      data-testid="input-lesson-order"
                    />
                  </div>
                </div>

                {modules.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      <Layers className="w-4 h-4" />
                      Módulo
                    </Label>
                    <Select 
                      value={formData.moduleId || ""} 
                      onValueChange={(v) => setFormData({ ...formData, moduleId: v || null })}
                    >
                      <SelectTrigger data-testid="select-lesson-module">
                        <SelectValue placeholder="Selecciona un módulo" />
                      </SelectTrigger>
                      <SelectContent>
                        {modules.sort((a, b) => a.orderIndex - b.orderIndex).map((module) => (
                          <SelectItem key={module.id} value={module.id}>
                            {module.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Asigna esta lección a un módulo del curso
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>Descripción</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción de la lección"
                    rows={3}
                    data-testid="input-lesson-description"
                  />
                </div>

                <div className="p-4 border" style={{ backgroundColor: 'rgba(51, 203, 251, 0.1)' }}>
                  <Label className="flex items-center gap-2 mb-3" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    <Video className="w-4 h-4" />
                    Video de Vimeo
                  </Label>
                  <Input
                    value={formData.vimeoId}
                    onChange={(e) => setFormData({ ...formData, vimeoId: extractVimeoId(e.target.value) })}
                    placeholder="ID de Vimeo o URL completa (ej: 123456789)"
                    data-testid="input-lesson-vimeo"
                  />
                  {formData.vimeoId && (
                    <div className="mt-3 aspect-video bg-black">
                      <iframe
                        src={`https://player.vimeo.com/video/${formData.vimeoId}`}
                        className="w-full h-full"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                  <div className="mt-2 space-y-2">
                    <Label style={{ fontFamily: 'JetBrains Mono, monospace' }}>Duración (minutos)</Label>
                    <Input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                      placeholder="Duración en minutos"
                      data-testid="input-lesson-duration"
                    />
                  </div>
                </div>

                <div className="p-4 border" style={{ backgroundColor: 'rgba(253, 51, 90, 0.1)' }}>
                  <Label className="flex items-center gap-2 mb-3" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    <FileText className="w-4 h-4" />
                    Materiales PDF
                  </Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handlePdfUpload}
                    className="hidden"
                    data-testid="input-lesson-pdf"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPdf}
                    data-testid="button-upload-pdf"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingPdf ? "Subiendo..." : "Subir PDF"}
                  </Button>
                  {formData.pdfMaterials.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {formData.pdfMaterials.map((url, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-background border">
                          <a 
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm truncate flex-1 hover:underline"
                            style={{ fontFamily: 'JetBrains Mono, monospace', color: '#33CBFB' }}
                          >
                            {url.split('/').pop()}
                          </a>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => removePdf(index)}
                          >
                            <X className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPreview}
                      onChange={(e) => setFormData({ ...formData, isPreview: e.target.checked })}
                      className="w-4 h-4"
                      data-testid="checkbox-lesson-preview"
                    />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>Vista Previa (gratis)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isOpen}
                      onChange={(e) => setFormData({ ...formData, isOpen: e.target.checked })}
                      className="w-4 h-4"
                      data-testid="checkbox-lesson-open"
                    />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>Lección Abierta (sin prerrequisitos)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                      className="w-4 h-4"
                      data-testid="checkbox-lesson-published"
                    />
                    <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>Publicado</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit-lesson"
                  >
                    {editingLesson ? "Guardar Cambios" : "Crear Lección"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-6">
          {modules.length > 0 ? (
            <>
              {modules.sort((a, b) => a.orderIndex - b.orderIndex).map((module) => {
                const moduleLessons = lessons?.filter((l) => (l as any).moduleId === module.id) || [];
                
                return (
                  <div key={module.id} className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b">
                      <Layers className="w-5 h-5" style={{ color: '#33CBFB' }} />
                      <h3 className="font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {module.title}
                      </h3>
                      <Badge variant="secondary">{moduleLessons.length} lecciones</Badge>
                    </div>
                    {moduleLessons.length === 0 ? (
                      <p className="text-sm text-muted-foreground pl-7">
                        Sin lecciones en este módulo
                      </p>
                    ) : (
                      moduleLessons.sort((a, b) => a.orderIndex - b.orderIndex).map((lesson) => (
                        <LessonCard 
                          key={lesson.id} 
                          lesson={lesson} 
                          courseId={courseId!}
                          onEdit={handleEdit}
                          onDelete={() => setLessonToDelete(lesson)}
                          onTogglePublish={(id, isPublished) => togglePublishMutation.mutate({ id, isPublished })}
                        />
                      ))
                    )}
                  </div>
                );
              })}
              {/* Unassigned lessons section for legacy courses */}
              {(() => {
                const unassignedLessons = lessons?.filter((l) => !(l as any).moduleId) || [];
                if (unassignedLessons.length === 0) return null;
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-dashed">
                      <h3 className="font-bold text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        Sin Módulo Asignado
                      </h3>
                      <Badge variant="outline">{unassignedLessons.length} lecciones</Badge>
                    </div>
                    {unassignedLessons.sort((a, b) => a.orderIndex - b.orderIndex).map((lesson) => (
                      <LessonCard 
                        key={lesson.id} 
                        lesson={lesson} 
                        courseId={courseId!}
                        onEdit={handleEdit}
                        onDelete={() => setLessonToDelete(lesson)}
                        onTogglePublish={(id, isPublished) => togglePublishMutation.mutate({ id, isPublished })}
                      />
                    ))}
                  </div>
                );
              })()}
            </>
          ) : lessons && lessons.length > 0 ? (
            lessons.sort((a, b) => a.orderIndex - b.orderIndex).map((lesson) => (
              <LessonCard 
                key={lesson.id} 
                lesson={lesson} 
                courseId={courseId!}
                onEdit={handleEdit}
                onDelete={() => setLessonToDelete(lesson)}
                onTogglePublish={(id, isPublished) => togglePublishMutation.mutate({ id, isPublished })}
              />
            ))
          ) : (
            <Card className="p-8 text-center">
              <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                No hay lecciones todavía. Crea tu primera lección.
              </p>
            </Card>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!lessonToDelete} onOpenChange={(open) => !open && setLessonToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                ¿Eliminar lección permanentemente?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción no se puede deshacer. Se eliminará permanentemente la lección
                <strong> "{lessonToDelete?.title}"</strong> junto con todo el progreso de estudiantes asociado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => lessonToDelete && deleteMutation.mutate(lessonToDelete.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete-lesson"
              >
                {deleteMutation.isPending ? "Eliminando..." : "Eliminar Permanentemente"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
