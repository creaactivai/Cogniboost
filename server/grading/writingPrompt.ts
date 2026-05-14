/**
 * Writing-grading prompt builder.
 *
 * Implements Master Plan v2.0 §4 (AI-Graded Writing System) + §18 Appendix A
 * (writing grading prompt) + §19 Appendix B (CEFR rubrics).
 *
 * Five dimensions, 20 points each, total 100:
 *   1. Task Achievement
 *   2. Coherence & Cohesion
 *   3. Lexical Range
 *   4. Grammatical Range & Accuracy
 *   5. Register & Tone
 *
 * Output is strictly-typed JSON per §4.3.
 */

import type Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_MODELS, extractTextContent, getAnthropicClient, parseJsonFromResponse } from '../anthropicClient';

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/**
 * Per-level rubrics from Master Plan §19 Appendix B.
 * Each band-descriptor table maps a 0-20 score range to qualitative criteria.
 */
const RUBRICS_BY_LEVEL: Record<CefrLevel, string> = {
  A1: `RUBRIC FOR A1 LEVEL:

Task Achievement (0-20):
- 18-20: Answered in any form, word count flexible. Communicated basic meaning.
- 14-17: Mostly addressed prompt with simple ideas.
- 10-13: Partial response, missing some required elements.
- 0-9: Off-topic or major elements missing.

Coherence & Cohesion (0-20):
- 18-20: Sentences are intelligible even if not formally connected.
- 14-17: Sentences mostly understandable, occasional jumps.
- 10-13: Limited cohesion, ideas disconnected.
- 0-9: Disorganized.

Lexical Range (0-20):
- 18-20: Basic high-frequency words used appropriately (family, work, places, daily routines).
- 14-17: Adequate range for the level with minor inaccuracies.
- 10-13: Very limited vocabulary, frequent repetition.
- 0-9: Below A1 level vocabulary.

Grammatical Range & Accuracy (0-20):
- 18-20: Present simple, basic verb forms, simple sentences. Errors common but communication possible.
- 14-17: Several A1 structures used with frequent errors that don't block meaning.
- 10-13: Limited range, errors sometimes block meaning.
- 0-9: Below A1 structures or errors that block all meaning.

Register & Tone (0-20):
- 0-20: NOT ASSESSED AT A1. Award a default 16/20 unless register issues actively impede communication.`,

  A2: `RUBRIC FOR A2 LEVEL:

Task Achievement (0-20):
- 18-20: Fully addressed prompt with simple ideas. Word count within 20%.
- 14-17: Mostly addressed prompt with minor gaps.
- 10-13: Partially addressed prompt, missing one required element.
- 0-9: Off-topic or major elements missing.

Coherence & Cohesion (0-20):
- 18-20: Uses basic connectors (and, but, because, then) appropriately. Clear sequence.
- 14-17: Some connectors used, occasional jumps.
- 10-13: Limited use of connectors, structure unclear in places.
- 0-9: Disorganized, no clear structure.

Lexical Range (0-20):
- 18-20: Vocabulary for familiar topics (work, family, free time, basic descriptions).
- 14-17: Adequate A2 vocabulary, mostly accurate.
- 10-13: Limited vocabulary, some inaccuracies, repetition.
- 0-9: A1 vocabulary or below.

Grammatical Range & Accuracy (0-20):
- 18-20: Past simple, future with 'going to', comparatives, basic modals (can, should). High accuracy.
- 14-17: Several A2 structures used, mostly accurate.
- 10-13: Limited range, frequent errors that don't block meaning.
- 0-9: A1 structures or errors block meaning.

Register & Tone (0-20):
- 18-20: Basic awareness of formal/informal (Hi vs Dear), appropriate to audience.
- 14-17: Mostly appropriate register, minor inconsistencies.
- 10-13: Register issues, tone wavers.
- 0-9: Inappropriate register throughout.`,

  B1: `RUBRIC FOR B1 LEVEL:

Task Achievement (0-20):
- 18-20: Fully addresses prompt with clear reasoning. Meets word count. All required elements present.
- 14-17: Addresses prompt with minor gaps, mostly meets word count.
- 10-13: Partially addresses prompt, missing one required element.
- 0-9: Off-topic or major elements missing.

Coherence & Cohesion (0-20):
- 18-20: Clear paragraph structure, uses connectors (however, on the other hand, furthermore), logical flow.
- 14-17: Reasonable structure, uses some connectors, occasional jumps.
- 10-13: Limited use of connectors, structure unclear in places.
- 0-9: Disorganized, no clear structure.

Lexical Range (0-20):
- 18-20: Good range for familiar AND some unfamiliar topics. Uses collocations.
- 14-17: Solid B1 vocabulary range, mostly accurate.
- 10-13: Limited vocabulary, some inaccuracies, repetition.
- 0-9: A2 vocabulary or below, frequent errors.

Grammatical Range & Accuracy (0-20):
- 18-20: Variety of B1 structures (present perfect, past continuous, 1st & 2nd conditionals, reported speech, passive voice), high accuracy.
- 14-17: Several B1 structures used, mostly accurate.
- 10-13: Limited range, frequent errors that don't block meaning.
- 0-9: A2 structures or below, errors block meaning.

Register & Tone (0-20):
- 18-20: Distinguishes formal and informal. Audience awareness.
- 14-17: Mostly appropriate register, minor inconsistencies.
- 10-13: Register issues, tone wavers.
- 0-9: Inappropriate register throughout.`,

  B2: `RUBRIC FOR B2 LEVEL:

Task Achievement (0-20):
- 18-20: Nuanced response with developed arguments. Strong word count adherence. All required elements covered with sophistication.
- 14-17: Addresses prompt with minor gaps in development.
- 10-13: Partial response, arguments under-developed.
- 0-9: Off-topic or major elements missing.

Coherence & Cohesion (0-20):
- 18-20: Sophisticated paragraph structure, cleft sentences, advanced connectors (nevertheless, consequently, in light of).
- 14-17: Strong structure, good use of connectors with occasional missteps.
- 10-13: Adequate but not sophisticated cohesion.
- 0-9: Basic-level cohesion only.

Lexical Range (0-20):
- 18-20: Wide range including idioms, phrasal verbs, register-appropriate choices.
- 14-17: Good range with occasional imprecision.
- 10-13: Adequate B1-level range, lacks B2 sophistication.
- 0-9: Below B2 vocabulary.

Grammatical Range & Accuracy (0-20):
- 18-20: Third conditional, mixed conditionals, inversion, advanced passive, gerund/infinitive patterns. Errors rare.
- 14-17: Several B2 structures used with occasional errors.
- 10-13: Limited B2 range, errors of B2 structures common.
- 0-9: B1 structures or below.

Register & Tone (0-20):
- 18-20: Strong register control. Adapts tone to purpose.
- 14-17: Mostly appropriate, minor inconsistencies.
- 10-13: Register issues affect impact.
- 0-9: Inappropriate register throughout.`,

  C1: `RUBRIC FOR C1 LEVEL:

Task Achievement (0-20):
- 18-20: Sophisticated, original treatment of topic. Word count is precise. All elements covered with insight.
- 14-17: Strong response with minor gaps in originality or development.
- 10-13: Adequate but not insightful.
- 0-9: Off-topic or under-developed.

Coherence & Cohesion (0-20):
- 18-20: Elegant flow with cohesive devices, ellipsis, fronting, end-weighting. Reader is guided effortlessly.
- 14-17: Strong structure with occasional clunky transitions.
- 10-13: B2-level cohesion, lacks C1 elegance.
- 0-9: Below B2.

Lexical Range (0-20):
- 18-20: Near-native vocabulary including subtle near-synonyms with connotation awareness.
- 14-17: Wide range with occasional imprecision in connotation.
- 10-13: B2-level range, lacks C1 nuance.
- 0-9: Below B2.

Grammatical Range & Accuracy (0-20):
- 18-20: Subjunctive, advanced cleft, hedging, complex noun phrases, nominalization. Errors are rare and slip-like.
- 14-17: Several C1 structures used with occasional errors.
- 10-13: B2 range, lacks C1 structures.
- 0-9: Below B2.

Register & Tone (0-20):
- 18-20: Effortless register switching. Style and voice come through.
- 14-17: Strong register control with occasional missteps.
- 10-13: B2-level register control, lacks C1 fluidity.
- 0-9: Below B2.`,

  C2: `RUBRIC FOR C2 LEVEL:

Task Achievement (0-20):
- 18-20: Native-like, expert treatment of topic. Word count is precise. Argument is sophisticated, insightful, and original.
- 14-17: Strong with minor gaps in sophistication.
- 10-13: C1-level response, lacks C2 expertise.
- 0-9: Below C1.

Coherence & Cohesion (0-20):
- 18-20: Native-like fluency. Cohesive devices fully integrated, never visible. Reader experiences flow.
- 14-17: Excellent with occasional visible mechanics.
- 10-13: C1 level.
- 0-9: Below C1.

Lexical Range (0-20):
- 18-20: Native-like vocabulary with full register awareness, including specialized terminology where appropriate.
- 14-17: Excellent range with rare imprecision.
- 10-13: C1 range.
- 0-9: Below C1.

Grammatical Range & Accuracy (0-20):
- 18-20: Full range of English grammar with native-like accuracy. Stylistic choices, not constraints.
- 14-17: C1 with rare errors.
- 10-13: C1 range.
- 0-9: Below C1.

Register & Tone (0-20):
- 18-20: Native-like register switching. Distinctive voice. Stylistic mastery.
- 14-17: C1+ with rare missteps.
- 10-13: C1 level.
- 0-9: Below C1.`,
};

