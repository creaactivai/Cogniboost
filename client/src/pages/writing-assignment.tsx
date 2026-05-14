/**
 * Writing-assignment page — student-facing editor.
 *
 * Master Plan v2.0 §4.1 (Submission Flow):
 *   1. Student opens a writing assignment.
 *   2. Rich-text-ish editor with word count + autosave every 30s.
 *   3. On submit, content is POSTed to /api/submissions with status='pending_ai'.
 *   4. Student is redirected to /dashboard/submissions/:id which polls until
 *      grading completes.
 *
 * v1: plain textarea (not rich-text). Rich-text comes later if Coral asks —
 * for B1/B2 essays it's actively unhelpful (encourages students to style
 * instead of write).
 *
 * Autosave persists to localStorage keyed by lessonId (or "new" for ad-hoc
 * assignments). On submit, the localStorage draft is cleared.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Submission } from "@/types/submission";

const AUTOSAVE_INTERVAL_MS = 30_000;
const MIN_WORDS = 50;
const RECOMMENDED_WORDS = 200;

function countWords(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}

function localStorageKeyFor(lessonId: string | null): string {
  return `cogniboost.writing-draft.${lessonId ?? "new"}`;
}

interface WritingDraft {
  content: string;
  lastSavedAt: number;
}

interface CreateSubmissionPayload {
  lessonId: string | null;
  assignmentType: "writing";
  content: string;
  writingPrompt?: string;
  assignment?: string;
}

export default function WritingAssignmentPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { toast } = useToast();

  // URL params: ?lessonId=X&prompt=Y&assignment=Z
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const lessonId = params.get("lessonId");
  const writingPrompt = params.get("prompt") ?? "";
  const assignment = params.get("assignment") ?? "";

  const draftKey = localStorageKeyFor(lessonId);
  const [content, setContent] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const autosaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore draft on mount
  useEffect(() => {
    const raw = localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const draft: WritingDraft = JSON.parse(raw);
      if (draft.content) {
        setContent(draft.content);
        setLastSavedAt(draft.lastSavedAt ?? null);
      }
    } catch {
      // Corrupt draft — wipe.
      localStorage.removeItem(draftKey);
    }
  }, [draftKey]);

  // Autosave every 30s while editing
  useEffect(() => {
    if (autosaveTimer.current) clearInterval(autosaveTimer.current);
    autosaveTimer.current = setInterval(() => {
      if (!content.trim()) return;
      const draft: WritingDraft = { content, lastSavedAt: Date.now() };
      localStorage.setItem(draftKey, JSON.stringify(draft));
      setLastSavedAt(draft.lastSavedAt);
    }, AUTOSAVE_INTERVAL_MS);
    return () => {
      if (autosaveTimer.current) clearInterval(autosaveTimer.current);
    };
  }, [content, draftKey]);

  const wordCount = countWords(content);
  const aboveMin = wordCount >= MIN_WORDS;
  const aboveRecommended = wordCount >= RECOMMENDED_WORDS;

  const submitMutation = useMutation({
    mutationFn: async (payload: CreateSubmissionPayload): Promise<Submission> => {
      const res = await apiRequest("POST", "/api/submissions", payload);
      return res.json();
    },
    onSuccess: (submission) => {
      localStorage.removeItem(draftKey);
      queryClient.invalidateQueries({ queryKey: ["/api/submissions/me"] });
      toast({
        title: "Submitted",
        description: "Your writing is being graded. This usually takes about 1–2 minutes.",
      });
      navigate(`/dashboard/submissions/${submission.id}`);
    },
    onError: (err: Error) => {
      toast({
        title: "Could not submit",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  function handleSubmit() {
    if (!aboveMin) return;
    submitMutation.mutate({
      lessonId,
      assignmentType: "writing",
      content,
      writingPrompt: writingPrompt || undefined,
      assignment: assignment || undefined,
    });
  }

  function clearDraft() {
    if (confirm("Clear this draft? You'll lose what you've written so far.")) {
      localStorage.removeItem(draftKey);
      setContent("");
      setLastSavedAt(null);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6" data-testid="page-writing-assignment">
      <h1 className="text-2xl font-bold mb-1">Writing assignment</h1>
      {assignment && (
        <p className="text-sm text-muted-foreground mb-4">{assignment}</p>
      )}

      {writingPrompt && (
        <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
          <div className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-1">
            Prompt
          </div>
          <p className="text-sm text-slate-900 whitespace-pre-wrap">{writingPrompt}</p>
        </Card>
      )}

      <Card className="p-4 mb-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing here. Aim for at least 200 words. The platform autosaves every 30 seconds, but submitting locks the version that will be graded."
          rows={18}
          className="resize-y font-serif text-base leading-relaxed"
          data-testid="input-writing-content"
        />
      </Card>

      <div className="flex items-center justify-between mb-4 text-sm">
        <div className="flex items-center gap-3">
          <Badge variant={aboveRecommended ? "default" : aboveMin ? "secondary" : "outline"}>
            {wordCount} words
          </Badge>
          <span className="text-muted-foreground">
            {aboveRecommended
              ? "Great length"
              : aboveMin
                ? `Minimum met. Aim for ${RECOMMENDED_WORDS}+ for a stronger score.`
                : `Minimum ${MIN_WORDS} words to submit`}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {lastSavedAt
            ? `Autosaved ${new Date(lastSavedAt).toLocaleTimeString()}`
            : "Not yet saved"}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={handleSubmit}
          disabled={!aboveMin || submitMutation.isPending}
          data-testid="button-submit-writing"
        >
          {submitMutation.isPending ? "Submitting…" : "Submit for grading"}
        </Button>
        <Button
          variant="ghost"
          onClick={clearDraft}
          disabled={!content || submitMutation.isPending}
          data-testid="button-clear-draft"
        >
          Clear draft
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Grading uses Claude 4.6 against the CEFR rubric for your level. After submission you'll see
        an AI-graded score within ~2 minutes; a teacher then reviews and finalizes the grade.
      </p>
    </div>
  );
}
