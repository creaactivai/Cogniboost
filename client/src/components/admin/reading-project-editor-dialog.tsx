/**
 * Admin editor dialog for Reading Projects.
 *
 * One Reading Project per module (idempotent on moduleId). Admin can edit
 * title, passage, passing score, and toggle published state. Per-question
 * editing is read-only in v1 (shown collapsed) — full question editing UI
 * lands in a follow-up if needed.
 *
 * Used inside the admin course-lessons page (one card per module).
 */

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Pencil, Save, BookOpen, ChevronDown, ChevronUp } from "lucide-react";

export interface ReadingQuestion {
  id: string;
  type: "multiple_choice" | "true_false" | "fill_in";
  questionText: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

export interface ReadingProjectData {
  id: string;
  moduleId: string;
  level: string;
  title: string;
  passage: string;
  wordCount?: number | null;
  questions: ReadingQuestion[];
  passingScore: number;
  estimatedReadMinutes?: number | null;
  isPublished: boolean;
}

interface Props {
  project: ReadingProjectData;
  courseId: string;
}

export function ReadingProjectEditorDialog({ project, courseId }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [passage, setPassage] = useState(project.passage);
  const [passingScore, setPassingScore] = useState(project.passingScore);
  const [isPublished, setIsPublished] = useState(project.isPublished);
  const [showQuestions, setShowQuestions] = useState(false);

  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    if (open) {
      setTitle(project.title);
      setPassage(project.passage);
      setPassingScore(project.passingScore);
      setIsPublished(project.isPublished);
      setShowQuestions(false);
    }
  }, [open, project]);

  const save = useMutation({
    mutationFn: async () => {
      const body: any = {
        title,
        passage,
        wordCount: passage.trim().split(/\s+/).filter(Boolean).length,
        passingScore,
        isPublished,
      };
      const r = await apiRequest("PATCH", `/api/admin/reading-projects/${project.id}`, body);
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/admin/reading-projects/by-course/${courseId}`] });
      toast({ title: "Reading actualizado" });
      setOpen(false);
    },
    onError: (e: any) => toast({ title: "Error al guardar", description: e?.message, variant: "destructive" }),
  });

  const wordCountLive = passage.trim().split(/\s+/).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            Reading Project · <Badge variant="outline" className="text-xs">{project.level}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="r-title" className="text-xs uppercase tracking-widest">Título</Label>
            <Input id="r-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="r-passage" className="text-xs uppercase tracking-widest">Pasaje (lectura)</Label>
              <span className="text-xs font-mono text-muted-foreground tabular-nums">{wordCountLive} palabras</span>
            </div>
            <Textarea
              id="r-passage"
              value={passage}
              onChange={(e) => setPassage(e.target.value)}
              className="min-h-[260px] text-sm leading-relaxed"
              placeholder="Texto que el estudiante va a leer…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="r-passing" className="text-xs uppercase tracking-widest">Puntaje para aprobar</Label>
              <Input
                id="r-passing"
                type="number"
                min={0}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
              />
            </div>
            <div className="flex items-end justify-between rounded-md border px-3 py-2">
              <div>
                <Label htmlFor="r-pub" className="text-xs uppercase tracking-widest">Publicado</Label>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Solo visible para estudiantes si está publicado.
                </p>
              </div>
              <Switch id="r-pub" checked={isPublished} onCheckedChange={setIsPublished} />
            </div>
          </div>

          {/* Questions — read-only listing in v1 */}
          <div className="rounded-md border">
            <button
              type="button"
              onClick={() => setShowQuestions(!showQuestions)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50"
            >
              <span className="font-mono text-xs uppercase tracking-widest">
                Preguntas ({project.questions?.length || 0})
              </span>
              {showQuestions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showQuestions && (
              <div className="border-t p-3 space-y-2 max-h-[280px] overflow-y-auto bg-muted/20">
                {project.questions?.map((q, i) => (
                  <div key={q.id} className="p-2.5 rounded border bg-card text-xs space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="font-bold tabular-nums text-emerald-600">{i + 1}.</span>
                      <p className="font-semibold flex-1">{q.questionText}</p>
                      <Badge variant="outline" className="text-[9px] flex-shrink-0">{q.type}</Badge>
                    </div>
                    {q.options && (
                      <ul className="ml-5 space-y-0.5 text-muted-foreground">
                        {q.options.map((opt, oi) => (
                          <li key={oi}>
                            <span className="font-mono">{String.fromCharCode(65 + oi)})</span> {opt}
                            {String(oi) === String(q.correctAnswer) && (
                              <span className="ml-2 text-emerald-600 font-semibold">✓ correct</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {!q.options && (
                      <p className="ml-5 text-emerald-600">
                        <span className="font-semibold">Respuesta correcta:</span> {q.correctAnswer}
                      </p>
                    )}
                    {q.explanation && (
                      <p className="ml-5 text-muted-foreground italic">{q.explanation}</p>
                    )}
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground italic pt-1">
                  (Edición de preguntas próximamente — por ahora pídeme cambios y los aplico.)
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              <Save className="w-4 h-4 mr-1.5" />
              {save.isPending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
