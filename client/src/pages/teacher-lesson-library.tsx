/**
 * Teacher Lesson Library — list view.
 *
 * Master Plan v2.0 §7.2 (Lesson Library) — "every lesson plan, accessible
 * in two clicks from the teacher dashboard." This is that page.
 *
 * Layout: filter bar (level / search) + grouped list by course.
 * Click any row → /dashboard/teacher/lessons/:id detail view.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, GraduationCap, Mic, Heart, Brain, Lightbulb, Anchor as AnchorIcon, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import type { TeacherLessonRow } from "@/types/lesson-plan";
import type { CourseModule } from "@shared/schema";
import { EditHablaPlanDialog } from "@/components/lab/edit-habla-plan-dialog";

const CEFR_LEVELS = ["all", "A1", "A2", "B1", "B2", "C1", "C2"] as const;
type LevelFilter = (typeof CEFR_LEVELS)[number];

function levelColor(level: TeacherLessonRow["courseLevel"]): string {
  switch (level) {
    case "A1":
      return "bg-green-100 text-green-900 border-green-300";
    case "A2":
      return "bg-teal-100 text-teal-900 border-teal-300";
    case "B1":
      return "bg-blue-100 text-blue-900 border-blue-300";
    case "B2":
      return "bg-indigo-100 text-indigo-900 border-indigo-300";
    case "C1":
      return "bg-purple-100 text-purple-900 border-purple-300";
    case "C2":
      return "bg-pink-100 text-pink-900 border-pink-300";
    default:
      return "bg-slate-100 text-slate-900 border-slate-300";
  }
}

function planCompletenessPct(plan: TeacherLessonRow["teacherLessonPlan"]): number {
  if (!plan) return 0;
  const fields = [
    plan.learningObjectives?.length,
    plan.grammarFocus?.structure,
    plan.vocabularyTarget?.length,
    plan.lessonStructure?.length,
    plan.videoResources?.length,
    plan.authenticMaterials?.length,
    plan.quizPreview?.length,
    plan.writingPrompt,
    plan.speakingAppPrompts?.length,
    plan.labActivities?.length,
    plan.teacherNotes?.anticipatedQuestions?.length,
    plan.differentiation?.forStrugglingStudents?.length,
    plan.culturalNotes,
    plan.assessmentCriteria,
    plan.commonMistakes?.length,
    plan.homework,
  ];
  const populated = fields.filter((f) => !!f).length;
  return Math.round((populated / fields.length) * 100);
}

interface InterestTopic { id: string; name: string; icon?: string | null; }
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
}

export default function TeacherLessonLibraryPage() {
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [search, setSearch] = useState("");
  const [interestFilter, setInterestFilter] = useState<string>("all");

  const { data: lessons = [], isLoading } = useQuery<TeacherLessonRow[]>({
    queryKey: ["/api/teacher/lessons"],
  });

  const { data: interests = [] } = useQuery<InterestTopic[]>({
    queryKey: ["/api/lab-interest-topics"],
  });

  const filtered = useMemo(() => {
    return lessons.filter((l) => {
      if (levelFilter !== "all" && l.courseLevel !== levelFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [
          l.title,
          l.description ?? "",
          l.courseTitle ?? "",
          l.moduleTitle ?? "",
          l.teacherLessonPlan?.writingPrompt ?? "",
          (l.teacherLessonPlan?.vocabularyTarget ?? []).join(" "),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [lessons, levelFilter, search]);

  // Group by course → module
  const grouped = useMemo(() => {
    const byCourse = new Map<
      string,
      { courseTitle: string; courseLevel: string | null; lessons: TeacherLessonRow[] }
    >();
    for (const l of filtered) {
      const key = l.courseId;
      if (!byCourse.has(key)) {
        byCourse.set(key, {
          courseTitle: l.courseTitle ?? "Untitled course",
          courseLevel: l.courseLevel,
          lessons: [],
        });
      }
      byCourse.get(key)!.lessons.push(l);
    }
    return Array.from(byCourse.entries()).map(([id, c]) => ({ id, ...c }));
  }, [filtered]);

  return (
    <div className="max-w-5xl mx-auto p-6" data-testid="page-teacher-lesson-library">
      <header className="mb-4">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          Library
        </h1>
        <p className="text-sm text-muted-foreground">
          Every pedagogical asset in the curriculum — self-paced lessons and HABLA Conversation
          Lab plans — organized by level, course, module, and interest.
        </p>
      </header>

      <Card className="p-3 mb-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <div className="flex gap-1 flex-wrap">
          {CEFR_LEVELS.map((lvl) => (
            <Button
              key={lvl}
              variant={levelFilter === lvl ? "default" : "outline"}
              size="sm"
              onClick={() => setLevelFilter(lvl)}
              data-testid={`button-filter-level-${lvl}`}
            >
              {lvl === "all" ? "All levels" : lvl}
            </Button>
          ))}
        </div>
        <Input
          placeholder="Search title, vocab, prompt…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
          data-testid="input-search-lessons"
        />
      </Card>

      <HablaPlansBrowser
        levelFilter={levelFilter}
        interestFilter={interestFilter}
        setInterestFilter={setInterestFilter}
        interests={interests}
        search={search}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// HABLA Plans Browser — listed by Level → Course → Module
// with an Interest filter at the top.
// ─────────────────────────────────────────────────────────────────

interface Course { id: string; title: string; level: string; }

function HablaPlansBrowser({
  levelFilter, interestFilter, setInterestFilter, interests, search,
}: {
  levelFilter: LevelFilter;
  interestFilter: string;
  setInterestFilter: (v: string) => void;
  interests: InterestTopic[];
  search: string;
}) {
  return (
    <>
      {/* Interest selector — colorful cards, not a tiny dropdown */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Pick an interest
          </span>
          {interestFilter !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setInterestFilter("all")}
            >
              Clear
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {interests.map((it) => {
            const active = interestFilter === it.id;
            return (
              <button
                key={it.id}
                onClick={() => setInterestFilter(active ? "all" : it.id)}
                className={`p-3 rounded-lg border-2 text-left transition-all hover:scale-[1.02] ${
                  active
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="text-2xl mb-1">{it.icon || "🎯"}</div>
                <div className="text-xs font-semibold leading-tight">{it.name}</div>
              </button>
            );
          })}
        </div>
      </Card>

      <PlansLibrary
        levelFilter={levelFilter}
        interestFilter={interestFilter}
        interests={interests}
        search={search}
      />
    </>
  );
}

// Plans organized by Level → Interest → Module
function PlansLibrary({
  levelFilter, interestFilter, interests, search,
}: {
  levelFilter: LevelFilter;
  interestFilter: string;
  interests: InterestTopic[];
  search: string;
}) {
  // Single endpoint returns ALL plans with module + interest details joined.
  const { data: allPlans = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/lab-plans/all"],
  });

  // Filter by Level + Interest + search
  const filtered = useMemo(() => {
    return allPlans.filter((p) => {
      if (levelFilter !== "all" && p.level !== levelFilter) return false;
      if (interestFilter !== "all" && p.interestTopicId !== interestFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = (p.title + " " + p.grammarFocus + " " + (p.previewBlurb || "") + " " + (p.vocabulary || []).join(" ")).toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allPlans, levelFilter, interestFilter, search]);

  // Group: Level → Interest → Module → variants
  const grouped = useMemo(() => {
    const out = new Map<string, Map<string, Map<string, LabPlan[]>>>();
    for (const p of filtered) {
      if (!out.has(p.level)) out.set(p.level, new Map());
      const byInterest = out.get(p.level)!;
      if (!byInterest.has(p.interestTopicId)) byInterest.set(p.interestTopicId, new Map());
      const byModule = byInterest.get(p.interestTopicId)!;
      if (!byModule.has(p.moduleId)) byModule.set(p.moduleId, []);
      byModule.get(p.moduleId)!.push(p);
    }
    // sort variants within each module
    out.forEach((byInterest) => byInterest.forEach((byModule) => byModule.forEach((arr) => arr.sort((a, b) => a.variantNumber - b.variantNumber))));
    return out;
  }, [filtered]);

  if (isLoading) {
    return <Card className="p-6 text-center"><p className="text-sm text-muted-foreground">Loading plans…</p></Card>;
  }
  if (filtered.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No plans match these filters yet.
        </p>
      </Card>
    );
  }

  // Render groups
  return (
    <div className="space-y-6">
      {Array.from(grouped.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([level, byInterest]) => (
          <div key={level} className="space-y-4">
            <div className="flex items-center gap-2 sticky top-0 bg-background py-2 z-10">
              <Badge variant="outline" className={`text-xs ${levelColor(level as any)}`}>{level}</Badge>
              <h2 className="text-lg font-bold">{LEVEL_NAMES[level] || level}</h2>
            </div>
            {Array.from(byInterest.entries()).map(([interestId, byModule]) => {
              const interest = interests.find((i) => i.id === interestId);
              return (
                <div key={interestId} className="space-y-2">
                  <div className="flex items-center gap-2 pl-1">
                    <span className="text-xl">{interest?.icon || "🎯"}</span>
                    <h3 className="text-base font-bold">{interest?.name || "Interest"}</h3>
                    <span className="text-xs text-muted-foreground">
                      ({Array.from(byModule.values()).flat().length} plans)
                    </span>
                  </div>
                  <div className="space-y-2 pl-2 border-l-2 border-muted">
                    {Array.from(byModule.entries()).map(([moduleId, plans]) => {
                      const moduleTitle = (plans[0] as any)?.moduleTitle || "Module";
                      return (
                        <div key={moduleId} className="space-y-1.5">
                          <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground pl-2">
                            {moduleTitle}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {plans.map((p) => <HablaPlanRow key={p.id} plan={p} />)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
    </div>
  );
}

const LEVEL_NAMES: Record<string, string> = {
  A1: "A1 · Beginner",
  A2: "A2 · Elementary",
  B1: "B1 · Intermediate",
  B2: "B2 · Upper Intermediate",
  C1: "C1 · Advanced",
};

function CourseHablaSection({
  course, interestFilter, interests, search,
}: {
  course: Course;
  interestFilter: string;
  interests: InterestTopic[];
  search: string;
}) {
  const { data: modules = [] } = useQuery<CourseModule[]>({
    queryKey: [`/api/admin/courses/${course.id}/modules`],
  });
  const sortedModules = useMemo(
    () => [...modules].sort((a: any, b: any) => (a.orderIndex || 0) - (b.orderIndex || 0)),
    [modules]
  );

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <h2 className="font-bold text-lg">{course.title}</h2>
        <Badge variant="outline">{course.level}</Badge>
        <span className="text-xs text-muted-foreground">
          {sortedModules.length} module{sortedModules.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="space-y-2">
        {sortedModules.map((m) => (
          <ModuleHablaCard key={m.id} module={m} interestFilter={interestFilter} interests={interests} search={search} />
        ))}
      </div>
    </section>
  );
}

function ModuleHablaCard({
  module, interestFilter, interests, search,
}: {
  module: CourseModule;
  interestFilter: string;
  interests: InterestTopic[];
  search: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: plans = [], isLoading } = useQuery<LabPlan[]>({
    queryKey: [`/api/admin/lab-plans/by-module/${module.id}`],
  });

  const filtered = useMemo(() => {
    let p = plans;
    if (interestFilter !== "all") p = p.filter((x) => x.interestTopicId === interestFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      p = p.filter((x) =>
        (x.title + " " + x.grammarFocus + " " + (x.previewBlurb || "") + " " + (x.vocabulary || []).join(" "))
          .toLowerCase().includes(q)
      );
    }
    return p;
  }, [plans, interestFilter, search]);

  // Group by interest
  const byInterest = useMemo(() => {
    const map = new Map<string, LabPlan[]>();
    for (const p of filtered) {
      if (!map.has(p.interestTopicId)) map.set(p.interestTopicId, []);
      map.get(p.interestTopicId)!.push(p);
    }
    map.forEach((arr) => arr.sort((a: LabPlan, b: LabPlan) => a.variantNumber - b.variantNumber));
    return map;
  }, [filtered]);

  // Hide module entirely if no plans exist. MUST be after all hooks
  // to comply with React's Rules of Hooks.
  if (!isLoading && plans.length === 0) return null;

  return (
    <Card>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between gap-3 hover:bg-accent/40 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-md bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <Mic className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{module.title}</div>
            <div className="text-xs text-muted-foreground">
              {expanded ? `${filtered.length} plan${filtered.length === 1 ? "" : "s"}` : `Tap to view HABLA plans`}
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground italic px-2 py-3">
              No plans available for this module{interestFilter !== "all" ? " in this interest" : ""} yet.
            </p>
          )}
          {Array.from(byInterest.entries()).map(([interestId, plansForInterest]) => {
            const interest = interests.find((i) => i.id === interestId);
            return (
              <div key={interestId} className="rounded-md border bg-muted/20 p-2 space-y-1.5">
                <div className="flex items-center gap-2 px-1">
                  <Badge variant="outline" className="text-[10px]">{interest?.name || "Interest"}</Badge>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {plansForInterest.length} variant{plansForInterest.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {plansForInterest.map((p) => (
                    <HablaPlanRow key={p.id} plan={p} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function PhaseBlock({
  letter, label, duration, colorFrom, colorTo, children,
}: {
  letter: string; label: string; duration: number;
  colorFrom: string; colorTo: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-2 py-1.5 border-b bg-muted/20">
        <div className={`w-6 h-6 rounded bg-gradient-to-br ${colorFrom} ${colorTo} flex items-center justify-center flex-shrink-0`}>
          <span className="text-[11px] font-black text-white">{letter}</span>
        </div>
        <span className="text-xs font-bold">{label}</span>
        <span className="text-[10px] text-muted-foreground ml-auto font-mono">{duration} min</span>
      </div>
      <div className="px-3 py-2 text-xs space-y-1">
        {children}
      </div>
    </div>
  );
}

function HablaPlanRow({ plan }: { plan: LabPlan }) {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  return (
    <div className="p-2 rounded border bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 text-left"
      >
        <span className="w-6 h-6 rounded-md bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
          {plan.variantNumber}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{plan.title}</div>
          <div className="text-[11px] text-muted-foreground truncate">{plan.grammarFocus}</div>
        </div>
        <Badge
          variant="outline"
          className={`text-[9px] ${plan.isPublished ? "bg-emerald-50 text-emerald-700 border-emerald-300" : ""}`}
        >
          {plan.isPublished ? "Pub" : "Draft"}
        </Badge>
      </button>
      {open && (
        <div className="mt-3 pt-3 border-t space-y-3 text-sm">
          {/* Objective + blurb */}
          {plan.pedagogicalObjective && (
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">Objective</p>
              <p className="text-xs italic">{plan.pedagogicalObjective}</p>
            </div>
          )}
          {plan.previewBlurb && (
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">
                Student preview
              </p>
              <p className="text-xs text-muted-foreground italic">"{plan.previewBlurb}"</p>
            </div>
          )}

          {/* The 5 HABLA phases */}
          <div className="space-y-2">
            {/* H — Hook */}
            {plan.plan?.hook && (
              <PhaseBlock
                letter="H"
                label="Hook"
                duration={plan.plan.hook.durationMinutes || 5}
                colorFrom="from-pink-500"
                colorTo="to-rose-500"
              >
                {plan.plan.hook.prompt && (
                  <p className="font-medium">"{plan.plan.hook.prompt}"</p>
                )}
                {plan.plan.hook.teacherScript && (
                  <p className="text-muted-foreground italic mt-1">{plan.plan.hook.teacherScript}</p>
                )}
                {plan.plan.hook.variants?.length > 0 && (
                  <div className="mt-1.5 pl-2 border-l-2 border-pink-300">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Alt questions</p>
                    {plan.plan.hook.variants.map((v: string, i: number) => (
                      <p key={i} className="text-xs italic">· {v}</p>
                    ))}
                  </div>
                )}
              </PhaseBlock>
            )}

            {/* A — Activate */}
            {plan.plan?.activate && (
              <PhaseBlock
                letter="A"
                label="Activate"
                duration={plan.plan.activate.durationMinutes || 10}
                colorFrom="from-amber-500"
                colorTo="to-orange-500"
              >
                {plan.plan.activate.objective && (
                  <p>{plan.plan.activate.objective}</p>
                )}
                {plan.plan.activate.teacherScript && (
                  <p className="text-muted-foreground italic mt-1">{plan.plan.activate.teacherScript}</p>
                )}
                {plan.plan.activate.vocabToSurface?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {plan.plan.activate.vocabToSurface.map((w: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">{w}</Badge>
                    ))}
                  </div>
                )}
              </PhaseBlock>
            )}

            {/* B — Build */}
            {plan.plan?.build && (
              <PhaseBlock
                letter="B"
                label="Build"
                duration={plan.plan.build.durationMinutes || 10}
                colorFrom="from-cyan-500"
                colorTo="to-blue-500"
              >
                {plan.plan.build.focusGrammar && (
                  <p className="font-medium">Grammar lens: {plan.plan.build.focusGrammar}</p>
                )}
                {plan.plan.build.examples?.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Examples</p>
                    {plan.plan.build.examples.map((ex: string, i: number) => (
                      <p key={i} className="text-xs italic pl-2 border-l-2 border-cyan-300">"{ex}"</p>
                    ))}
                  </div>
                )}
                {plan.plan.build.discoveryQuestion && (
                  <p className="mt-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Ask: </span>
                    <span className="italic">{plan.plan.build.discoveryQuestion}</span>
                  </p>
                )}
              </PhaseBlock>
            )}

            {/* L — Live */}
            {plan.plan?.live && (
              <PhaseBlock
                letter="L"
                label="Live"
                duration={plan.plan.live.durationMinutes || 25}
                colorFrom="from-emerald-500"
                colorTo="to-teal-500"
              >
                {plan.plan.live.task && (
                  <p className="font-medium">{plan.plan.live.task}</p>
                )}
                {plan.plan.live.taskRubric?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Success looks like</p>
                    <ul className="space-y-0.5">
                      {plan.plan.live.taskRubric.map((r: string, i: number) => (
                        <li key={i} className="text-xs flex gap-1.5"><span className="text-emerald-600">✓</span>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {plan.plan.live.outputTargets?.length > 0 && (
                  <div className="mt-1.5">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Targets</p>
                    {plan.plan.live.outputTargets.map((t: string, i: number) => (
                      <p key={i} className="text-xs">· {t}</p>
                    ))}
                  </div>
                )}
              </PhaseBlock>
            )}

            {/* A — Anchor */}
            {plan.plan?.anchor && (
              <PhaseBlock
                letter="A"
                label="Anchor"
                duration={plan.plan.anchor.durationMinutes || 10}
                colorFrom="from-violet-500"
                colorTo="to-purple-500"
              >
                {plan.plan.anchor.takeawayPhrase && (
                  <p>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Take-home phrase: </span>
                    <span className="font-semibold italic">"{plan.plan.anchor.takeawayPhrase}"</span>
                  </p>
                )}
                {plan.plan.anchor.vocabForSrs?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">SRS deck →</span>
                    {plan.plan.anchor.vocabForSrs.map((w: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">{w}</Badge>
                    ))}
                  </div>
                )}
              </PhaseBlock>
            )}
          </div>

          {/* Full vocab + expressions */}
          {(plan.vocabulary?.length || plan.expressions?.length) && (
            <div className="pt-2 border-t">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">
                All vocab & expressions
              </p>
              <div className="flex flex-wrap gap-1">
                {(plan.vocabulary || []).map((w, i) => (
                  <Badge key={`v${i}`} variant="outline" className="text-[10px]">{w}</Badge>
                ))}
                {(plan.expressions || []).map((e, i) => (
                  <Badge key={`e${i}`} variant="outline" className="text-[10px] italic bg-muted/40">"{e}"</Badge>
                ))}
              </div>
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            className="w-full mt-2"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit this plan
          </Button>
        </div>
      )}
      {editOpen && (
        <EditHablaPlanDialog
          plan={plan as any}
          open={editOpen}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}
