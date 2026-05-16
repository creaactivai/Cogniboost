/**
 * Exam taker — full 3-section mastery exam interface.
 *
 * Route: /dashboard/exam/:level
 *
 * The exam is a single attempt with three sequential sections, all
 * weighted into a final score:
 *   1. Quiz       (40%) — auto-graded multiple-choice + fill-in + T/F
 *   2. Writing    (30%) — free text graded by Claude (writing rubric)
 *   3. Speaking   (30%) — recorded audio graded by Whisper + Claude
 *
 * State is driven entirely by `attempt.status`:
 *   in_progress → quiz section visible
 *   quiz_done   → writing section visible
 *   writing_done → speaking section visible
 *   speaking_done → "Submit Final Exam" CTA → finalize → result
 *
 * On finalize, the server computes the weighted final score, issues a
 * Certificate if ≥ pass threshold, and bumps user_stats.currentLevel
 * to unlock the next CEFR course in the catalog.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Award, ArrowLeft, ArrowRight, CheckCircle2, Clock, AlertTriangle,
  Loader2, PenLine, Mic, Video, Trophy, Headphones, RotateCw,
} from "lucide-react";

interface FinalExamQuestion {
  id: string;
  moduleId: string | null;
  questionType: "multiple_choice" | "fill_in" | "true_false";
  questionText: string;
  options: string[] | null;
  cefrDescriptor: string | null;
  points: number;
  orderIndex: number;
}

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
  questions: FinalExamQuestion[];
}

interface FinalExamAttempt {
  id: string;
  examId: string;
  status: "in_progress" | "quiz_done" | "writing_done" | "speaking_done" | "graded" | "passed" | "failed";
  quizScore: string | null;
  writingScore: string | null;
  speakingScore: string | null;
  writingSubmissionId: string | null;
  speakingSubmissionId: string | null;
}

const SECTIONS = [
  { key: "quiz", label: "Quiz", icon: CheckCircle2 },
  { key: "writing", label: "Writing", icon: PenLine },
  { key: "speaking", label: "Speaking", icon: Mic },
  { key: "submit", label: "Submit", icon: Award },
];

function currentStep(status: string): number {
  if (status === "in_progress") return 0;
  if (status === "quiz_done") return 1;
  if (status === "writing_done") return 2;
  if (status === "speaking_done") return 3;
  return 4;
}

export default function ExamTakePage() {
  const { level } = useParams<{ level: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: exam, isLoading: examLoading, error: examError } = useQuery<FinalExam>({
    queryKey: [`/api/final-exams/${level}`],
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", `/api/final-exams/${level}/start`, {});
      return (await r.json()) as FinalExamAttempt;
    },
  });
  useEffect(() => {
    if (exam && !startMutation.data && !startMutation.isPending) {
      startMutation.mutate();
    }
  }, [exam]);

  // Poll attempt status to drive the stepper
  const attemptId = startMutation.data?.id;
  const { data: attempt } = useQuery<FinalExamAttempt>({
    queryKey: [`/api/final-exam-attempts/${attemptId}`],
    enabled: !!attemptId,
    refetchInterval: 5000,
  });

  if (examLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (examError || !exam) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card className="p-8 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
          <h2 className="text-lg font-bold">Exam not found or not published yet</h2>
          <Button onClick={() => navigate("/dashboard/exams")}><ArrowLeft className="w-4 h-4 mr-2" /> Back to exams</Button>
        </Card>
      </div>
    );
  }
  if (!attempt) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const step = currentStep(attempt.status);

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4" data-testid="page-exam-take">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/exams")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Exams
        </Button>
        <h1 className="text-xl font-bold">{exam.title}</h1>
        <Badge variant="outline" className="text-xs">{exam.level}</Badge>
        <Badge variant="secondary" className="text-xs"><Clock className="w-3 h-3 mr-1" /> {exam.durationMinutes} min</Badge>
        <Badge className="text-xs bg-primary"><Award className="w-3 h-3 mr-1" /> Pass at {exam.passingScore}</Badge>
      </div>

      {/* Stepper */}
      <Card className="p-3">
        <div className="flex items-center justify-between gap-2">
          {SECTIONS.map((s, i) => {
            const Icon = s.icon;
            const done = step > i;
            const active = step === i;
            return (
              <div key={s.key} className="flex-1 flex items-center gap-2 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-emerald-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-xs font-semibold truncate ${active ? "text-primary" : done ? "text-emerald-700" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
                {i < SECTIONS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${done ? "bg-emerald-500" : "bg-muted"}`} />
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* SECTION 1: QUIZ */}
      {step === 0 && (
        <QuizSection
          exam={exam}
          attempt={attempt}
          onSubmitted={() => qc.invalidateQueries({ queryKey: [`/api/final-exam-attempts/${attemptId}`] })}
        />
      )}

      {/* SECTION 2: WRITING */}
      {step === 1 && (
        <WritingSection
          exam={exam}
          attempt={attempt}
          onSubmitted={() => qc.invalidateQueries({ queryKey: [`/api/final-exam-attempts/${attemptId}`] })}
        />
      )}

      {/* SECTION 3: SPEAKING */}
      {step === 2 && (
        <SpeakingSection
          exam={exam}
          attempt={attempt}
          onSubmitted={() => qc.invalidateQueries({ queryKey: [`/api/final-exam-attempts/${attemptId}`] })}
        />
      )}

      {/* SECTION 4: FINAL SUBMIT */}
      {step === 3 && (
        <FinalSubmitSection
          exam={exam}
          attempt={attempt}
          onFinalized={(data) => {
            qc.invalidateQueries({ queryKey: [`/api/final-exam-attempts/${attemptId}`] });
            navigate(`/dashboard/exam/${level}/result/${attempt.id}`);
          }}
        />
      )}

      {step === 4 && (
        <Card className="p-8 text-center space-y-3">
          <Trophy className="w-10 h-10 mx-auto text-amber-500" />
          <p className="text-lg font-bold">Exam complete</p>
          <Button onClick={() => navigate(`/dashboard/exam/${level}/result/${attempt.id}`)}>
            View result
          </Button>
        </Card>
      )}
    </div>
  );
}

/* ----------------------------- QUIZ ----------------------------- */
function QuizSection({ exam, attempt, onSubmitted }: { exam: FinalExam; attempt: FinalExamAttempt; onSubmitted: () => void }) {
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const total = exam.questions.length;
  const answeredCount = useMemo(() => Object.values(answers).filter(v => v !== undefined && v !== "").length, [answers]);
  const allAnswered = total > 0 && answeredCount === total;

  const submit = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/final-exam-attempts/${attempt.id}/submit-quiz`, { answers });
    },
    onSuccess: () => { toast({ title: "Quiz section submitted ✓" }); onSubmitted(); },
    onError: (e: any) => toast({ title: "Couldn't submit quiz", description: e?.message, variant: "destructive" }),
  });

  if (total === 0) {
    return (
      <Card className="p-8 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 mx-auto text-amber-500" />
        <h2 className="text-lg font-bold">No quiz questions configured yet</h2>
        <p className="text-sm text-muted-foreground">Coral is still building the {exam.level} question bank.</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-4 bg-blue-50/50 border-blue-200 text-sm">
        <p><strong>Section 1 of 3 · Quiz ({exam.quizWeight}% of final score).</strong> Answer all {total} questions. Auto-graded immediately.</p>
      </Card>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(answeredCount / total) * 100}%` }} />
        </div>
        <span className="text-xs font-mono text-muted-foreground tabular-nums">{answeredCount}/{total}</span>
      </div>

      {exam.questions.map((q, idx) => (
        <Card key={q.id} className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-xs font-bold text-primary tabular-nums w-6 flex-shrink-0">{idx + 1}.</span>
            <div className="flex-1">
              <p className="text-sm font-semibold leading-snug">{q.questionText}</p>
              {q.cefrDescriptor && <p className="text-[10px] text-muted-foreground mt-1 italic">CEFR — {q.cefrDescriptor}</p>}
            </div>
            {answers[q.id] && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
          </div>

          {q.questionType === "multiple_choice" && q.options && (
            <div className="space-y-2 ml-9">
              {q.options.map((opt, oi) => (
                <button type="button" key={oi}
                  onClick={() => setAnswers({ ...answers, [q.id]: String(oi) })}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${answers[q.id] === String(oi) ? "border-primary bg-primary/5 font-medium" : "border-border hover:bg-muted/50"}`}>
                  <span className="font-mono text-xs mr-2 text-muted-foreground">{String.fromCharCode(65 + oi)})</span>
                  {opt}
                </button>
              ))}
            </div>
          )}
          {q.questionType === "fill_in" && (
            <div className="ml-9">
              <input type="text" value={answers[q.id] || ""}
                onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                placeholder="Type your answer"
                className="w-full p-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          )}
          {q.questionType === "true_false" && (
            <div className="flex gap-2 ml-9">
              {["true", "false"].map((v) => (
                <button key={v} type="button" onClick={() => setAnswers({ ...answers, [q.id]: v })}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${answers[q.id] === v ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                  {v}
                </button>
              ))}
            </div>
          )}
        </Card>
      ))}

      <Card className="p-4 sticky bottom-4 flex items-center justify-between gap-3 shadow-lg bg-card/95 backdrop-blur">
        <div className="text-sm">{allAnswered ? <span className="font-semibold text-emerald-700">All answered ✓</span> : <span className="text-muted-foreground">{total - answeredCount} more</span>}</div>
        <Button disabled={!allAnswered || submit.isPending} onClick={() => submit.mutate()}>
          {submit.isPending ? "Submitting…" : <>Continue to Writing <ArrowRight className="w-4 h-4 ml-1" /></>}
        </Button>
      </Card>
    </>
  );
}

