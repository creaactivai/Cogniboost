/**
 * /admin/labs/plans — HABLA Method plan generator + library.
 *
 * Per (level + module + interest topic), generates 4 self-contained
 * lesson plans via Claude Opus. Each plan reads the module's lesson
 * HTML + teacher_lesson_plan so vocab/grammar come from REAL content,
 * not generic AI-made stuff.
 *
 * After generation, teacher can edit each plan section-by-section
 * and toggle published state.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Sparkles, Loader2, Heart, Brain, Lightbulb, Mic, Anchor,
  Pencil, Save, BookOpen, GraduationCap, ChevronDown, ChevronUp,
} from "lucide-react";
import { InterestIcon } from "@/components/lab/interest-icon";
import { Link } from "wouter";
import { useEffect } from "react";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

interface Course { id: string; title: string; level: string; }
interface CourseModule { id: string; courseId: string; title: string; orderIndex: number; }
interface InterestTopic { id: string; name: string; icon?: string | null; slug?: string; }
interface LabPlan {
  id: string;
  level: string;
  moduleId: string;
  interestTopicId: string;
  variantNumber: number;
  title: string;
  grammarFocus: string;
  pedagogicalObjective: string;
  durationMinutes: number;
  plan: any;
  vocabulary: string[];
  expressions: string[];
  previewBlurb: string | null;
  isPublished: boolean;
  generatedBy: string | null;
}

const PHASE_META: Record<string, { letter: string; label: string; icon: any; color: string; }> = {
  hook:     { letter: "H", label: "Hook",     icon: Heart,     color: "from-pink-500 to-rose-500" },
  activate: { letter: "A", label: "Activate", icon: Brain,     color: "from-amber-500 to-orange-500" },
  build:    { letter: "B", label: "Build",    icon: Lightbulb, color: "from-cyan-500 to-blue-500" },
  live:     { letter: "L", label: "Live",     icon: Mic,       color: "from-emerald-500 to-teal-500" },
  anchor:   { letter: "A", label: "Anchor",   icon: Anchor,    color: "from-violet-500 to-purple-500" },
};

export default function LabsPlansPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedLevel, setSelectedLevel] = useState<string>("B1");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [selectedInterestId, setSelectedInterestId] = useState<string>("");
  const [bulkJobId, setBulkJobId] = useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = useState<any>(null);

  // Poll bulk status every 2s when a job is running
  useEffect(() => {
    if (!bulkJobId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch(`/api/admin/lab-plans/generate-bulk/${bulkJobId}/status`, { credentials: "include" });
        if (!r.ok) return;
        const data = await r.json();
        if (cancelled) return;
        setBulkStatus(data);
        if (data.finishedAt) {
          queryClient.invalidateQueries({ queryKey: [`/api/admin/lab-plans/by-module/${selectedModuleId}`] });
          // keep job visible for a bit so the user sees the final result
          setTimeout(() => { if (!cancelled) { setBulkJobId(null); setBulkStatus(null); } }, 30000);
          return;
        }
        setTimeout(poll, 2000);
      } catch {
        setTimeout(poll, 4000);
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [bulkJobId]); // eslint-disable-line react-hooks/exhaustive-deps

  const bulkGenerate = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/admin/lab-plans/generate-bulk", { level: selectedLevel });
      return r.json();
    },
    onSuccess: (data) => {
      setBulkJobId(data.jobId);
      setBulkStatus({ ...data, generated: 0, errors: 0, total: data.total });
      toast({ title: `Bulk generation started for ${selectedLevel}`, description: `${data.total} combinations queued. Tracking progress…` });
    },
    onError: (e: any) => toast({ title: "Bulk failed", description: e?.message, variant: "destructive" }),
  });

  const { data: courses = [] } = useQuery<Course[]>({ queryKey: ["/api/admin/courses"] });
  const coursesForLevel = courses.filter((c) => c.level === selectedLevel);

  const { data: modules = [] } = useQuery<CourseModule[]>({
    queryKey: [`/api/admin/courses/${selectedCourseId}/modules`],
    enabled: !!selectedCourseId,
  });

  const { data: interests = [] } = useQuery<InterestTopic[]>({
    queryKey: ["/api/lab-interest-topics"],
  });

  const { data: plans = [], refetch: refetchPlans } = useQuery<LabPlan[]>({
    queryKey: [`/api/admin/lab-plans/by-module/${selectedModuleId}`],
    enabled: !!selectedModuleId,
  });

  // Filter plans by selected interest (if any)
  const filteredPlans = selectedInterestId
    ? plans.filter((p) => p.interestTopicId === selectedInterestId)
    : plans;

  const generate = useMutation({
    mutationFn: async () => {
      if (!selectedLevel || !selectedModuleId || !selectedInterestId) {
        throw new Error("Pick level, module, and interest first");
      }
      const r = await apiRequest("POST", "/api/admin/lab-plans/generate", {
        level: selectedLevel,
        moduleId: selectedModuleId,
        interestTopicId: selectedInterestId,
      });
      return r.json();
    },
    onSuccess: (data) => {
      toast({ title: `Generated ${data.generated || 0} HABLA plans ✓` });
      refetchPlans();
    },
    onError: (e: any) => toast({ title: "Generation failed", description: e?.message, variant: "destructive" }),
  });

  return (
    <AdminLayout title="HABLA Lab Plans">
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {/* Header + methodology link */}
        <Card className="p-5 bg-gradient-to-br from-primary/5 to-cyan-500/5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-primary" />
                HABLA Method · Lab Plans
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Generate 4 self-contained Conversation Lab plans for any (level × module ×
                interest) combination. Each plan follows the HABLA pedagogy and recycles real
                vocabulary + grammar from the module's lessons.
              </p>
            </div>
            <Link href="/admin/labs/methodology">
              <Button variant="outline" size="sm">
                <BookOpen className="w-4 h-4 mr-1.5" />
                Read methodology
              </Button>
            </Link>
          </div>
        </Card>

        {/* Selectors */}
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Pick a combination
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Level */}
            <div>
              <Label className="text-xs">CEFR Level</Label>
              <Select value={selectedLevel} onValueChange={(v) => { setSelectedLevel(v); setSelectedCourseId(""); setSelectedModuleId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Course */}
            <div>
              <Label className="text-xs">Course</Label>
              <Select value={selectedCourseId} onValueChange={(v) => { setSelectedCourseId(v); setSelectedModuleId(""); }}>
                <SelectTrigger><SelectValue placeholder="Pick course…" /></SelectTrigger>
                <SelectContent>
                  {coursesForLevel.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Module */}
            <div>
              <Label className="text-xs">Module</Label>
              <Select value={selectedModuleId} onValueChange={setSelectedModuleId} disabled={!selectedCourseId}>
                <SelectTrigger><SelectValue placeholder="Pick module…" /></SelectTrigger>
                <SelectContent>
                  {modules.sort((a, b) => a.orderIndex - b.orderIndex).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Interest */}
            <div>
              <Label className="text-xs">Interest topic</Label>
              <Select value={selectedInterestId} onValueChange={setSelectedInterestId}>
                <SelectTrigger><SelectValue placeholder="Pick interest…" /></SelectTrigger>
                <SelectContent>
                  {interests.map((it) => (
                    <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {filteredPlans.length > 0
                ? `${filteredPlans.length} plan${filteredPlans.length === 1 ? "" : "s"} already exist for this combo. Generating again overwrites them.`
                : "No plans yet for this combination. Generate to create 4 self-contained HABLA sessions."}
            </p>
            <Button
              onClick={() => generate.mutate()}
              disabled={generate.isPending || !selectedModuleId || !selectedInterestId}
              data-testid="button-generate-habla-plans"
            >
              {generate.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating with Claude…</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Generate 4 HABLA Plans</>
              )}
            </Button>
          </div>
        </Card>

        {/* Bulk pre-generation card */}
        <Card className="p-5 border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-cyan-500/5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold">Pre-generate all HABLA plans for a level</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                One-time job: ~72 combinations per level × 4 plans = ~288 plans saved permanently.
                Runs in background (~6–8 min per level). After this, no teacher needs to "generate"
                anything ever again — they just browse and edit.
              </p>
            </div>
          </div>

          {!bulkStatus && (
            <div className="flex items-center gap-3">
              <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                onClick={() => bulkGenerate.mutate()}
                disabled={bulkGenerate.isPending || !!bulkJobId}
                variant="default"
                data-testid="button-bulk-generate"
              >
                {bulkGenerate.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting…</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Pre-generate ALL {selectedLevel} plans</>
                )}
              </Button>
            </div>
          )}

          {bulkStatus && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-mono">
                  {bulkStatus.finishedAt
                    ? `Finished · ${bulkStatus.generated}/${bulkStatus.total} done · ${bulkStatus.errors} errors`
                    : `Progress: ${bulkStatus.generated}/${bulkStatus.total} combos`}
                </span>
                {!bulkStatus.finishedAt && (
                  <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {bulkStatus.currentCombo || "starting…"}
                  </span>
                )}
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(bulkStatus.generated / Math.max(bulkStatus.total, 1)) * 100}%` }}
                />
              </div>
              {bulkStatus.finishedAt && bulkStatus.errors > 0 && (
                <p className="text-xs text-amber-600">
                  {bulkStatus.errors} combination{bulkStatus.errors === 1 ? "" : "s"} failed. You can retry just those by selecting them above and clicking "Generate 4 HABLA Plans".
                </p>
              )}
              {bulkStatus.finishedAt && (
                <p className="text-xs text-emerald-700 font-semibold">
                  ✓ All {selectedLevel} plans saved. Refresh the page to see the full library, or pick a specific module above.
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Plans list */}
        {filteredPlans.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              {filteredPlans.length} Plan{filteredPlans.length === 1 ? "" : "s"}
            </h2>
            {filteredPlans
              .sort((a, b) => a.variantNumber - b.variantNumber)
              .map((p) => <PlanCard key={p.id} plan={p} interests={interests} onSaved={refetchPlans} />)}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function PlanCard({ plan, interests, onSaved }: { plan: LabPlan; interests: InterestTopic[]; onSaved: () => void; }) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { toast } = useToast();
  const interest = interests.find((i) => i.id === plan.interestTopicId);

  const togglePublish = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("PATCH", `/api/admin/lab-plans/${plan.id}`, { isPublished: !plan.isPublished });
      return r.json();
    },
    onSuccess: () => { toast({ title: !plan.isPublished ? "Published ✓" : "Unpublished" }); onSaved(); },
  });

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary">
          {plan.variantNumber}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-base">{plan.title}</h3>
            <Badge variant="outline" className="text-[10px]">{plan.level}</Badge>
            <Badge variant="secondary" className="text-[10px]">{plan.grammarFocus}</Badge>
            <Badge
              variant="outline"
              className={`text-[10px] ${plan.isPublished ? "bg-emerald-50 border-emerald-300 text-emerald-700" : ""}`}
            >
              {plan.isPublished ? "Publicado" : "Borrador"}
            </Badge>
            {interest && (
              <Badge variant="outline" className="text-[10px]">{interest.name}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{plan.pedagogicalObjective}</p>
          {plan.previewBlurb && (
            <p className="text-sm italic mt-1.5">"{plan.previewBlurb}"</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">Publicado</span>
            <Switch checked={plan.isPublished} onCheckedChange={() => togglePublish.mutate()} />
          </div>
          <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
            <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
          </Button>
        </div>
      </div>

      {/* Phases */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full mt-3 pt-3 border-t text-xs text-muted-foreground flex items-center justify-center gap-1 hover:text-foreground"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? "Hide HABLA phases" : "Show HABLA phases"}
      </button>

      {expanded && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-2">
          {(["hook", "activate", "build", "live", "anchor"] as const).map((key) => {
            const meta = PHASE_META[key];
            const Icon = meta.icon;
            const phase = plan.plan?.[key];
            if (!phase) return null;
            return (
              <div key={key} className="p-3 rounded-lg border bg-muted/30 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <div className={`w-7 h-7 rounded-md bg-gradient-to-br ${meta.color} flex items-center justify-center`}>
                    <span className="font-black text-xs text-white">{meta.letter}</span>
                  </div>
                  <span className="text-xs font-bold">{meta.label}</span>
                  <span className="text-[9px] text-muted-foreground ml-auto">{phase.durationMinutes}m</span>
                </div>
                {phase.prompt && <p className="text-[11px] italic">"{phase.prompt}"</p>}
                {phase.objective && <p className="text-[11px]">{phase.objective}</p>}
                {phase.focusGrammar && <p className="text-[11px]">{phase.focusGrammar}</p>}
                {phase.task && <p className="text-[11px]">{phase.task}</p>}
                {phase.takeawayPhrase && <p className="text-[11px] italic">"{phase.takeawayPhrase}"</p>}
              </div>
            );
          })}
        </div>
      )}

      {editOpen && (
        <EditPlanDialog plan={plan} open={editOpen} onClose={() => setEditOpen(false)} onSaved={onSaved} />
      )}
    </Card>
  );
}

function EditPlanDialog({ plan, open, onClose, onSaved }: {
  plan: LabPlan; open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = useState(plan.title);
  const [grammarFocus, setGrammarFocus] = useState(plan.grammarFocus);
  const [objective, setObjective] = useState(plan.pedagogicalObjective);
  const [previewBlurb, setPreviewBlurb] = useState(plan.previewBlurb || "");
  const [planJson, setPlanJson] = useState(JSON.stringify(plan.plan, null, 2));
  const { toast } = useToast();

  const save = useMutation({
    mutationFn: async () => {
      let parsedPlan: any;
      try { parsedPlan = JSON.parse(planJson); } catch (err: any) {
        throw new Error("Plan JSON invalid: " + err?.message);
      }
      const r = await apiRequest("PATCH", `/api/admin/lab-plans/${plan.id}`, {
        title, grammarFocus, pedagogicalObjective: objective, previewBlurb, plan: parsedPlan,
      });
      return r.json();
    },
    onSuccess: () => { toast({ title: "Plan saved ✓" }); onSaved(); onClose(); },
    onError: (e: any) => toast({ title: "Save failed", description: e?.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit HABLA Plan · Variant {plan.variantNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Grammar focus</Label>
            <Input value={grammarFocus} onChange={(e) => setGrammarFocus(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Pedagogical objective</Label>
            <Textarea value={objective} onChange={(e) => setObjective(e.target.value)} className="min-h-[60px]" />
          </div>
          <div>
            <Label className="text-xs">Preview blurb (pre-class email)</Label>
            <Textarea value={previewBlurb} onChange={(e) => setPreviewBlurb(e.target.value)} className="min-h-[60px]" />
          </div>
          <div>
            <Label className="text-xs">5-Phase plan (JSON)</Label>
            <Textarea
              value={planJson}
              onChange={(e) => setPlanJson(e.target.value)}
              className="min-h-[280px] font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Edit phase content here. Keep keys: hook, activate, build, live, anchor.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              <Save className="w-4 h-4 mr-1.5" />
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