/**
 * Per-dimension feedback object. Mirrors §4.3 of the Master Plan.
 */
export interface DimensionScore {
  score: number;
  feedback: string;
}

export interface InlineAnnotation {
  text_segment: string;
  issue_type: 'grammar' | 'vocab' | 'punctuation' | 'register' | 'spelling';
  explanation: string;
  suggestion: string;
  severity: 'minor' | 'moderate' | 'major';
}

export interface VocabularyMisuse {
  word: string;
  issue: string;
}

export interface WritingGradeResponse {
  overall_score: number;
  level_assessment: CefrLevel;
  dimensions: {
    task_achievement: DimensionScore;
    coherence_cohesion: DimensionScore;
    lexical_range: DimensionScore;
    grammatical_range: DimensionScore;
    register_tone: DimensionScore;
  };
  inline_annotations: InlineAnnotation[];
  strengths: string[];
  improvement_priorities: string[];
  vocabulary_used_correctly: string[];
  vocabulary_misused: VocabularyMisuse[];
  estimated_cefr_for_this_writing: CefrLevel;
  spanish_speaker_patterns_noticed: string[];
}

export interface GradeWritingInput {
  /** Student's target CEFR level (drives the rubric used). */
  targetLevel: CefrLevel;
  /** Curriculum week, optional context for the model. */
  currentWeek?: number;
  /** The full assignment description (what they were asked to write). */
  assignment: string;
  /** Specific prompt text shown to the student. */
  writingPrompt: string;
  /** The student's actual submission. */
  studentText: string;
}