/* ----------------------------- WRITING ----------------------------- */
function WritingSection({ exam, attempt, onSubmitted }: { exam: FinalExam; attempt: FinalExamAttempt; onSubmitted: () => void }) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const meetsMin = words >= exam.writingMinWords;

  const submit = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/final-exam-attempts/${attempt.id}/submit-writing`, { text });
    },
    onSuccess: () => { toast({ title: "Writing section submitted ✓", description: "Grading started in the background." }); onSubmitted(); },
    onError: (e: any) => toast({ title: "Couldn't submit writing", description: e?.message, variant: "destructive" }),
  });

  return (
    <>
      <Card className="p-4 bg-cyan-50/50 border-cyan-200 text-sm">
        <p><strong>Section 2 of 3 · Writing ({exam.writingWeight}% of final score).</strong> {exam.writingMinWords}-{exam.writingMaxWords} words. Graded by the CogniBoost Writing Rubric.</p>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><PenLine className="w-4 h-4 text-primary" /> Writing prompt</h3>
        <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">{exam.writingPrompt}</p>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Your response</h3>
          <span className={`text-xs font-mono ${meetsMin ? "text-emerald-600" : "text-muted-foreground"}`}>
            {words} word{words === 1 ? "" : "s"} {meetsMin && "✓"}
          </span>
        </div>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Write ${exam.writingMinWords}-${exam.writingMaxWords} words…`}
          rows={12}
          className="font-mono text-sm"
        />
        {!meetsMin && words > 0 && (
          <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Below the {exam.writingMinWords}-word minimum for {exam.level}.</p>
        )}
      </Card>

      <Card className="p-4 sticky bottom-4 flex items-center justify-between gap-3 shadow-lg bg-card/95 backdrop-blur">
        <span className="text-xs text-muted-foreground">Section 2 of 3</span>
        <Button disabled={!meetsMin || submit.isPending} onClick={() => submit.mutate()}>
          {submit.isPending ? "Submitting…" : <>Continue to Speaking <ArrowRight className="w-4 h-4 ml-1" /></>}
        </Button>
      </Card>
    </>
  );
}

