/**
 * Teacher Lesson Plan detail page.
 *
 * Master Plan v2.0 §7.4 — renders the 17 sections of a lesson plan. Sections
 * not yet authored show a "Not yet authored" placeholder; the Phase 2
 * One-Click Generator will populate them on demand.
 *
 * v1 is read-only with a single overall "Edit JSON" toggle that exposes the
 * raw teacher_lesson_plan field for direct edits. A section-by-section
 * inline editor lands in a follow-up PR — for now this gives teachers
 * everything they need to read + manually author plans.
 */

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { LessonPlan, TeacherLessonRow } from "@/types/lesson-plan";

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={`p-4 mb-3 ${empty ? "bg-slate-50 border-dashed" : ""}`}>
      <h3 className="font-semibold text-sm uppercase tracking-wide text-slate-600 mb-2">{title}</h3>
      {empty ? (
        <p className="text-sm text-slate-400 italic">
          Not yet authored — the Phase 2 One-Click Generator will populate this section.
        </p>
      ) : (
        children
      )}
    </Card>
  );
}

function BulletList({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="space-y-1 text-sm text-slate-800 list-disc list-inside">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

export default function TeacherLessonPlanPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data: lesson, isLoading } = useQuery<TeacherLessonRow>({
    // Re-using the list endpoint and finding the row would be lazy; instead
    // we hit the admin detail endpoint that returns the single lesson row
    // (it also enforces isAdmin server-side which is the same gate).
    queryKey: [`/api/admin/lessons/${id}`],
  });

  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonDraft, setJsonDraft] = useState<string>("");

  const plan: LessonPlan | null = lesson?.teacherLessonPlan ?? null;

  const initialJson = useMemo(() => {
    return JSON.stringify(plan ?? {}, null, 2);
  }, [plan]);

  const saveMutation = useMutation({
    mutationFn: async (newPlan: LessonPlan) => {
      const res = await apiRequest("PATCH", `/api/teacher/lessons/${id}/plan`, newPlan);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/lessons/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/lessons"] });
      toast({ title: "Plan saved" });
      setShowJsonEditor(false);
    },
    onError: (err: Error) =>
      toast({
        title: "Could not save plan",
        description: err.message,
        variant: "destructive",
      }),
  });

  function handleSaveJson() {
    try {
      const parsed = JSON.parse(jsonDraft);
      if (typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Plan must be a JSON object");
      }
      saveMutation.mutate(parsed as LessonPlan);
    } catch (err: any) {
      toast({
        title: "Invalid JSON",
        description: err.message,
        variant: "destructive",
      });
    }
  }

  if (isLoading || !lesson) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-muted-foreground">Loading lesson plan…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6" data-testid="page-teacher-lesson-plan">
      <header className="mb-4">
        <Link href="/dashboard/teacher/lessons">
          <Button variant="ghost" size="sm" className="mb-2 -ml-2" data-testid="button-back-library">
            ← Lesson Library
          </Button>
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{lesson.title}</h1>
            {lesson.description && (
              <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {lesson.moduleId && (
                <Badge variant="outline">Module: order {lesson.orderIndex}</Badge>
              )}
              <Badge variant="outline" className="tabular-nums">
                {lesson.duration} min
              </Badge>
              {!lesson.isPublished && (
                <Badge variant="outline" className="bg-slate-50">
                  Draft
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant={showJsonEditor ? "default" : "outline"}
            onClick={() => {
              setShowJsonEditor((v) => !v);
              if (!showJsonEditor) setJsonDraft(initialJson);
            }}
            data-testid="button-toggle-json-editor"
          >
            {showJsonEditor ? "Close editor" : "Edit plan (JSON)"}
          </Button>
        </div>
      </header>

      {showJsonEditor && (
        <Card className="p-4 mb-4 border-blue-300 bg-blue-50">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-blue-900 mb-2">
            Edit lesson plan (JSON)
          </h3>
          <p className="text-xs text-blue-800 mb-2">
            Authoring inline editor is in Phase 2. For now, edit the full 17-section plan as JSON.
            The shape lives in <code>client/src/types/lesson-plan.ts</code>.
          </p>
          <Textarea
            value={jsonDraft}
            onChange={(e) => setJsonDraft(e.target.value)}
            rows={20}
            className="font-mono text-xs"
            data-testid="input-lesson-plan-json"
          />
          <div className="flex gap-2 mt-2">
            <Button
              onClick={handleSaveJson}
              disabled={saveMutation.isPending}
              data-testid="button-save-lesson-plan"
            >
              {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowJsonEditor(false);
                setJsonDraft("");
              }}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {/* 17 sections rendered. Empty sections show the "not yet authored" placeholder
          so teachers know what's missing. */}
      <Section title="1 · Learning objectives" empty={!plan?.learningObjectives?.length}>
        <BulletList items={plan?.learningObjectives} />
      </Section>

      <Section title="2 · Grammar focus" empty={!plan?.grammarFocus?.structure}>
        {plan?.grammarFocus?.structure && (
          <p className="text-sm font-semibold text-slate-900 mb-2">{plan.grammarFocus.structure}</p>
        )}
        {plan?.grammarFocus?.useCases?.length ? (
          <div className="mb-2">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Use cases</div>
            <BulletList items={plan.grammarFocus.useCases} />
          </div>
        ) : null}
        {plan?.grammarFocus?.spanishSpeakerPitfalls?.length ? (
          <div className="mb-2">
            <div className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
              Spanish-speaker pitfalls
            </div>
            <BulletList items={plan.grammarFocus.spanishSpeakerPitfalls} />
          </div>
        ) : null}
        {plan?.grammarFocus?.commonErrors?.length ? (
          <div>
            <div className="text-xs font-semibold text-red-700 uppercase tracking-wide">Common errors</div>
            <BulletList items={plan.grammarFocus.commonErrors} />
          </div>
        ) : null}
      </Section>

      <Section title="3 · Vocabulary target" empty={!plan?.vocabularyTarget?.length}>
        {plan?.vocabularyTarget && (
          <div className="flex flex-wrap gap-1.5">
            {plan.vocabularyTarget.map((w, i) => (
              <Badge key={i} variant="secondary">
                {w}
              </Badge>
            ))}
          </div>
        )}
      </Section>

      <Section title="4 · Lesson structure" empty={!plan?.lessonStructure?.length}>
        {plan?.lessonStructure && (
          <ol className="space-y-1 text-sm">
            {plan.lessonStructure.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-mono text-xs text-muted-foreground w-20 shrink-0 pt-0.5">
                  {s.time}
                </span>
                <span>{s.activity}</span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="5 · Video resources" empty={!plan?.videoResources?.length}>
        {plan?.videoResources && (
          <ul className="space-y-2 text-sm">
            {plan.videoResources.map((v, i) => (
              <li key={i}>
                <div className="font-semibold">
                  {v.platform} — {v.duration}
                </div>
                {v.url && (
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline text-xs"
                  >
                    {v.url}
                  </a>
                )}
                {v.timestampNotes && (
                  <p className="text-xs text-muted-foreground">{v.timestampNotes}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="6 · Authentic materials" empty={!plan?.authenticMaterials?.length}>
        <BulletList items={plan?.authenticMaterials} />
      </Section>

      <Section title="7 · Quiz preview" empty={!plan?.quizPreview?.length}>
        {plan?.quizPreview && (
          <ol className="space-y-2 text-sm list-decimal list-inside">
            {plan.quizPreview.map((q, i) => (
              <li key={i}>
                <div className="font-medium inline">{q.question}</div>
                {q.correctAnswer && (
                  <div className="text-xs text-emerald-700 mt-0.5">
                    <span className="font-semibold">Correct:</span> {q.correctAnswer}
                  </div>
                )}
                {q.explanation && (
                  <div className="text-xs text-muted-foreground">{q.explanation}</div>
                )}
              </li>
            ))}
          </ol>
        )}
      </Section>

      <Section title="8 · Writing prompt" empty={!plan?.writingPrompt}>
        {plan?.writingPrompt && (
          <p className="text-sm text-slate-800 whitespace-pre-wrap">{plan.writingPrompt}</p>
        )}
      </Section>

      <Section title="9 · Speaking app prompts (Ms. Coral)" empty={!plan?.speakingAppPrompts?.length}>
        <BulletList items={plan?.speakingAppPrompts} />
      </Section>

      <Section title="10 · Lab activities" empty={!plan?.labActivities?.length}>
        {plan?.labActivities && (
          <ul className="space-y-3 text-sm">
            {plan.labActivities.map((a, i) => (
              <li key={i} className="border-l-2 border-slate-200 pl-3">
                <div className="font-semibold">
                  {a.roomName}{" "}
                  {a.duration && <span className="text-muted-foreground font-normal">· {a.duration}</span>}
                </div>
                {a.instructions && <p className="text-sm mt-1">{a.instructions}</p>}
                {a.vocabularyToPractice?.length ? (
                  <div className="text-xs text-muted-foreground mt-1">
                    <span className="font-semibold">Vocab:</span>{" "}
                    {a.vocabularyToPractice.join(", ")}
                  </div>
                ) : null}
                {a.expectedOutcomes?.length ? (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-semibold">Expected:</span>{" "}
                    {a.expectedOutcomes.join("; ")}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="11 · Teacher notes"
        empty={
          !plan?.teacherNotes?.anticipatedQuestions?.length &&
          !plan?.teacherNotes?.commonStudentDifficulties?.length &&
          !plan?.teacherNotes?.extensionActivities?.length
        }
      >
        {plan?.teacherNotes?.anticipatedQuestions?.length ? (
          <div className="mb-2">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Anticipated questions
            </div>
            <BulletList items={plan.teacherNotes.anticipatedQuestions} />
          </div>
        ) : null}
        {plan?.teacherNotes?.commonStudentDifficulties?.length ? (
          <div className="mb-2">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Common difficulties
            </div>
            <BulletList items={plan.teacherNotes.commonStudentDifficulties} />
          </div>
        ) : null}
        {plan?.teacherNotes?.extensionActivities?.length ? (
          <div>
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Extension activities
            </div>
            <BulletList items={plan.teacherNotes.extensionActivities} />
          </div>
        ) : null}
      </Section>

      <Section
        title="12 · Differentiation"
        empty={
          !plan?.differentiation?.forStrugglingStudents?.length &&
          !plan?.differentiation?.forAdvancedStudents?.length
        }
      >
        {plan?.differentiation?.forStrugglingStudents?.length ? (
          <div className="mb-2">
            <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
              For struggling students
            </div>
            <BulletList items={plan.differentiation.forStrugglingStudents} />
          </div>
        ) : null}
        {plan?.differentiation?.forAdvancedStudents?.length ? (
          <div>
            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
              For advanced students
            </div>
            <BulletList items={plan.differentiation.forAdvancedStudents} />
          </div>
        ) : null}
      </Section>

      <Section title="13 · Cultural notes" empty={!plan?.culturalNotes}>
        {plan?.culturalNotes && (
          <p className="text-sm text-slate-800 whitespace-pre-wrap">{plan.culturalNotes}</p>
        )}
      </Section>

      <Section title="14 · Assessment criteria" empty={!plan?.assessmentCriteria}>
        {plan?.assessmentCriteria && (
          <p className="text-sm text-slate-800 whitespace-pre-wrap">{plan.assessmentCriteria}</p>
        )}
      </Section>

      <Section title="15 · Common mistakes (Spanish speakers)" empty={!plan?.commonMistakes?.length}>
        <BulletList items={plan?.commonMistakes} />
      </Section>

      <Section title="16 · Homework" empty={!plan?.homework}>
        {plan?.homework && (
          <p className="text-sm text-slate-800 whitespace-pre-wrap">{plan.homework}</p>
        )}
      </Section>

      <Section title="17 · Header reference" empty={false}>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Lesson ID: <code>{lesson.id}</code></div>
          <div>Course ID: <code>{lesson.courseId}</code></div>
          <div>Order: {lesson.orderIndex}</div>
          <div>Created: {new Date(lesson.createdAt).toLocaleDateString()}</div>
        </div>
      </Section>
    </div>
  );
}
