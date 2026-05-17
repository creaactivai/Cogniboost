/**
 * ClickableWordPassage — wraps every word in the reading passage in a
 * clickable span. Clicking a word opens a popover with:
 *   - Translation (Spanish)
 *   - Short definition (English)
 *   - Speaker button (Coral's voice via /api/vocab/audio)
 *   - "Add to my vocabulary" button → creates an SRS card instantly
 *
 * Definitions are fetched on-demand from /api/vocab/word-info and cached
 * server-side, so subsequent clicks on the same word — by ANYONE — are
 * instant and free.
 */

import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Volume2, Plus, Check, Loader2, BookOpen } from "lucide-react";

interface WordInfo {
  term: string;
  translation: string;
  definition: string;
  partOfSpeech?: string;
  phonetic?: string;
  inMyVocab: boolean;
}

interface Props {
  passage: string;
  /** CEFR level passed to /api/vocab/word-info for level-appropriate defs */
  level?: string;
  /** Optional moduleId so an added card knows its source module */
  moduleId?: string;
}

/**
 * Split the passage into tokens that are either:
 *   - clickable words (letters + apostrophes, e.g. "don't", "happy")
 *   - non-word segments (spaces, punctuation, newlines)
 *
 * We render non-word segments as plain text and wrap word tokens.
 */
function tokenize(passage: string): Array<{ word: boolean; text: string }> {
  // Match word-like tokens (letters, apostrophes, hyphens inside words)
  const re = /([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'\-]*)/g;
  const tokens: Array<{ word: boolean; text: string }> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(passage)) !== null) {
    if (m.index > last) tokens.push({ word: false, text: passage.slice(last, m.index) });
    tokens.push({ word: true, text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < passage.length) tokens.push({ word: false, text: passage.slice(last) });
  return tokens;
}

export function ClickableWordPassage({ passage, level, moduleId }: Props) {
  const tokens = tokenize(passage);

  return (
    <article className="prose prose-slate max-w-none text-[15px] leading-relaxed whitespace-pre-wrap">
      {tokens.map((t, i) =>
        t.word ? (
          <WordToken key={i} word={t.text} level={level} moduleId={moduleId} />
        ) : (
          <span key={i}>{t.text}</span>
        )
      )}
    </article>
  );
}

function WordToken({ word, level, moduleId }: { word: string; level?: string; moduleId?: string }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<WordInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const { toast } = useToast();
  const audioCacheRef = useRef<Map<string, string>>(new Map());

  const fetchInfo = async () => {
    if (info || loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ word });
      if (level) params.set("level", level);
      const r = await fetch(`/api/vocab/word-info?${params.toString()}`, { credentials: "include" });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Failed");
      setInfo(data);
      setAdded(!!data.inMyVocab);
    } catch (err: any) {
      console.warn("[word-info]", err);
      toast({ title: "Couldn't load word info", description: err?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchInfo();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const playWord = async () => {
    const cached = audioCacheRef.current.get(word.toLowerCase());
    if (cached) {
      new Audio(cached).play().catch(() => {});
      return;
    }
    try {
      const r = await fetch(`/api/vocab/audio?term=${encodeURIComponent(word)}`, { credentials: "include" });
      if (r.ok) {
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        audioCacheRef.current.set(word.toLowerCase(), url);
        new Audio(url).play().catch(() => {});
        return;
      }
    } catch {}
    // Fallback: browser SpeechSynthesis
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = "en-US";
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  };

  const addToVocab = async () => {
    if (added) return;
    try {
      const r = await apiRequest("POST", "/api/vocab/add", {
        term: word,
        translation: info?.translation,
        exampleEn: undefined,
        partOfSpeech: info?.partOfSpeech,
        level,
        moduleId,
        sourceType: "reading",
      });
      const data = await r.json();
      if (!r.ok && r.status !== 200) throw new Error(data?.error || "Failed");
      setAdded(true);
      toast({ title: `Added "${word}" to your vocabulary ✓` });
    } catch (err: any) {
      console.warn("[add-to-vocab]", err);
      toast({ title: "Couldn't add", description: err?.message, variant: "destructive" });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          className="cursor-pointer rounded px-0.5 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30 transition-colors"
          data-testid={`word-${word.toLowerCase()}`}
        >
          {word}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-bold text-lg leading-tight truncate">{word}</h4>
              {info?.phonetic && (
                <p className="text-xs font-mono text-muted-foreground italic">/{info.phonetic}/</p>
              )}
            </div>
            <button
              onClick={playWord}
              className="p-2 rounded-full hover:bg-primary/10 text-primary flex-shrink-0"
              title="Pronunciar"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando…
            </div>
          )}

          {info && !loading && (
            <div className="space-y-1.5 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Traducción</p>
                <p className="font-medium">{info.translation}</p>
              </div>
              {info.partOfSpeech && (
                <Badge variant="outline" className="text-[10px]">{info.partOfSpeech}</Badge>
              )}
              {info.definition && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1.5">Definition</p>
                  <p className="text-xs text-muted-foreground italic">{info.definition}</p>
                </div>
              )}
            </div>
          )}

          <Button
            size="sm"
            variant={added ? "outline" : "default"}
            disabled={added || loading}
            onClick={addToVocab}
            className="w-full"
          >
            {added ? (
              <><Check className="w-3.5 h-3.5 mr-1.5" /> In your vocabulary</>
            ) : (
              <><Plus className="w-3.5 h-3.5 mr-1.5" /> Add to my vocabulary</>
            )}
          </Button>

          {added && (
            <p className="text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
              <BookOpen className="w-3 h-3" /> Review it in My Vocabulary
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
