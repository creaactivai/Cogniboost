/**
 * Admin Final Exams page — manage the CEFR Mastery Exam catalog.
 *
 * Route: /admin/exams
 *
 * For each of the 5 exams (A1..C1), Coral can:
 *   - Edit exam metadata: title, description, weights, prompts, duration,
 *     publish toggle
 *   - View, edit, add, delete quiz questions tied to specific modules
 *
 * The page itself is a level tabset (A1 | A2 | B1 | B2 | C1). Each tab
 * shows the exam config card + the question bank for that level.
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Card,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Award, Plus, Pencil, Trash2, ArrowLeft, BookOpen, AlertTriangle } from "lucide-react";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;

interface FinalExam {
  id: string;
  level: string;
  title: string;
  description: string;
  passingScore: number;
  quizWeight: number;
  writingWeight: number;
  speakingWeight: number;
  writingPrompt: string;
  writingMinWords: number;
  writingMaxWords: number;
  speakingPrompt: string;
  speakingMinSeconds: number;
  speakingMaxSeconds: number;
  durationMinutes: number;
  isPublished: boolean;
}

interface FinalExamQuestion {
  id: string;
  examId: string;
  moduleId: string | null;
  questionType: "multiple_choice" | "fill_in" | "true_false";
  questionText: string;
  options: string[] | null;
  correctAnswer: string;
  explanation: string | null;
  cefrDescriptor: string | null;
  points: number;
  orderIndex: number;
}

interface CourseModule {
  id: string;
  title: string;
  orderIndex: number;
}

function ExamConfigCard({ exam, modules }: { exam: FinalExam; modules: CourseModule[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<FinalExam>(exam);
  useEffect(() => setDraft(exam), [exam.id]);

  const save = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("PATCH", `/api/admin/final-exams/${exam.id}`, draft);
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Exam updated" });
      qc.invalidateQueries({ queryKey: ["/api/admin/final-exams"] });
    },
    onError: (e: any) => toast({ title: "Failed", description: e?.message, variant: "destructive" }),
  });

  const totalWeight = draft.quizWeight + draft.writingWeight + draft.speakingWeight;
  const weightOk = totalWeight === 100;

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2"><Award className="w-5 h-5 text-primary" /> Exam Configuration</h3>
        <div className="flex items-center gap-2">
          <Label htmlFor={`pub-${exam.id}`} className="text-sm">Published</Label>
          <Switch
            id={`pub-${exam.id}`}
            checked={draft.isPublished}
            onCheckedChange={(v) => setDraft({ ...draft, isPublished: v })}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Title</Label>
          <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Duration (minutes)</Label>
          <Input type="number" value={draft.durationMinutes} onChange={(e) => setDraft({ ...draft, durationMinutes: Number(e.target.value) })} />
        </div>
      </div>

      <div>
        <Label className="text-xs">Description (shown to student)</Label>
        <Textarea value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={2} />
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Quiz weight (%)</Label>
          <Input type="number" value={draft.quizWeight} onChange={(e) => setDraft({ ...draft, quizWeight: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">Writing weight (%)</Label>
          <Input type="number" value={draft.writingWeight} onChange={(e) => setDraft({ ...draft, writingWeight: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">Speaking weight (%)</Label>
          <Input type="number" value={draft.speakingWeight} onChange={(e) => setDraft({ ...draft, speakingWeight: Number(e.target.value) })} />
        </div>
      </div>
      {!weightOk && (
        <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Weights total {totalWeight}%, should add up to 100.</p>
      )}

      <div>
        <Label className="text-xs">Pass threshold (%)</Label>
        <Input type="number" value={draft.passingScore} onChange={(e) => setDraft({ ...draft, passingScore: Number(e.target.value) })} className="max-w-xs" />
      </div>

      <div className="border-t pt-4 space-y-3">
        <h4 className="font-semibold text-sm">Writing section</h4>
        <Textarea value={draft.writingPrompt || ""} onChange={(e) => setDraft({ ...draft, writingPrompt: e.target.value })} rows={3} placeholder="Writing prompt shown to the student" />
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Min words</Label>
            <Input type="number" value={draft.writingMinWords} onChange={(e) => setDraft({ ...draft, writingMinWords: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs">Max words</Label>
            <Input type="number" value={draft.writingMaxWords} onChange={(e) => setDraft({ ...draft, writingMaxWords: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      <div className="border-t pt-4 space-y-3">
        <h4 className="font-semibold text-sm">Speaking section</h4>
        <Textarea value={draft.speakingPrompt || ""} onChange={(e) => setDraft({ ...draft, speakingPrompt: e.target.value })} rows={3} placeholder="Speaking prompt shown to the student" />
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Min duration (seconds)</Label>
            <Input type="number" value={draft.speakingMinSeconds} onChange={(e) => setDraft({ ...draft, speakingMinSeconds: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs">Max duration (seconds)</Label>
            <Input type="number" value={draft.speakingMaxSeconds} onChange={(e) => setDraft({ ...draft, speakingMaxSeconds: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </Card>
  );
}

function QuestionEditor({
  exam,
  modules,
  existing,
  onClose,
}: {
  exam: FinalExam;
  modules: CourseModule[];
  existing?: FinalExamQuestion;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = !!existing;
  const [q, setQ] = useState<Partial<FinalExamQuestion>>(
    existing || {
      examId: exam.id,
      moduleId: null,
      questionType: "multiple_choice",
      questionText: "",
      options: ["", "", "", ""],
      correctAnswer: "0",
      explanation: "",
      cefrDescriptor: "",
      points: 1,
      orderIndex: 0,
    }
  );

  const save = useMutation({
    mutationFn: async () => {
      const url = isEdit
        ? `/api/admin/final-exam-questions/${existing.id}`
        : "/api/admin/final-exam-questions";
      const method = isEdit ? "PATCH" : "POST";
      const r = await apiRequest(method, url, q);
      return r.json();
    },
    onSuccess: () => {
      toast({ title: isEdit ? "Question updated" : "Question added" });
      qc.invalidateQueries({ queryKey: [`/api/admin/final-exams/${exam.id}/questions`] });
      onClose();
    },
    onError: (e: any) => toast({ title: "Failed", description: e?.message, variant: "destructive" }),
  });

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit question" : "Add question"}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div>
          <Label className="text-xs">Module (which lesson group teaches this?)</Label>
          <Select value={q.moduleId || ""} onValueChange={(v) => setQ({ ...q, moduleId: v || null })}>
            <SelectTrigger><SelectValue placeholder="Select module…" /></SelectTrigger>
            <SelectContent>
              {modules.map((m, i) => (
                <SelectItem key={m.id} value={m.id}>{i + 1}. {m.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Question type</Label>
          <Select value={q.questionType} onValueChange={(v: any) => setQ({ ...q, questionType: v, options: v === "multiple_choice" ? ["", "", "", ""] : null, correctAnswer: v === "true_false" ? "true" : "0" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="multiple_choice">Multiple choice</SelectItem>
              <SelectItem value="fill_in">Fill in the blank</SelectItem>
              <SelectItem value="true_false">True / False</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Question text</Label>
          <Textarea value={q.questionText || ""} onChange={(e) => setQ({ ...q, questionText: e.target.value })} rows={2} />
        </div>

        {q.questionType === "multiple_choice" && (
          <div className="space-y-2">
            <Label className="text-xs">Options (select the correct one)</Label>
            {(q.options || []).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQ({ ...q, correctAnswer: String(i) })}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${q.correctAnswer === String(i) ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}
                  title="Click to mark correct"
                >
                  {String.fromCharCode(65 + i)}
                </button>
                <Input
                  value={opt}
                  onChange={(e) => {
                    const opts = [...(q.options || [])];
                    opts[i] = e.target.value;
                    setQ({ ...q, options: opts });
                  }}
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                />
              </div>
            ))}
          </div>
        )}

        {q.questionType === "fill_in" && (
          <div>
            <Label className="text-xs">Correct answer (exact text, case-insensitive)</Label>
            <Input value={q.correctAnswer} onChange={(e) => setQ({ ...q, correctAnswer: e.target.value })} />
          </div>
        )}

        {q.questionType === "true_false" && (
          <div>
            <Label className="text-xs">Correct answer</Label>
            <Select value={q.correctAnswer} onValueChange={(v) => setQ({ ...q, correctAnswer: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">True</SelectItem>
                <SelectItem value="false">False</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label className="text-xs">Explanation (shown to student after grading)</Label>
          <Textarea value={q.explanation || ""} onChange={(e) => setQ({ ...q, explanation: e.target.value })} rows={2} />
        </div>

        <div>
          <Label className="text-xs">CEFR descriptor (can-do statement this tests)</Label>
          <Input value={q.cefrDescriptor || ""} onChange={(e) => setQ({ ...q, cefrDescriptor: e.target.value })} placeholder='e.g. "A1: Can use everyday polite greetings."' />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Points</Label>
            <Input type="number" value={q.points || 1} onChange={(e) => setQ({ ...q, points: Number(e.target.value) })} />
          </div>
          <div>
            <Label className="text-xs">Order</Label>
            <Input type="number" value={q.orderIndex || 0} onChange={(e) => setQ({ ...q, orderIndex: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? "Saving…" : isEdit ? "Update question" : "Add question"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function QuestionsList({ exam, modules }: { exam: FinalExam; modules: CourseModule[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: questions = [], isLoading } = useQuery<FinalExamQuestion[]>({
    queryKey: [`/api/admin/final-exams/${exam.id}/questions`],
  });
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<FinalExamQuestion | null>(null);

  const moduleTitle = useMemo(() => {
    const map = new Map(modules.map((m, i) => [m.id, `M${i + 1} · ${m.title}`]));
    return (id: string | null) => (id ? map.get(id) || "—" : "—");
  }, [modules]);

  const del = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/final-exam-questions/${id}`, {});
    },
    onSuccess: () => {
      toast({ title: "Question deleted" });
      qc.invalidateQueries({ queryKey: [`/api/admin/final-exams/${exam.id}/questions`] });
    },
  });

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Question bank
          <Badge variant="secondary">{questions.length} questions</Badge>
        </h3>
        <Dialog open={adding} onOpenChange={setAdding}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add question</Button>
          </DialogTrigger>
          <QuestionEditor exam={exam} modules={modules} onClose={() => setAdding(false)} />
        </Dialog>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && questions.length === 0 && (
        <p className="text-sm text-muted-foreground italic">No questions yet. Click "Add question" to start.</p>
      )}

      <div className="space-y-2">
        {questions.map((q, i) => (
          <Card key={q.id} className="p-3 hover-elevate">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-bold text-primary tabular-nums">{i + 1}.</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{q.questionType.replace("_", " ")}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{moduleTitle(q.moduleId)}</Badge>
                </div>
                <p className="text-sm leading-snug">{q.questionText}</p>
                {q.cefrDescriptor && (
                  <p className="text-[10px] text-muted-foreground italic mt-0.5">CEFR — {q.cefrDescriptor}</p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Dialog open={editing?.id === q.id} onOpenChange={(open) => setEditing(open ? q : null)}>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="ghost" onClick={() => setEditing(q)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  {editing?.id === q.id && (
                    <QuestionEditor exam={exam} modules={modules} existing={editing} onClose={() => setEditing(null)} />
                  )}
                </Dialog>
                <Button
                  size="icon" variant="ghost"
                  onClick={() => {
                    if (confirm("Delete this question?")) del.mutate(q.id);
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
}

function ExamPanel({ level }: { level: string }) {
  const { data: exams = [] } = useQuery<FinalExam[]>({
    queryKey: ["/api/admin/final-exams"],
  });
  const exam = exams.find(e => e.level === level);

  // Modules for this level's course (used for the moduleId picker)
  const { data: courses = [] } = useQuery<any[]>({ queryKey: ["/api/admin/courses"] });
  const course = courses.find(c => c.level === level);
  const { data: modules = [] } = useQuery<CourseModule[]>({
    queryKey: [`/api/admin/courses/${course?.id}/modules`],
    enabled: !!course,
  });
  const sortedMods = useMemo(() => [...modules].sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)), [modules]);

  if (!exam) return <Card className="p-6 text-center"><p className="text-sm text-muted-foreground">Exam not configured for {level} yet.</p></Card>;

  return (
    <div className="space-y-5">
      <ExamConfigCard exam={exam} modules={sortedMods} />
      <QuestionsList exam={exam} modules={sortedMods} />
    </div>
  );
}

export default function AdminFinalExamsPage() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Admin</Button></Link>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Award className="w-6 h-6 text-primary" /> Final Exams</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Manage the CEFR Mastery Exam catalog: edit prompts, weights, publish toggle, and the per-level question bank.
      </p>

      <Tabs defaultValue="A1">
        <TabsList>
          {LEVELS.map(lvl => <TabsTrigger key={lvl} value={lvl}>{lvl}</TabsTrigger>)}
        </TabsList>
        {LEVELS.map(lvl => (
          <TabsContent key={lvl} value={lvl} className="mt-4 space-y-4">
            <ExamPanel level={lvl} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