const SYSTEM_PROMPT = `You are a CEFR-certified ESL examiner specializing in adult Spanish-speaking learners. You grade student writing against strict CEFR rubrics. You return only structured JSON. You are constructive, specific, and pedagogically helpful in your feedback.`;

function buildUserPrompt(input: GradeWritingInput): string {
  const { targetLevel, currentWeek, assignment, writingPrompt, studentText } = input;
  const rubric = RUBRICS_BY_LEVEL[targetLevel];

  return `Grade the following student writing.

STUDENT CONTEXT:
- Target level: ${targetLevel}
${currentWeek !== undefined ? `- Current week: ${currentWeek}` : ''}
- Assignment: ${assignment}
- Native language: Spanish

WRITING PROMPT WAS:
"${writingPrompt}"

STUDENT'S SUBMISSION:
${studentText}

${rubric}

OUTPUT REQUIRED (JSON, no additional text):
{
  "overall_score": <0-100>,
  "level_assessment": "<A1|A2|B1|B2|C1|C2>",
  "dimensions": {
    "task_achievement":  {"score": <0-20>, "feedback": "<specific>"},
    "coherence_cohesion": {"score": <0-20>, "feedback": "<specific>"},
    "lexical_range":     {"score": <0-20>, "feedback": "<specific>"},
    "grammatical_range": {"score": <0-20>, "feedback": "<specific>"},
    "register_tone":     {"score": <0-20>, "feedback": "<specific>"}
  },
  "inline_annotations": [
    {
      "text_segment": "<exact problematic phrase>",
      "issue_type": "<grammar|vocab|punctuation|register|spelling>",
      "explanation": "<why this is wrong>",
      "suggestion": "<corrected version>",
      "severity": "<minor|moderate|major>"
    }
  ],
  "strengths": ["<specific positive 1>", "<specific positive 2>"],
  "improvement_priorities": [
    "<actionable item 1>",
    "<actionable item 2>",
    "<actionable item 3>"
  ],
  "vocabulary_used_correctly": ["<word1>", "<word2>"],
  "vocabulary_misused": [{"word": "<>", "issue": "<>"}],
  "estimated_cefr_for_this_writing": "<level>",
  "spanish_speaker_patterns_noticed": [
    "<L1 interference pattern observed, if any>"
  ]
}

IMPORTANT:
- Be specific. "Improve vocabulary" is useless. "Replace 'good' with 'effective' or 'productive' in formal contexts" is useful.
- Quote exact text in annotations — students need to find the error in their own writing.
- For Spanish-speaker errors, note common L1 interference (false friends, missing articles, preposition errors).
- Match feedback specificity to the level — don't over-correct B1 students with C1 expectations.
- overall_score = sum of the five dimension scores (max 100).`;
}

