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
 * Per-level rubrics — implements the CogniBoost Writing Assessment Rubric
 * v2.0 (May 2026), source document "CogniMight_Writing_Rubric.docx" (the
 * rubric is shared across both CogniMight kids and CogniBoost adult ESL).
 *
 * Each rubric maps the 0-20 scale to four qualitative bands:
 *   Distinguished (18-20) · Proficient (14-17) · Developing (10-13) · Emerging (0-9)
 *
 * The descriptors below define performance at the *Proficient* band for the
 * target level. Distinguished is "Proficient + features approaching the
 * upper boundary of the level"; Developing is "uneven, some features
 * present, errors noticeable"; Emerging is "performance reflects skills
 * at a band below the target".
 *
 * Pass threshold: 70/100 (Proficient or above on the composite). Below 70
 * triggers resubmission feedback, not failure.
 *
 * Expected output length and word-count tolerance per level:
 *   A1: 40-80 words   · minimum 40 enforced, no upper-cap penalty
 *   A2: 80-150 words  · ±20% tolerance
 *   B1: 180-250 words · ±10% tolerance
 *   B2: 250-350 words · ±10% tolerance
 *   C1: 350-500 words · ±5%  tolerance ("Word-count adherence is precise")
 */

/** Per-level expected word count range and tolerance, exposed so callers
 *  (e.g. UI / autosave / completion gates) can use the same numbers. */
export const WORD_COUNT_SPEC: Record<CefrLevel, { min: number; max: number; tolerancePct: number }> = {
  A1: { min: 40,  max: 80,  tolerancePct: 0 },   // minimum enforced, no upper cap
  A2: { min: 80,  max: 150, tolerancePct: 20 },
  B1: { min: 180, max: 250, tolerancePct: 10 },
  B2: { min: 250, max: 350, tolerancePct: 10 },
  C1: { min: 350, max: 500, tolerancePct: 5 },
  C2: { min: 500, max: 800, tolerancePct: 5 },   // legacy; CogniBoost only offers up to C1
};

