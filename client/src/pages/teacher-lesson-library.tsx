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
import type { TeacherLessonRow } from "@/types/lesson-plan";

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

export default function TeacherLessonLibraryPage() {
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [search, setSearch] = useState("");

  const { data: lessons = [], isLoading } = useQuery<TeacherLessonRow[]>({
    queryKey: ["/api/teacher/lessons"],
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
        <h1 className="text-2xl font-bold mb-1">Lesson Library</h1>
        <p className="text-sm text-muted-foreground">
          Every lesson plan in the curriculum, organized by course and level. Click any lesson to
          see the full 17-section plan, edit it inline, or print a teacher copy.
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

      {isLoading && <p className="text-sm text-muted-foreground">Loading lessons…</p>}

      {!isLoading && filtered.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {lessons.length === 0
              ? "No lessons published yet. Add lessons via the admin courses pages."
              : "No lessons match the current filters."}
          </p>
        </Card>
      )}

      <div className="space-y-5">
        {grouped.map((course) => (
          <section key={course.id}>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="font-bold text-lg">{course.courseTitle}</h2>
              {course.courseLevel && (
                <Badge variant="outline" className={levelColor(course.courseLevel as TeacherLessonRow["courseLevel"])}>
                  {course.courseLevel}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {course.lessons.length} lesson{course.lessons.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="space-y-1.5">
              {course.lessons.map((l) => {
                const pct = planCompletenessPct(l.teacherLessonPlan);
                return (
                  <Link key={l.id} href={`/dashboard/teacher/lessons/${l.id}`}>
                    <Card
                      className="p-3 hover:bg-accent cursor-pointer transition-colors"
                      data-testid={`row-lesson-${l.id}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{l.title}</div>
                          {l.moduleTitle && (
                            <div className="text-xs text-muted-foreground">{l.moduleTitle}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-xs text-muted-foreground tabular-nums">
                            {l.duration} min
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              pct >= 80
                                ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                                : pct >= 40
                                  ? "bg-amber-50 text-amber-900 border-amber-300"
                                  : "bg-slate-50 text-slate-700 border-slate-300"
                            }
                            data-testid={`badge-plan-completeness-${l.id}`}
                          >
                            Plan {pct}%
                          </Badge>
                          {!l.isPublished && (
                            <Badge variant="outline" className="bg-slate-50 text-slate-700">
                              Draft
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