/**
 * Grade a single piece of writing against the level-specific rubric.
 *
 * - Uses adaptive thinking (the model decides how much to deliberate).
 * - Caches the system prompt + rubric (stable across many graders for the
 *   same level) so subsequent grades at the same level pay ~0.1× input cost.
 * - Returns structured JSON conforming to WritingGradeResponse.
 */
export async function gradeWriting(input: GradeWritingInput): Promise<{
  grade: WritingGradeResponse;
  rawResponse: Anthropic.Message;
}> {
  const client = getAnthropicClient();
  const userPrompt = buildUserPrompt(input);

  // Stream the response to avoid SDK request timeouts. With adaptive thinking
  // + ~4K max_tokens, grading can take 30-90s — non-streaming requests hit
  // the SDK's HTTP timeout and surface as opaque "Connection error" failures.
  // .finalMessage() collects the full response after the stream completes;
  // the call signature is otherwise identical to .messages.create().
  // max_tokens 8192: covers adaptive-thinking + full structured JSON
  // (5 dimensions × ~150 words feedback + 5-10 annotations + strengths +
  // improvements + L1 patterns + vocabulary lists). Previous 4096 was too
  // tight and truncated the response mid-JSON, causing a parse failure.
  const stream = client.messages.stream({
    model: ANTHROPIC_MODELS.grading,
    max_tokens: 8192,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });
  const message = await stream.finalMessage();

  const text = extractTextContent(message);
  const grade = parseJsonFromResponse<WritingGradeResponse>(text);

  return { grade, rawResponse: message };
}