const RUBRICS_BY_LEVEL: Record<CefrLevel, string> = {
  A1: `RUBRIC FOR A1 — Beginner
Expected output: 40-80 words. Below 40 words is under-length; above 80 is fine. Sentence-level writing in response to simple, familiar prompts.

Band labels apply to every dimension below:
  Distinguished (18-20) · Proficient (14-17) · Developing (10-13) · Emerging (0-9)

Task Achievement (0-20) — Proficient descriptor (14-17):
"Provides a relevant response of at least the minimum length using simple sentences. Required information elements are present, even if expressed minimally. Off-topic content is rare."
- 18-20 Distinguished: Meets all of Proficient plus elaboration beyond minimum; every required element is clearly present.
- 10-13 Developing: Some required elements missing or word count below minimum.
- 0-9 Emerging: Off-topic or most elements missing.

Coherence & Cohesion (0-20) — Proficient descriptor:
"Sentences are intelligible in isolation. Basic linking with 'and', 'but', and 'then' is sufficient; absence of more complex cohesion is not penalised."
- 18-20: Sentences are intelligible and lightly linked with 'and'/'but'/'then'.
- 10-13: Sentences are unclear in isolation, or linking absent where needed.
- 0-9: Disorganised, sentences not intelligible.

Lexical Range (0-20) — Proficient descriptor:
"Uses high-frequency vocabulary for familiar topics (family, work, places, daily routines). Repetition is expected and not penalised provided meaning is clear."
- 18-20: High-frequency vocabulary accurately applied; meaning fully clear.
- 10-13: Vocabulary too limited even for A1 topics, or meaning sometimes unclear.
- 0-9: Vocabulary below A1.

Grammatical Range & Accuracy (0-20) — Proficient descriptor:
"Uses present simple, the verb 'to be', basic articles, and simple subject-verb-object structures. Frequent errors are expected; the criterion is whether the meaning is recoverable."
- 18-20: A1 structures (present simple, to be, articles, SVO) recoverable in meaning despite frequent errors.
- 10-13: A1 structures attempted but meaning often lost.
- 0-9: Below A1 structures; meaning blocked.

Register & Tone (0-20) — NOT ASSESSED AT A1.
- Award 20/20 by default. Only deduct if language is actively inappropriate (e.g. rude, offensive, or wildly inappropriate to the prompt's context).`,

  A2: `RUBRIC FOR A2 — Elementary
Expected output: 80-150 words (±20% tolerance: 64-180 acceptable). Connected sentences and short paragraphs on familiar topics.

Band labels apply to every dimension below:
  Distinguished (18-20) · Proficient (14-17) · Developing (10-13) · Emerging (0-9)

Task Achievement (0-20) — Proficient descriptor (14-17):
"Addresses the prompt with simple ideas. Word count is met within a tolerance of approximately twenty per cent. All required elements appear, although development may be limited."
- 18-20: All required elements present and developed beyond the minimum.
- 10-13: One required element missing, or word count outside the 20% tolerance.
- 0-9: Off-topic or most elements missing.

Coherence & Cohesion (0-20) — Proficient descriptor:
"Uses basic connectors such as 'and', 'but', 'because', 'so', 'then', 'first', and 'after that'. Ideas follow a recognisable order."
- 18-20: Good range of basic connectors; ideas clearly sequenced.
- 10-13: Few connectors; order unclear in places.
- 0-9: No sequence; ideas isolated.

Lexical Range (0-20) — Proficient descriptor:
"Vocabulary covers familiar topics (work, family, free time, basic descriptions). Some simple collocations appear. Errors do not prevent understanding."
- 18-20: Good A2 vocabulary range with some collocations; minor lexical errors.
- 10-13: Vocabulary too limited for A2 prompts; errors interfere occasionally.
- 0-9: A1-level vocabulary or below.

Grammatical Range & Accuracy (0-20) — Proficient descriptor:
"Demonstrates control of past simple, future with 'going to', comparatives, basic modals (can, should), and possessives. Errors are common but do not block meaning."
- 18-20: Several A2 structures used with control; errors do not block meaning.
- 10-13: A2 structures attempted but errors sometimes block meaning.
- 0-9: A1 structures only, or meaning blocked.

Register & Tone (0-20) — Proficient descriptor:
"Shows basic awareness of the formal-informal distinction (e.g., 'Hi' versus 'Dear'). Consistency within the chosen register is rewarded."
- 18-20: Register chosen and held consistently.
- 10-13: Register chosen but inconsistent.
- 0-9: Inappropriate or absent register awareness.`,

  B1: `RUBRIC FOR B1 — Intermediate
Expected output: 180-250 words (±10% tolerance: 162-275 acceptable). Multi-paragraph response with a clear position and supporting reasoning.

Band labels apply to every dimension below:
  Distinguished (18-20) · Proficient (14-17) · Developing (10-13) · Emerging (0-9)

Task Achievement (0-20) — Proficient descriptor (14-17):
"Provides a clear response to the prompt with reasoning. Position is identifiable and supported by at least two relevant points. Word count is met within ten per cent."
- 18-20: Clear position supported by three or more relevant points; word count met.
- 10-13: Position unclear, support thin (one point or hand-waving), or word count outside ±10%.
- 0-9: No clear position; off-topic.

Coherence & Cohesion (0-20) — Proficient descriptor:
"Organises the response into recognisable paragraphs with a logical sequence. Uses a range of connectors including 'however', 'on the other hand', 'furthermore', and 'for example'. Referencing devices are used with reasonable accuracy."
- 18-20: Clear paragraphs; varied connectors; accurate referencing.
- 10-13: Paragraph boundaries unclear; connectors limited or misused.
- 0-9: Disorganised; no paragraph structure.

Lexical Range (0-20) — Proficient descriptor:
"Demonstrates a sound range for familiar and some less familiar topics. Uses some collocations and topic-specific vocabulary. Word choice is generally appropriate, with occasional lapses."
- 18-20: Wide range; topic-specific vocabulary; appropriate collocations.
- 10-13: A2-level range bleeding into B1; lapses noticeable.
- 0-9: A2 vocabulary or below.

Grammatical Range & Accuracy (0-20) — Proficient descriptor:
"Uses present perfect, past continuous, first and second conditionals, reported speech, and passive voice with reasonable accuracy. Errors in complex structures do not impede communication."
- 18-20: Several B1 structures used with control; complex-structure errors are rare.
- 10-13: B1 structures attempted but errors interfere; range narrow.
- 0-9: A2 structures only; meaning blocked.

Register & Tone (0-20) — Proficient descriptor:
"Distinguishes formal and informal registers and maintains the chosen register with reasonable consistency. Shows awareness of the target audience."
- 18-20: Register chosen, held consistently, and audience-aware.
- 10-13: Register wavers; audience awareness limited.
- 0-9: Inappropriate register throughout.`,

  B2: `RUBRIC FOR B2 — Upper-Intermediate
Expected output: 250-350 words (±10% tolerance: 225-385 acceptable). Developed argument or analysis with nuanced positions.

Band labels apply to every dimension below:
  Distinguished (18-20) · Proficient (14-17) · Developing (10-13) · Emerging (0-9)

Task Achievement (0-20) — Proficient descriptor (14-17):
"Offers a nuanced response with developed arguments and supporting evidence or examples. Word-count adherence is strong. The response engages with complexity rather than asserting a simple position."
- 18-20: Sophisticated, well-evidenced argument; word count well-controlled.
- 10-13: Simple position only; arguments under-developed; word count outside ±10%.
- 0-9: Off-topic or no real argument.

Coherence & Cohesion (0-20) — Proficient descriptor:
"Displays sophisticated paragraph structure with clear topic sentences. Uses cleft sentences, advanced connectors ('notwithstanding', 'consequently', 'in light of'), and a variety of referencing devices."
- 18-20: Topic sentences, advanced connectors, varied referencing.
- 10-13: Adequate cohesion but B1-level; lacks B2 sophistication.
- 0-9: Basic cohesion only.

Lexical Range (0-20) — Proficient descriptor:
"Wide vocabulary including idioms, phrasal verbs, and register-appropriate choices. Demonstrates awareness of connotation. Repetition is rare."
- 18-20: Idioms + phrasal verbs + connotation awareness; minimal repetition.
- 10-13: B1-level vocabulary with B2 reach; connotation occasionally off.
- 0-9: Below B2.

Grammatical Range & Accuracy (0-20) — Proficient descriptor:
"Controls third conditional, mixed conditionals, inversion, advanced passive constructions, and gerund / infinitive patterns. Errors are infrequent and tend to involve subtle features."
- 18-20: Confident control of B2 structures; rare, subtle errors.
- 10-13: B2 structures attempted but error-prone; range limited.
- 0-9: B1 structures only.

Register & Tone (0-20) — Proficient descriptor:
"Strong register control. Adapts tone to purpose and audience and sustains stylistic consistency across the response."
- 18-20: Tone adapted to purpose; stylistically consistent throughout.
- 10-13: Some adaptation but inconsistencies impact impression.
- 0-9: Register inappropriate or absent.`,

  C1: `RUBRIC FOR C1 — Advanced
Expected output: 350-500 words (±5% tolerance: 332-525 acceptable). "Word-count adherence is precise." Sophisticated, original treatment of a complex topic.

Band labels apply to every dimension below:
  Distinguished (18-20) · Proficient (14-17) · Developing (10-13) · Emerging (0-9)

Task Achievement (0-20) — Proficient descriptor (14-17):
"Provides a sophisticated and original treatment of the topic. Position is nuanced, evidence is well selected, and counter-arguments are acknowledged. Word-count adherence is precise."
- 18-20: Original, nuanced argument with counter-arguments addressed; precise length.
- 10-13: Strong B2 response; lacks C1 originality or counter-argument engagement.
- 0-9: Below B2.

Coherence & Cohesion (0-20) — Proficient descriptor:
"Achieves elegant flow through a wide repertoire of cohesive devices, including ellipsis, fronting, end-weighting, and varied sentence openings. Paragraph structure supports rhetorical aim."
- 18-20: Elegant flow with cleft/fronting/ellipsis serving rhetorical aim.
- 10-13: B2-level cohesion; lacks C1 elegance.
- 0-9: Below B2.

Lexical Range (0-20) — Proficient descriptor:
"Near-native lexical range, including subtle near-synonyms and awareness of connotation. Idioms and collocations are used naturally rather than ornamentally."
- 18-20: Near-native range; idioms used naturally, not decoratively.
- 10-13: B2-level range; lacks C1 nuance.
- 0-9: Below B2.

Grammatical Range & Accuracy (0-20) — Proficient descriptor:
"Uses the subjunctive, advanced cleft constructions, hedging, complex noun phrases, and nominalisation with high accuracy. Errors are rare and usually stylistic."
- 18-20: Subjunctive + cleft + hedging + nominalisation used accurately and purposefully.
- 10-13: B2 structures; C1 features absent.
- 0-9: Below B2.

Register & Tone (0-20) — Proficient descriptor:
"Switches register effortlessly to match purpose and audience. The writer's style and voice are recognisable; the response feels intentional rather than merely correct."
- 18-20: Voice recognisable; register switches feel intentional.
- 10-13: Register controlled but voice not yet recognisable.
- 0-9: Below B2.`,

  C2: `RUBRIC FOR C2 — Mastery (LEGACY)

NOTE: CogniBoost officially offers proficiency assessment up to C1 only.
This rubric is retained for compatibility with historical data and edge
cases where a submission demonstrably exceeds C1.

Expected output: 500+ words. Native-like, expert treatment.

Band labels apply to every dimension below:
  Distinguished (18-20) · Proficient (14-17) · Developing (10-13) · Emerging (0-9)

All dimensions follow the C1 rubric, with Distinguished requiring native-like execution: expert vocabulary, full range of grammatical structures used as stylistic choices, effortless register switching, and distinctive authorial voice.`,
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

const SYSTEM_PROMPT = `You are a CEFR-certified ESL examiner at CogniBoost ESL Academy, specialising in adult Spanish-speaking learners. You grade student writing strictly against the CogniBoost Writing Assessment Rubric (v2.0, May 2026), an analytic rubric with five equally-weighted dimensions and the four bands Distinguished / Proficient / Developing / Emerging. You return only structured JSON. Your feedback is specific, constructive, and pedagogically actionable.

You follow the institutional anti-patterns at all times:
1. Do NOT penalise the same error twice across different dimensions. A missing connector is a Coherence issue, NOT also a Grammar issue.
2. Do NOT apply the rubric of a higher level to a lower-level student. A B1 student is NOT penalised for the absence of C1 features.
3. CELEBRATE writing ABOVE the target level — never tell a student to "use simpler structures" or "lower the complexity." If an A1 student uses B1+ grammar (e.g. present perfect, conditionals, passive voice) and it is used correctly, this is a STRENGTH worth congratulating in the strengths array, and the dimension score should reflect Distinguished (18-20). Above-level use that is accurate must NEVER appear as an improvement priority or inline annotation. If above-level structures are present but used incorrectly, note them in spanish_speaker_patterns_noticed as an over-reach, not as a structure to avoid. If the writing consistently demonstrates above-level performance, set estimated_cefr_for_this_writing to that higher level and add a strength like: "You are writing above your target level — consider asking your teacher about moving up." NEVER suggest the student dumb down their writing.
4. Do NOT allow overall communicative effort to override an analytic dimension. The rubric is analytic; each dimension is scored independently.
5. Score each dimension independently — do not anchor later scores to the first one assigned.
6. Limit inline annotations to the SIX most pedagogically valuable observations. Over-annotation is demoralising and reduces the salience of the most important points.
7. Provide AT LEAST 2 specific strengths and EXACTLY 3 actionable improvement priorities.
8. Quote exact verbatim text in inline annotations so the student can locate the issue in their own writing.

Pass threshold for institutional record: composite score of 70/100 (Proficient or above). Sub-70 returns feedback for resubmission, not failure.`;

function buildUserPrompt(input: GradeWritingInput): string {
  const { targetLevel, currentWeek, assignment, writingPrompt, studentText } = input;
  const rubric = RUBRICS_BY_LEVEL[targetLevel];
  const wordSpec = WORD_COUNT_SPEC[targetLevel];
  const actualWordCount = studentText.trim().split(/\s+/).filter(Boolean).length;

  return `Grade the following student writing.

STUDENT CONTEXT:
- Target level: ${targetLevel}
${currentWeek !== undefined ? `- Current week: ${currentWeek}` : ''}
- Assignment: ${assignment}
- Native language: Spanish
- Expected word count: ${wordSpec.min}-${wordSpec.max} words${wordSpec.tolerancePct > 0 ? ` (±${wordSpec.tolerancePct}% tolerance)` : ' (minimum enforced; no upper-cap penalty)'}
- Actual word count in submission: ${actualWordCount} words

WRITING PROMPT WAS:
"${writingPrompt}"

STUDENT'S SUBMISSION:
${studentText}

${rubric}

OUTPUT REQUIRED (JSON, no additional text):
{
  "overall_score": <0-100, sum of the five dimensions>,
  "level_assessment": "<A1|A2|B1|B2|C1|C2 — what this writing actually demonstrates>",
  "dimensions": {
    "task_achievement":   {"score": <0-20>, "feedback": "<specific, level-appropriate, references the prompt and word count>"},
    "coherence_cohesion": {"score": <0-20>, "feedback": "<specific, names connectors and paragraph structure issues>"},
    "lexical_range":      {"score": <0-20>, "feedback": "<specific, gives concrete substitutions where useful>"},
    "grammatical_range":  {"score": <0-20>, "feedback": "<specific, references the level-expected structures>"},
    "register_tone":      {"score": <0-20>, "feedback": "<specific, references audience and purpose>"}
  },
  "inline_annotations": [
    {
      "text_segment": "<exact verbatim phrase from the submission>",
      "issue_type": "<grammar|vocab|punctuation|register|spelling>",
      "explanation": "<why this is wrong, in plain pedagogical language>",
      "suggestion": "<corrected version>",
      "severity": "<minor|moderate|major>"
    }
  ],
  "strengths": ["<specific positive 1>", "<specific positive 2>"],
  "improvement_priorities": [
    "<actionable item 1, specific to this submission>",
    "<actionable item 2>",
    "<actionable item 3>"
  ],
  "vocabulary_used_correctly": ["<word1>", "<word2>"],
  "vocabulary_misused": [{"word": "<>", "issue": "<>"}],
  "estimated_cefr_for_this_writing": "<level>",
  "spanish_speaker_patterns_noticed": [
    "<L1 interference pattern observed, if any (false friends, missing articles, preposition errors, calques from Spanish syntax)>"
  ]
}

SCORING REMINDERS:
- overall_score MUST equal the sum of the five dimension scores (max 100).
- Apply the anti-patterns from the system prompt: no double-penalty across dimensions, no higher-level rubric, no holistic override of an analytic dimension.
- ABOVE-LEVEL WRITING IS A WIN, NOT A PROBLEM. If the student uses structures above ${targetLevel} (e.g. an A1 using present perfect, conditionals, or passive voice) and the use is accurate, this is Distinguished performance — score 18-20 on Grammatical Range, list it in strengths ("You used [structure name] correctly — that is already at [level above target] level"), and consider raising estimated_cefr_for_this_writing. NEVER write feedback that asks the student to "use simpler structures", "stay at their level", or "stick to [target level] grammar". NEVER make above-level use an improvement_priority. If the over-reach is INCORRECT, frame it as "great that you tried [structure]; here is how it works" — never as "don't use it yet".
- Limit inline_annotations to AT MOST 6 entries — pick the most pedagogically valuable, not the most numerous.
- Provide AT LEAST 2 strengths and EXACTLY 3 improvement_priorities.
- Quote exact verbatim text in inline_annotations text_segment so the student can locate it.
- For A1 writing, Register & Tone defaults to 20/20 unless inappropriate language is present.
- For word-count: under-length is a Task Achievement issue. Over-length only penalises Task Achievement at B1+ and only if it exceeds the tolerance.
- For Spanish-speaker errors (calques, false friends, preposition transfer, missing articles before abstract nouns), note them under spanish_speaker_patterns_noticed.
- Feedback must be specific. "Improve vocabulary" is unacceptable. "Replace high-frequency conversational verbs like 'get' with formal academic verbs such as 'obtain' or 'receive' in argumentative writing" is acceptable.`;
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
  // Adaptive thinking removed 2026-05-15 — see speakingPrompt.ts for full
  // rationale. tldr: on short inputs Claude can spend its budget thinking
  // and return only a `thinking` block (no `text` block), making
  // extractTextContent throw. Grading is structured-output; no need for
  // extended thinking.
  const stream = client.messages.stream({
    model: ANTHROPIC_MODELS.grading,
    max_tokens: 8192,
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
