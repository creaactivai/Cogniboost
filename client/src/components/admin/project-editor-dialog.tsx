/**
 * Admin editor dialog for Speaking + Writing Projects.
 *
 * Shared component for both project types — the only differences between
 * speaking and writing are the duration vs word-count fields, handled via
 * the `type` prop.
 *
 * Used inside the admin course-lessons page (one per module).
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
import { X, Pencil, Save, Mic, PenLine } from "lucide-react";

type ProjectType = "speaking" | "writing";

export interface ProjectData {
  id: string;
  moduleId: string;
  level: string;
  title: string;
  prompt: string;
  targetVocabulary: string[];
  targetGrammar: string[];
  targetExpressions: string[];
  targetDurationSeconds?: number;       // speaking
  targetWordCountMin?: number;          // writing
  targetWordCountMax?: number;          // writing
  isPublished: boolean;
}

interface ProjectEditorDialogProps {
  type: ProjectType;
  project: ProjectData;
}

export function ProjectEditorDialog({ type, project }: ProjectEditorDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [prompt, setPrompt] = useState(project.prompt);
  const [vocab, setVocab] = useState<string[]>(project.targetVocabulary);
  const [grammar, setGrammar] = useState<string[]>(project.targetGrammar);
  const [expressions, setExpressions] = useState<string[]>(project.targetExpressions);
  const [durationSec, setDurationSec] = useState(project.targetDurationSeconds ?? 60);
  const [wordMin, setWordMin] = useState(project.targetWordCountMin ?? 40);
  const [wordMax, setWordMax] = useState(project.targetWordCountMax ?? 80);
  const [isPublished, setIsPublished] = useState(project.isPublished);

  const [vocabInput, setVocabInput] = useState("");
  const [grammarInput, setGrammarInput] = useState("");
  const [expressionsInput, setExpressionsInput] = useState("");

  const { toast } = useToast();
  const qc = useQueryClient();

  // Reset form when reopening the dialog or when project prop changes
  useEffect(() => {
    if (open) {
      setTitle(project.title);
      setPrompt(project.prompt);
      setVocab(project.targetVocabulary);
      setGrammar(project.targetGrammar);
      setExpressions(project.targetExpressions);
      setDurationSec(project.targetDurationSeconds ?? 60);
      setWordMin(project.targetWordCountMin ?? 40);
      setWordMax(project.targetWordCountMax ?? 80);
      setIsPublished(project.isPublished);
    }
  }, [open, project]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = `/api/admin/${type}-projects/${project.id}`;
      const body: Record<string, any> = {
        title,
        prompt,
        targetVocabulary: vocab,
        targetGrammar: grammar,
        targetExpressions: expressions,
        isPublished,
      };
      if (type === "speaking") body.targetDurationSeconds = Number(durationSec);
      else {
        body.targetWordCountMin = Number(wordMin);
        body.targetWordCountMax = Number(wordMax);
      }
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Save failed (${res.status})`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: type === "speaking" ? "Speaking Project actualizado" : "Writing Project actualizado" });
      qc.invalidateQueries({ queryKey: [`/api/admin/${type}-projects/by-course`] });
      qc.invalidateQueries({ queryKey: [`/api/${type}-projects/by-module/${project.moduleId}`] });
      setOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error al guardar", description: err?.message || "Reintenta", variant: "destructive" });
    },
  });

  const colorScheme = type === "speaking" ? "#9333EA" : "#0EA5E9";
  const IconComp = type === "speaking" ? Mic : PenLine;
  const label = type === "speaking" ? "Speaking Project" : "Writing Project";

  function addItem(value: string, setter: (s: string) => void, list: string[], setList: (l: string[]) => void) {
    const v = value.trim();
    if (!v) return;
    if (list.includes(v)) { setter(""); return; }
    setList([...list, v]);
    setter("");
  }
  function removeItem(idx: number, list: string[], setList: (l: string[]) => void) {
    setList(list.filter((_, i) => i !== idx));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid={`button-edit-${type}-project-${project.id}`}>
          <Pencil className="w-3 h-3 mr-1" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconComp className="w-5 h-5" style={{ color: colorScheme }} />
            <span>Editar {label}</span>
            <Badge variant="outline">{project.level}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Published toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div>
              <Label className="text-sm">Estado</Label>
              <p className="text-xs text-muted-foreground">
                {isPublished ? "Visible para estudiantes" : "Solo visible para staff (borrador)"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${!isPublished ? "font-bold" : ""}`}>Borrador</span>
              <Switch
                checked={isPublished}
                onCheckedChange={setIsPublished}
                data-testid={`switch-published-${type}-${project.id}`}
              />
              <span className={`text-xs ${isPublished ? "font-bold text-green-600" : ""}`}>Publicado</span>
            </div>
          </div>

          {/* Title */}
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
          </div>

          {/* Prompt */}
          <div>
            <Label>Prompt para el estudiante</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="mt-1 font-mono text-sm"
            />
          </div>

          {/* Duration / Word count */}
          {type === "speaking" ? (
            <div>
              <Label>Duración objetivo (segundos)</Label>
              <Input
                type="number"
                min={15}
                max={600}
                value={durationSec}
                onChange={(e) => setDurationSec(Number(e.target.value))}
                className="mt-1 max-w-[120px]"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Palabras mínimas</Label>
                <Input
                  type="number"
                  min={10}
                  max={2000}
                  value={wordMin}
                  onChange={(e) => setWordMin(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Palabras máximas</Label>
                <Input
                  type="number"
                  min={10}
                  max={2000}
                  value={wordMax}
                  onChange={(e) => setWordMax(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Vocabulary chips */}
          <ChipEditor
            label="Vocabulario objetivo"
            list={vocab}
            setList={setVocab}
            inputValue={vocabInput}
            setInputValue={setVocabInput}
            onAdd={() => addItem(vocabInput, setVocabInput, vocab, setVocab)}
            onRemove={(i) => removeItem(i, vocab, setVocab)}
            color={colorScheme}
            placeholder="Agrega una palabra y presiona Enter"
          />

          {/* Grammar chips */}
          <ChipEditor
            label="Gramática objetivo"
            list={grammar}
            setList={setGrammar}
            inputValue={grammarInput}
            setInputValue={setGrammarInput}
            onAdd={() => addItem(grammarInput, setGrammarInput, grammar, setGrammar)}
            onRemove={(i) => removeItem(i, grammar, setGrammar)}
            color={colorScheme}
            placeholder="Agrega una estructura gramatical"
          />

          {/* Expressions chips */}
          <ChipEditor
            label="Expresiones objetivo"
            list={expressions}
            setList={setExpressions}
            inputValue={expressionsInput}
            setInputValue={setExpressionsInput}
            onAdd={() => addItem(expressionsInput, setExpressionsInput, expressions, setExpressions)}
            onRemove={(i) => removeItem(i, expressions, setExpressions)}
            color={colorScheme}
            placeholder='Ej: "Hi, my name is..."'
          />

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-3 border-t">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saveMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                "Guardando…"
              ) : (
                <span className="inline-flex items-center gap-2"><Save className="w-4 h-4" /> Guardar</span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ChipEditorProps {
  label: string;
  list: string[];
  setList: (l: string[]) => void;
  inputValue: string;
  setInputValue: (s: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  color: string;
  placeholder: string;
}

function ChipEditor({ label, list, inputValue, setInputValue, onAdd, onRemove, color, placeholder }: ChipEditorProps) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1 mt-1 mb-2 min-h-[32px] p-2 border rounded">
        {list.length === 0 && (
          <span className="text-xs text-muted-foreground">Sin items todavía…</span>
        )}
        {list.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full text-white"
            style={{ backgroundColor: color }}
          >
            {item}
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="hover:bg-white/30 rounded-full p-0.5"
              aria-label={`Eliminar ${item}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          Agregar
        </Button>
      </div>
    </div>
  );
}
