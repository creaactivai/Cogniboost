/**
 * Cierre de clase — end-of-class screen for the STUDENT.
 *
 * Appears when the teacher ends the class (Coral's option A: only students
 * present at that moment). A quick mini-quiz recap (from the class vocabulary,
 * built by AI + cached) plus a 2-question survey. Optional, +15 XP, and every
 * answer stays inside CogniBoost (no external Sheets).
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Star, Check } from "lucide-react";

interface QuizQ { q: string; options: string[]; correct: number }

export function ClaseCierre({
  sessionId, topic, onDone,
}: {
  sessionId: string;
  topic?: string;
  onDone: (msg?: string) => void;
}) {
  const { data: quiz, isLoading } = useQuery<{ available: boolean; questions: QuizQ[] }>({
    queryKey: [`/api/lab-sessions/${sessionId}/quiz`],
    staleTime: 60 * 60 * 1000,
  });
  const questions = quiz?.available ? quiz.questions : [];

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [classRating, setClassRating] = useState(0);
  const [teacherRating, setTeacherRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const score = questions.reduce((n, q, i) => n + (answers[i] === q.correct ? 1 : 0), 0);

  const submit = async (skip: boolean) => {
    if (skip) { onDone(); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/lab-feedback", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labSessionId: sessionId,
          classRating: classRating || null,
          teacherRating: teacherRating || null,
          comment: comment.trim() || null,
          quizScore: questions.length ? score : null,
          quizTotal: questions.length || null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      onDone(j?.xpAwarded ? `¡Gracias! +${j.xpAwarded} XP` : "¡Gracias por tu opinión!");
    } catch {
      onDone("¡Gracias!");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-testid="clase-cierre">
      <div className="w-full max-w-md bg-background rounded-2xl border shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 text-center border-b">
          <h2 className="text-lg font-bold">¡Terminó la clase!</h2>
          {topic && <p className="text-xs text-muted-foreground mt-0.5">Un cierre rapidito · {topic}</p>}
          <span className="inline-block mt-2 text-[11px] font-bold text-primary bg-primary/10 rounded-full px-2.5 py-0.5">+15 XP al completar</span>
        </div>

        <div className="p-5 space-y-5">
          {isLoading ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" /> Preparando tu repaso…</p>
          ) : questions.length > 0 ? (
            <div className="space-y-4">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Repaso de hoy</p>
              {questions.map((q, qi) => {
                const done = answers[qi] !== undefined;
                return (
                  <div key={qi}>
                    <p className="text-sm font-semibold mb-2">{qi + 1}. {q.q}</p>
                    <div className="flex flex-col gap-1.5">
                      {q.options.map((opt, oi) => {
                        const isCorrect = oi === q.correct;
                        const cls = !done
                          ? "bg-muted/50 hover:border-primary cursor-pointer"
                          : isCorrect
                            ? "bg-green-50 dark:bg-green-950/30 border-green-500 text-green-700 dark:text-green-400 font-semibold"
                            : oi === answers[qi]
                              ? "bg-red-50 dark:bg-red-950/30 border-red-500 text-red-700 dark:text-red-400"
                              : "bg-muted/50 opacity-60";
                        return (
                          <button
                            key={oi}
                            type="button"
                            disabled={done}
                            onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                            className={`text-left border rounded-lg px-3 py-2 text-[13px] transition ${cls}`}
                            data-testid={`cierre-q${qi}-opt${oi}`}
                          >
                            {done && isCorrect && <Check className="w-3.5 h-3.5 inline mr-1" />}{opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="space-y-3 border-t pt-4">
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">¿Cómo estuvo?</p>
            <StarRow label="¿Qué tanto te gustó la clase?" value={classRating} onChange={setClassRating} testid="rate-class" />
            <StarRow label="¿Cómo evalúas a tu maestra?" value={teacherRating} onChange={setTeacherRating} testid="rate-teacher" />
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="¿Algún comentario? (opcional)"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-muted/40 resize-none"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => submit(true)} disabled={submitting} data-testid="cierre-skip">Saltar</Button>
            <Button className="flex-1" onClick={() => submit(false)} disabled={submitting} data-testid="cierre-submit">{submitting ? "Enviando…" : "Enviar"}</Button>
          </div>
          <p className="text-[11px] text-muted-foreground text-center italic">Opcional · tus respuestas se quedan dentro de CogniBoost</p>
        </div>
      </div>
    </div>
  );
}

function StarRow({ label, value, onChange, testid }: { label: string; value: number; onChange: (n: number) => void; testid: string }) {
  return (
    <div>
      <p className="text-[13px] font-medium mb-1">{label}</p>
      <div className="flex gap-1" data-testid={testid}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} estrellas`}>
            <Star className={`w-6 h-6 ${n <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}
