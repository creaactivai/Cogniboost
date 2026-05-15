/**
 * Rubric summary card — shown to students on Speaking & Writing assignment
 * pages so they know HOW they will be graded BEFORE they submit.
 *
 * Mirrors the rubrics defined server-side in:
 *   server/grading/writingPrompt.ts  (Writing Rubric v2.0)
 *   server/grading/speakingPrompt.ts (Speaking Rubric v2.0)
 *
 * Per-level descriptors are summarised here; the full per-band descriptors
 * stay on the backend (they shape AI grading). Students get the headline:
 * "five dimensions, 0-100, pass at 70, here are the four bands".
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

type RubricType = "speaking" | "writing";
type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface DimensionDef {
  name: string;
  description: string;
}

const SPEAKING_DIMENSIONS: DimensionDef[] = [
  {
    name: "Task Achievement & Module Application",
    description: "Did you address the prompt and use the module's target vocabulary, grammar, and expressions?",
  },
  {
    name: "Fluency & Coherence",
    description: "Smooth pace, natural pauses, ideas connected with linkers.",
  },
  {
    name: "Pronunciation & Intelligibility",
    description: "Can a native English listener understand you easily?",
  },
  {
    name: "Lexical Range",
    description: "Variety and precision of vocabulary for your level.",
  },
  {
    name: "Grammatical Range & Accuracy",
    description: "Grammar structures appropriate to your level, used correctly.",
  },
];

const WRITING_DIMENSIONS: DimensionDef[] = [
  {
    name: "Task Achievement",
    description: "Did you address every part of the prompt and meet the word count?",
  },
  {
    name: "Coherence & Cohesion",
    description: "Paragraph structure, logical flow, connectors used appropriately.",
  },
  {
    name: "Lexical Range",
    description: "Variety and precision of vocabulary for your level.",
  },
  {
    name: "Grammatical Range & Accuracy",
    description: "Grammar structures appropriate to your level, used correctly.",
  },
  {
    name: "Register & Tone",
    description: "Formality appropriate to the audience and purpose.",
  },
];

const BANDS = [
  { label: "Distinguished", range: "18-20 per dimension", description: "Performance approaches the upper boundary of the level.", color: "#10B981" },
  { label: "Proficient", range: "14-17 per dimension", description: "Substantially meets the criteria. Pass threshold.", color: "#33CBFB" },
  { label: "Developing", range: "10-13 per dimension", description: "Uneven; some features present, but with noticeable errors.", color: "#F59E0B" },
  { label: "Emerging", range: "0-9 per dimension", description: "Below target level; significant gaps.", color: "#EF4444" },
];

interface RubricSummaryProps {
  type: RubricType;
  level: Level;
}

export function RubricSummary({ type, level }: RubricSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const dimensions = type === "speaking" ? SPEAKING_DIMENSIONS : WRITING_DIMENSIONS;
  const icon = type === "speaking" ? "🎙️" : "✍️";
  const label = type === "speaking" ? "Speaking" : "Writing";

  return (
    <Card className="p-5 space-y-3 border-l-4" style={{ borderLeftColor: type === "speaking" ? "#9333EA" : "#0EA5E9" }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="font-semibold text-sm">
            How you'll be graded — {label} Rubric ({level})
          </h3>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)} data-testid="button-toggle-rubric">
          {expanded ? <><ChevronUp className="w-4 h-4 mr-1" /> Less</> : <><ChevronDown className="w-4 h-4 mr-1" /> Details</>}
        </Button>
      </div>

      {/* Quick summary — always visible */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="outline">5 dimensions × 20 pts</Badge>
        <Badge variant="outline">Total: 0-100</Badge>
        <Badge variant="default" style={{ backgroundColor: "#33CBFB" }}>Pass at 70</Badge>
      </div>

      {/* Dimensions — always visible */}
      <div className="space-y-1.5 pt-2">
        {dimensions.map((d, i) => (
          <div key={d.name} className="flex items-start gap-2 text-sm">
            <span className="font-mono text-xs text-muted-foreground mt-0.5 min-w-[20px]">{i + 1}.</span>
            <div className="flex-1">
              <span className="font-medium">{d.name}</span>
              <span className="text-xs text-muted-foreground"> · 0-20</span>
              {expanded && (
                <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bands — only when expanded */}
      {expanded && (
        <>
          <div className="pt-3 border-t">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Score bands per dimension</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {BANDS.map((b) => (
                <div key={b.label} className="flex items-start gap-2 p-2 rounded border bg-muted/30">
                  <div className="w-1 self-stretch rounded-full mt-0.5" style={{ backgroundColor: b.color }} />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-sm">{b.label}</span>
                      <span className="text-xs text-muted-foreground">{b.range}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> A score of 70 or above (Proficient on average) is a pass.
            Below 70, you'll get feedback to improve and can submit a revised version.
            Your teacher reviews every AI grade and can adjust it.
          </div>
        </>
      )}
    </Card>
  );
}
