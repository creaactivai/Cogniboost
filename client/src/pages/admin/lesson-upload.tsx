import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Upload, FileText, Check, X, Loader2, FileUp, Trash2 } from "lucide-react";
import type { Course, CourseModule } from "@shared/schema";

interface UploadedFile {
  filename: string;
  htmlContent: string;
  parsed?: {
    title: string;
    level: string;
    week: number;
    lessonNum: number;
    duration: number;
  };
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
  lessonId?: string;
}

export default function LessonUpload() {
  const { toast } = useToast();
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedModule, setSelectedModule] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["/api/admin/courses"],
  });

  const { data: modules = [] } = useQuery<CourseModule[]>({
    queryKey: ["/api/admin/courses", selectedCourse, "modules"],
    enabled: !!selectedCourse,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: UploadedFile) => {
      const response = await apiRequest("POST", "/api/admin/lessons/upload-html", {
        htmlContent: file.htmlContent,
        filename: file.filename,
        courseId: selectedCourse,
        moduleId: selectedModule || undefined,
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      setUploadedFiles(prev => prev.map(f => 
        f.filename === variables.filename 
          ? { ...f, status: "success" as const, lessonId: data.lesson.id, parsed: data.parsed }
          : f
      ));
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lessons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses", selectedCourse, "lessons"] });
    },
    onError: (error: any, variables) => {
      setUploadedFiles(prev => prev.map(f => 
        f.filename === variables.filename 
          ? { ...f, status: "error" as const, error: error.message || "Error al subir" }
          : f
      ));
    },
  });

  const bulkUploadMutation = useMutation({
    mutationFn: async (files: UploadedFile[]) => {
      const response = await apiRequest("POST", "/api/admin/lessons/bulk-upload-html", {
        files: files.map(f => ({ htmlContent: f.htmlContent, filename: f.filename })),
        courseId: selectedCourse,
        moduleId: selectedModule || undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setUploadedFiles(prev => prev.map(f => {
        const result = data.results?.find((r: any) => r.filename === f.filename);
        const error = data.errors?.find((e: any) => e.filename === f.filename);
        if (result) {
          return { ...f, status: "success" as const, lessonId: result.lesson.id, parsed: result.parsed };
        }
        if (error) {
          return { ...f, status: "error" as const, error: error.error };
        }
        return f;
      }));
      
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lessons"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses", selectedCourse, "lessons"] });
      
      toast({
        title: "Carga completada",
        description: `${data.success} lecciones subidas, ${data.failed} errores`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error en carga masiva",
        description: error.message || "No se pudieron subir las lecciones",
        variant: "destructive",
      });
    },
  });

  const handleFileRead = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const htmlContent = e.target?.result as string;
      
      let title = file.name.replace(".html", "");
      const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) title = titleMatch[1].trim();
      const h1Match = htmlContent.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      if (h1Match) title = h1Match[1].trim();
      
      let level = "A1", week = 1, lessonNum = 1, duration = 15;
      const filePattern = /([abc][12])w(\d+)l(\d+)/i;
      const fileMatch = file.name.match(filePattern);
      if (fileMatch) {
        level = fileMatch[1].toUpperCase();
        week = parseInt(fileMatch[2]);
        lessonNum = parseInt(fileMatch[3]);
      }
      
      const durationMatch = htmlContent.match(/Duration:\s*(\d+)\s*minutes/i);
      if (durationMatch) duration = parseInt(durationMatch[1]);
      
      setUploadedFiles(prev => [...prev, {
        filename: file.name,
        htmlContent,
        parsed: { title, level, week, lessonNum, duration },
        status: "pending",
      }]);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith(".html"));
    files.forEach(handleFileRead);
  }, [handleFileRead]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.name.endsWith(".html"));
    files.forEach(handleFileRead);
    e.target.value = "";
  }, [handleFileRead]);

  const handleUploadAll = () => {
    const pendingFiles = uploadedFiles.filter(f => f.status === "pending");
    if (pendingFiles.length === 0) {
      toast({ title: "No hay archivos pendientes", variant: "destructive" });
      return;
    }
    if (!selectedCourse) {
      toast({ title: "Selecciona un curso primero", variant: "destructive" });
      return;
    }
    
    pendingFiles.forEach(f => {
      setUploadedFiles(prev => prev.map(file => 
        file.filename === f.filename ? { ...file, status: "uploading" as const } : file
      ));
    });
    
    bulkUploadMutation.mutate(pendingFiles);
  };

  const handleUploadSingle = (file: UploadedFile) => {
    if (!selectedCourse) {
      toast({ title: "Selecciona un curso primero", variant: "destructive" });
      return;
    }
    
    setUploadedFiles(prev => prev.map(f => 
      f.filename === file.filename ? { ...f, status: "uploading" as const } : f
    ));
    
    uploadMutation.mutate(file);
  };

  const handleRemoveFile = (filename: string) => {
    setUploadedFiles(prev => prev.filter(f => f.filename !== filename));
  };

  const handleClearAll = () => {
    setUploadedFiles([]);
  };

  const pendingCount = uploadedFiles.filter(f => f.status === "pending").length;
  const successCount = uploadedFiles.filter(f => f.status === "success").length;
  const errorCount = uploadedFiles.filter(f => f.status === "error").length;

  return (
    <AdminLayout title="Subir Lecciones">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display uppercase mb-2">Subir Lecciones</h1>
          <p className="font-mono text-muted-foreground">
            Arrastra archivos HTML de lecciones para importarlos al curso
          </p>
        </div>

        <Card className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="font-mono text-sm mb-2 block">Curso destino</Label>
              <Select value={selectedCourse} onValueChange={(v) => { setSelectedCourse(v); setSelectedModule(""); }}>
                <SelectTrigger data-testid="select-course">
                  <SelectValue placeholder="Selecciona un curso" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title} ({course.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="font-mono text-sm mb-2 block">Módulo (opcional)</Label>
              <Select 
                value={selectedModule || "none"} 
                onValueChange={(val) => setSelectedModule(val === "none" ? "" : val)} 
                disabled={!selectedCourse}
              >
                <SelectTrigger data-testid="select-module">
                  <SelectValue placeholder="Sin módulo específico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin módulo específico</SelectItem>
                  {modules.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            data-testid="drop-zone"
          >
            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-mono text-lg mb-2">
              Arrastra archivos HTML aquí
            </p>
            <p className="font-mono text-sm text-muted-foreground mb-4">
              o haz clic para seleccionar archivos
            </p>
            <input
              type="file"
              accept=".html"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              data-testid="file-input"
            />
            <label htmlFor="file-upload">
              <Button variant="outline" className="font-mono" asChild>
                <span>
                  <FileUp className="w-4 h-4 mr-2" />
                  Seleccionar archivos
                </span>
              </Button>
            </label>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm">
                    {uploadedFiles.length} archivo(s)
                  </span>
                  {pendingCount > 0 && (
                    <Badge variant="secondary">{pendingCount} pendientes</Badge>
                  )}
                  {successCount > 0 && (
                    <Badge className="bg-green-500">{successCount} subidos</Badge>
                  )}
                  {errorCount > 0 && (
                    <Badge variant="destructive">{errorCount} errores</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleClearAll}
                    className="font-mono"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Limpiar
                  </Button>
                  <Button 
                    onClick={handleUploadAll}
                    disabled={pendingCount === 0 || !selectedCourse || bulkUploadMutation.isPending}
                    className="font-mono"
                    data-testid="button-upload-all"
                  >
                    {bulkUploadMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Subir todos ({pendingCount})
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {uploadedFiles.map((file) => (
                  <div 
                    key={file.filename}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      file.status === "success" 
                        ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" 
                        : file.status === "error"
                        ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                        : "bg-muted/50 border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-mono text-sm font-medium">
                          {file.parsed?.title || file.filename}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {file.parsed && (
                            <>
                              {file.parsed.level} · Semana {file.parsed.week} · Lección {file.parsed.lessonNum} · {file.parsed.duration} min
                            </>
                          )}
                          {file.error && (
                            <span className="text-red-500">{file.error}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.status === "pending" && (
                        <>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleUploadSingle(file)}
                            disabled={!selectedCourse}
                          >
                            <Upload className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleRemoveFile(file.filename)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {file.status === "uploading" && (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      )}
                      {file.status === "success" && (
                        <Check className="w-5 h-5 text-green-500" />
                      )}
                      {file.status === "error" && (
                        <X className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-mono font-semibold mb-4">Formato de archivos</h3>
          <div className="space-y-3 font-mono text-sm text-muted-foreground">
            <p>Los archivos HTML deben seguir el formato:</p>
            <code className="block bg-muted p-3 rounded">
              a1w1l1-slides.html → Nivel A1, Semana 1, Lección 1
            </code>
            <p>El sistema detecta automáticamente:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Título desde &lt;title&gt; o &lt;h1&gt;</li>
              <li>Duración desde "Duration: X minutes"</li>
              <li>Nivel, semana y lección desde el nombre del archivo</li>
            </ul>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