/* ----------------------------- SPEAKING ----------------------------- */
function SpeakingSection({ exam, attempt, onSubmitted }: { exam: FinalExam; attempt: FinalExamAttempt; onSubmitted: () => void }) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"audio" | "video">("audio");
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const meetsMin = duration >= exam.speakingMinSeconds;

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(mode === "video" ? { audio: true, video: true } : { audio: true });
      const mimeType = mode === "video" ? "video/webm" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mimeType });
        setBlob(b);
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setBlob(null);
      setDuration(0);
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000)), 200);
    } catch (e: any) {
      toast({ title: "Couldn't access microphone", description: e?.message, variant: "destructive" });
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
  }

  const submit = useMutation({
    mutationFn: async () => {
      if (!blob) throw new Error("No recording");
      const fd = new FormData();
      fd.append("recording", blob, mode === "video" ? "exam-recording.webm" : "exam-recording.webm");
      fd.append("isVideo", String(mode === "video"));
      fd.append("clientDurationSeconds", String(duration));
      const r = await fetch(`/api/final-exam-attempts/${attempt.id}/submit-speaking`, {
        method: "POST", body: fd, credentials: "include",
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || `Status ${r.status}`);
      }
      return r.json();
    },
    onSuccess: () => { toast({ title: "Speaking section submitted ✓", description: "Grading started in the background." }); onSubmitted(); },
    onError: (e: any) => toast({ title: "Couldn't submit speaking", description: e?.message, variant: "destructive" }),
  });

  const previewUrl = useMemo(() => blob ? URL.createObjectURL(blob) : null, [blob]);
  useEffect(() => { return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }; }, [previewUrl]);

  return (
    <>
      <Card className="p-4 bg-purple-50/50 border-purple-200 text-sm">
        <p><strong>Section 3 of 3 · Speaking ({exam.speakingWeight}% of final score).</strong> Speak for {exam.speakingMinSeconds}-{exam.speakingMaxSeconds} seconds. Graded by Whisper + the Speaking Rubric.</p>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Mic className="w-4 h-4 text-primary" /> Speaking prompt</h3>
        <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">{exam.speakingPrompt}</p>
      </Card>

      <Card className="p-5 space-y-4">
        {/* Mode toggle */}
        {!recording && !blob && (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setMode("audio")} className={`p-4 rounded-lg border text-sm font-medium ${mode === "audio" ? "border-primary bg-primary/5" : "border-border"}`}>
              <Mic className="w-6 h-6 mx-auto mb-1" /> Audio only
            </button>
            <button type="button" onClick={() => setMode("video")} className={`p-4 rounded-lg border text-sm font-medium ${mode === "video" ? "border-primary bg-primary/5" : "border-border"}`}>
              <Video className="w-6 h-6 mx-auto mb-1" /> Audio + video
            </button>
          </div>
        )}

        {recording && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 p-4 rounded-lg text-center space-y-2">
            <div className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              <span className="font-semibold">Recording…</span>
              <span className="text-2xl font-mono tabular-nums">{duration}s</span>
            </div>
            <p className="text-xs text-muted-foreground">Target: {exam.speakingMinSeconds}-{exam.speakingMaxSeconds}s</p>
            <Button onClick={stopRecording} variant="destructive" size="sm">Stop recording</Button>
          </div>
        )}

        {blob && !recording && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm flex items-center gap-2"><Headphones className="w-4 h-4" /> Listen back</h4>
            {mode === "video" ? (
              <video controls src={previewUrl!} className="w-full rounded-lg" />
            ) : (
              <audio controls src={previewUrl!} className="w-full" />
            )}
            <p className="text-xs text-muted-foreground">Duration: {duration}s {!meetsMin && <span className="text-amber-600">· Below {exam.speakingMinSeconds}s minimum</span>}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setBlob(null); setDuration(0); }}>
                <RotateCw className="w-4 h-4 mr-1" /> Retake
              </Button>
            </div>
          </div>
        )}

        {!recording && !blob && (
          <Button onClick={startRecording} className="w-full">
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600" /> Start recording
            </span>
          </Button>
        )}
      </Card>

      {blob && (
        <Card className="p-4 sticky bottom-4 flex items-center justify-between gap-3 shadow-lg bg-card/95 backdrop-blur">
          <span className="text-xs text-muted-foreground">Section 3 of 3 · final step</span>
          <Button disabled={submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? "Uploading…" : <>Submit speaking <ArrowRight className="w-4 h-4 ml-1" /></>}
          </Button>
        </Card>
      )}
    </>
  );
}

/* ----------------------------- FINAL SUBMIT ----------------------------- */
function FinalSubmitSection({ exam, attempt, onFinalized }: { exam: FinalExam; attempt: FinalExamAttempt; onFinalized: (data: any) => void }) {
  const { toast } = useToast();
  const finalize = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", `/api/final-exam-attempts/${attempt.id}/finalize`, {});
      return r.json();
    },
    onSuccess: (data) => onFinalized(data),
    onError: (e: any) => toast({ title: "Couldn't finalize", description: e?.message, variant: "destructive" }),
  });

  return (
    <Card className="p-8 text-center space-y-4">
      <Trophy className="w-12 h-12 mx-auto text-amber-500" />
      <h2 className="text-xl font-bold">All sections submitted</h2>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Your Writing and Speaking submissions are being graded by AI right now (~30-60 seconds).
        Click below to finalize the exam and see your weighted final score.
      </p>
      <Button onClick={() => finalize.mutate()} disabled={finalize.isPending} size="lg">
        {finalize.isPending ? "Finalizing…" : <><Award className="w-4 h-4 mr-2" /> Finalize exam & see result</>}
      </Button>
    </Card>
  );
}
