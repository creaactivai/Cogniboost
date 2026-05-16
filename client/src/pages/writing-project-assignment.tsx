/**
 * Writing Project page — student-facing text editor for the per-module
 * writing prompt. Mirrors speaking-assignment.tsx but for written text.
 *
 *   1. Open /dashboard/writing-project/:moduleId
 *   2. We fetch the writing project (prompt + target vocab/grammar/expressions)
 *   3. Student writes in a textarea with live word count + autosave
 *   4. On submit, POST text → backend grades async with the Writing Rubric
 *   5. Redirect to /dashboard/writing-project-submissions/:id (poller)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { RubricSummary } from "@/components/rubric-summary";
import { PenLine, BookOpen, Quote, AlertTriangle, CheckCircle2, Lightbulb } from "lucide-react";

interface WritingProject {
  id: string;
  moduleId: string;
  level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  title: string;
  prompt: string;
  targetVocabulary: string[];
  targetGrammar: string[];
  targetExpressions: string[];
  targetWordCountMin: number;
  targetWordCountMax: number;
  isPublished: boolean;
}

const AUTOSAVE_INTERVAL_MS = 30_000;

function countWords(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}

function localStorageKeyFor(projectId: string): string {
  return `cogniboost.writing-project-draft.${projectId}`;
}

export default function WritingProjectAssignmentPage() {
  const params = useParams<{ moduleId: string }>();
  const moduleId = params.moduleId;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: project, isLoading, isError } = useQuery<WritingProject>({
    queryKey: [`/api/writing-projects/by-module/${moduleId}`],
    enabled: !!moduleId,
  });

  const [content, setContent] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const draftKey = useMemo(() => (project ? localStorageKeyFor(project.id) : null), [project]);

  // Restore draft on mount
  useEffect(() => {
    if (!draftKey) return;
    const raw = localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      if (draft.content) {
        setContent(draft.content);
        setLastSavedAt(draft.lastSavedAt ?? null);
      }
    } catch {
      localStorage.removeItem(draftKey);
    }
  }, [draftKey]);

  // Autosave every 30s
  useEffect(() => {
    if (!draftKey) return;
    if (autosaveTimer.current) clearInterval(autosaveTimer.current);
    autosaveTimer.current = setInterval(() => {
      if (!content.trim()) return;
      const draft = { content, lastSavedAt: Date.now() };
      localStorage.setItem(draftKey, JSON.stringify(draft));
      setLastSavedAt(draft.lastSavedAt);
    }, AUTOSAVE_INTERVAL_MS);
    return () => {
      if (autosaveTimer.current) clearInterval(autosaveTimer.current);
    };
  }, [content, draftKey]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!project || !content.trim()) throw new Error("Empty submission");
      const res = await fetch("/api/writing-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          writingProjectId: project.id,
          moduleId: project.moduleId,
          content,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || `Submission failed: ${res.status}`);
      }
      return res.json() as Promise<{ submissionId: string }>;
    },
    onSuccess: (data) => {
      if (draftKey) localStorage.removeItem(draftKey);
      toast({
        title: "Writing submitted!",
        description: "Your grade is being prepared. This takes ~30 seconds.",
      });
      navigate(`/dashboard/writing-project-submissions/${data.submissionId}`);
    },
    onError: (err: any) => {
      toast({
        title: "Submission failed",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const wordCount = countWords(content);
  const minWords = project?.targetWordCountMin ?? 40;
  const maxWords = project?.targetWordCountMax ?? 80;
  const tooShort = wordCount > 0 && wordCount < minWords;
  const tooLong = wordCount > maxWords * 1.5;
  const canSubmit = wordCount >= Math.max(15, Math.floor(minWords * 0.5)) && !submitMutation.isPending;

  if (isLoading) {
    return <div className="max-w-3xl mx-auto p-6 text-center">Loading writing project…</div>;
  }
  if (isError || !project) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-2">No writing project found</h2>
          <p className="text-muted-foreground">
            This module doesn't have a writing project yet. Check back soon!
          </p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard")}>
            Back to dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6" data-testid="page-writing-project">
      <div>
        <Badge variant="outline" className="mb-2">{project.level} Writing Project</Badge>
        <h1 className="text-2xl font-bold">{project.title}</h1>
      </div>

      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <PenLine className="w-5 h-5 text-primary" /> Writing Prompt
        </h3>
        <p className="text-base leading-relaxed">{project.prompt}</p>
      </Card>

      {/* Rubric summary — students see HOW they'll be graded before they write */}
      <RubricSummary type="writing" level={project.level} />

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h4 className="font-semibold text-sm mb-2 text-muted-foreground flex items-center gap-2"><BookOpen className="w-4 h-4" /> USE THESE WORDS</h4>
          <div className="flex flex-wrap gap-1">
            {project.targetVocabulary.map((v) => (
              <span key={v} className="text-xs bg-secondary px-2 py-1 rounded">{v}</span>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h4 className="font-semibold text-sm mb-2 text-muted-foreground flex items-center gap-2"><PenLine className="w-4 h-4" /> GRAMMAR FOCUS</h4>
          <ul className="text-xs space-y-1">
            {project.targetGrammar.map((g) => <li key={g}>• {g}</li>)}
          </ul>
        </Card>
        <Card className="p-4">
          <h4 className="font-semibold text-sm mb-2 text-muted-foreground flex items-center gap-2"><Quote className="w-4 h-4" /> EXPRESSIONS</h4>
          <ul className="text-xs space-y-1">
            {project.targetExpressions.map((e) => <li key={e}>• {e}</li>)}
          </ul>
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex justify-between items-center gap-2">
          <h3 className="font-semibold">Your writing</h3>
          <div className="text-sm tabular-nums">
            <span className={tooShort ? "text-amber-600" : tooLong ? "text-amber-600" : "text-primary"}>
              {wordCount}
            </span>
            <span className="text-muted-foreground"> / {minWords}-{maxWords} words</span>
          </div>
        </div>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing here…"
          className="min-h-[300px] font-mono text-base leading-relaxed"
          data-testid="textarea-writing-project"
        />
        {tooShort && (
          <p className="text-sm text-amber-600">
            <span className="inline-flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> Your text is shorter than the suggested minimum ({minWords} words). You can still submit, but Task Achievement will likely score low.</span>
          </p>
        )}
        {tooLong && (
          <p className="text-sm text-amber-600">
            <span className="inline-flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> Your text is much longer than expected for {project.level} (up to {maxWords} words). Length above the target is OK, but excessive length can hurt focus.</span>
          </p>
        )}
        {lastSavedAt && (
          <p className="text-xs text-muted-foreground">
            Auto-saved {new Date(lastSavedAt).toLocaleTimeString()}
          </p>
        )}

        <div className="flex gap-3 justify-end pt-2">
          <Button
            variant="outline"
            onClick={() => {
              if (draftKey) localStorage.removeItem(draftKey);
              setContent("");
              setLastSavedAt(null);
            }}
          >
            Clear
          </Button>
          <Button
            size="lg"
            onClick={() => submitMutation.mutate()}
            disabled={!canSubmit}
            data-testid="button-submit-writing-project"
          >
            {submitMutation.isPending ? (
              "Submitting…"
            ) : (
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Submit Writing</span>
            )}
          </Button>
        </div>
      </Card>

      <Card className="p-4 bg-muted/50">
        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-primary" /> Tips for a great writing</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Address every part of the prompt</li>
          <li>• Try to use the target vocabulary, grammar, and expressions</li>
          <li>• Stay within the suggested word range — too short hurts Task Achievement</li>
          <li>• Your draft auto-saves every 30 seconds — feel free to take your time</li>
        </ul>
      </Card>
    </div>
  );
}
