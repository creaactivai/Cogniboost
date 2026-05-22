/**
 * Speaking-grading prompt builder.
 *
 * Implements the CogniBoost Speaking Rubric (v2.0, May 2026) — the
 * speaking-focused counterpart of writingPrompt.ts. The five analytic
 * dimensions are:
 *
 *   1. Task Achievement & Module Application
 *   2. Fluency & Coherence
 *   3. Pronunciation & Intelligibility
 *   4. Lexical Range
 *   5. Grammatical Range & Accuracy
 *
 * Total 0-100. Pass threshold 70 (Proficient or above).
 *
 * INPUT: a Whisper transcript (text) plus the Speaking Project context
 *        (target vocab, target grammar, target expressions, level,
 *        target duration). The grader evaluates pronunciation indirectly
 *        from transcription confidence + Spanish-speaker error patterns
 *        — full audio analysis is reserved for a Phase 2 enhancement.
 *
 * OUTPUT: strictly-typed JSON.
 */

import type Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_MODELS, extractTextContent, getAnthropicClient, parseJsonFromResponse } from '../anthropicClient';
import type { CefrLevel } from './writingPrompt';

/**
 * Expected words-per-minute by CEFR level — used to evaluate Fluency.
 * Source: ACTFL Oral Proficiency Guidelines, calibrated for L2 Spanish→English.
 */
export const SPEAKING_WPM_TARGETS: Record<CefrLevel, { min: number; max: number }> = {
  A1: { min: 50,  max: 80 },
  A2: { min: 70,  max: 100 },
  B1: { min: 90,  max: 120 },
  B2: { min: 110, max: 140 },
  C1: { min: 130, max: 160 },
  C2: { min: 150, max: 180 },
};

/** Per-level rubrics for speaking — the proficient-band descriptor per dimension. */
const SPEAKING_RUBRICS_BY_LEVEL: Record<CefrLevel, string> = {
  A1: `RUBRIC FOR A1 SPEAKING — Beginner
Expected length: ~60 seconds / 50-80 WPM. Sentence-level production on familiar prompts.

Band labels apply to every dimension below:
  Distinguished (18-20) · Proficient (14-17) · Developing (10-13) · Emerging (0-9)

Task Achievement & Module Application (0-20) — Proficient:
"Addresses the prompt with simple sentences. Uses AT LEAST 3 target vocabulary items from the module and demonstrates AT LEAST 1 target grammar structure. Off-topic content is rare."
- 18-20: Uses 6+ target words/expressions AND 2+ target grammar structures naturally.
- 10-13: Uses fewer than 3 target items, or off-topic in places.
- 0-9: Off-topic, or no target content used.

Fluency & Coherence (0-20) — Proficient:
"Speaks in short connected sentences. Pauses are natural; basic linking with 'and'/'but'/'then'. WPM within the A1 band (50-80)."
- 18-20: Smooth pace with natural pauses; ideas linked.
- 10-13: Many filled pauses ('um', 'eh'); ideas disconnected.
- 0-9: Cannot sustain speech; long silences.

Pronunciation & Intelligibility (0-20) — Proficient:
"A native English listener can understand the meaning with mild effort. Spanish-speaker patterns (b/v confusion, vowel substitution) are present but do not block comprehension."
- 18-20: Clear and easily understandable throughout.
- 10-13: Listener must work hard; some words unrecognisable.
- 0-9: Speech is largely unintelligible.

Lexical Range (0-20) — Proficient:
"Uses high-frequency vocabulary appropriate to the module topic. Some repetition is expected and not penalised. Meaning is always clear."
- 18-20: Wider range than required; precise word choice.
- 10-13: Vocabulary too limited even for A1 topics; meaning sometimes unclear.
- 0-9: Below A1 vocabulary.

Grammatical Range & Accuracy (0-20) — Proficient:
"Uses present simple, verb TO BE, basic articles, and simple S-V-O. Frequent errors are EXPECTED at A1; the criterion is whether the meaning is recoverable."
- 18-20: Several A1 structures used; meaning fully clear despite occasional errors.
- 10-13: A1 structures attempted but meaning often lost.
- 0-9: Below A1 structures; meaning blocked.`,

  A2: `RUBRIC FOR A2 SPEAKING — Elementary
Expected length: ~90-120 seconds / 70-100 WPM. Short paragraphs on familiar topics.

Band labels apply to every dimension below:
  Distinguished (18-20) · Proficient (14-17) · Developing (10-13) · Emerging (0-9)

Task Achievement & Module Application (0-20) — Proficient:
"Addresses the prompt with simple but developed ideas. Uses AT LEAST 4 target vocabulary items and 2 target grammar structures from the module."
- 18-20: Uses 7+ target items naturally, integrated across the response.
- 10-13: Fewer than 4 target items, or partial coverage of the prompt.
- 0-9: Off-topic or target items not used.

Fluency & Coherence (0-20) — Proficient:
"Connected speech using basic linkers (and, but, because, so, then, after that). WPM in the A2 band (70-100). Ideas follow a recognisable order."
- 18-20: Natural pace; varied basic linkers; sequence clear.
- 10-13: Frequent hesitation; linkers absent or misused.
- 0-9: Disconnected speech; ideas don't follow order.

Pronunciation & Intelligibility (0-20) — Proficient:
"Easily understood by native English listeners. Spanish-speaker patterns are present but do not block comprehension at any point."
- 18-20: Clear; mostly correct word stress.
- 10-13: Listener works to understand; multiple words distorted.
- 0-9: Largely unintelligible.

Lexical Range (0-20) — Proficient:
"Vocabulary covers the A2 topic with some collocations. Errors do not prevent understanding."
- 18-20: Good A2 range with collocations and some less-frequent words.
- 10-13: Vocabulary too limited for A2; errors interfere occasionally.
- 0-9: A1-level vocabulary only.

Grammatical Range & Accuracy (0-20) — Proficient:
"Past simple, future with 'going to', comparatives, basic modals (can, should). Errors are common but do not block meaning."
- 18-20: Several A2 structures with control; errors rare.
- 10-13: A2 structures attempted but errors sometimes block meaning.
- 0-9: A1 structures only.`,

  B1: `RUBRIC FOR B1 SPEAKING — Intermediate
Expected length: ~2-3 minutes / 90-120 WPM. Multi-idea response with reasoning.

Band labels apply to every dimension below:
  Distinguished (18-20) · Proficient (14-17) · Developing (10-13) · Emerging (0-9)

Task Achievement & Module Application (0-20) — Proficient:
"Provides a clear response with reasoning. Uses AT LEAST 5 target vocabulary items and 2-3 target grammar structures from the module."
- 18-20: Uses 8+ target items; integrates them naturally with personal experience.
- 10-13: Fewer than 5 target items; reasoning thin.
- 0-9: No clear position; off-topic.

Fluency & Coherence (0-20) — Proficient:
"Smooth speech with varied connectors (however, on the other hand, furthermore, for example). WPM in the B1 band (90-120)."
- 18-20: Natural flow; sophisticated connectors; almost no filled pauses.
- 10-13: Hesitation impedes flow; connectors basic only.
- 0-9: Speech disconnected.

Pronunciation & Intelligibility (0-20) — Proficient:
"Clear and confident. Listener does not work to understand. Spanish-speaker patterns occasionally noticeable but never confusing."
- 18-20: Clear, confident, with appropriate word + sentence stress.
- 10-13: Some words consistently mispronounced; listener works occasionally.
- 0-9: Pronunciation impedes understanding.

Lexical Range (0-20) — Proficient:
"Sound range for familiar AND some less familiar topics. Uses collocations and topic-specific vocabulary."
- 18-20: Wide range; topic-specific vocabulary; accurate collocations.
- 10-13: A2-level range bleeding into B1; collocation errors.
- 0-9: A2 vocabulary or below.

Grammatical Range & Accuracy (0-20) — Proficient:
"Present perfect, past continuous, 1st & 2nd conditionals, reported speech, passive voice. Errors in complex structures do not impede communication."
- 18-20: B1 structures used with control; complex-structure errors rare.
- 10-13: B1 structures attempted but errors common.
- 0-9: A2 structures only.`,

  B2: `RUBRIC FOR B2 SPEAKING — Upper-Intermediate
Expected length: ~3-4 minutes / 110-140 WPM. Developed argument with nuance.

Band labels apply to every dimension below:
  Distinguished (18-20) · Proficient (14-17) · Developing (10-13) · Emerging (0-9)

Task Achievement & Module Application (0-20) — Proficient:
"Nuanced response with developed argument. Uses AT LEAST 7 target items and several target grammar structures. Engages with complexity."
- 18-20: Sophisticated argument; target items used in service of meaning, not as a checklist.
- 10-13: Simple position; arguments under-developed.
- 0-9: Off-topic or no real argument.

Fluency & Coherence (0-20) — Proficient:
"Smooth speech with sophisticated connectors (nevertheless, consequently, in light of). WPM in the B2 band (110-140). Self-corrections natural, not disruptive."
- 18-20: Confident flow; cleft constructions or advanced sequencing used.
- 10-13: B1-level fluency; hesitation more frequent than expected.
- 0-9: Cannot sustain B2-level discourse.

Pronunciation & Intelligibility (0-20) — Proficient:
"Native-listener-comfortable. Word + sentence stress appropriate. Spanish-speaker patterns mostly internalised."
- 18-20: Near-confident pronunciation; appropriate stress and intonation.
- 10-13: B1-level pronunciation; some L1 interference noticeable.
- 0-9: Below B1.

Lexical Range (0-20) — Proficient:
"Wide vocabulary including idioms, phrasal verbs, register-appropriate choices. Connotation awareness."
- 18-20: Idioms and phrasal verbs used naturally; connotation precise.
- 10-13: B1-level range; idioms and connotation imprecise.
- 0-9: Below B1.

Grammatical Range & Accuracy (0-20) — Proficient:
"Third conditional, mixed conditionals, inversion, advanced passive, gerund/infinitive. Errors infrequent and subtle."
- 18-20: Confident B2 control; rare, subtle errors.
- 10-13: B2 structures attempted but error-prone.
- 0-9: B1 structures only.`,

  C1: `RUBRIC FOR C1 SPEAKING — Advanced
Expected length: ~4-5 minutes / 130-160 WPM. Sophisticated, original treatment.

Band labels apply to every dimension below:
  Distinguished (18-20) · Proficient (14-17) · Developing (10-13) · Emerging (0-9)

Task Achievement & Module Application (0-20) — Proficient:
"Sophisticated, original treatment of the topic. Position is nuanced and counter-arguments acknowledged. Uses target vocabulary and grammar naturally, not as a checklist."
- 18-20: Original argument; counter-arguments addressed; target items integrated.
- 10-13: Strong B2-level response; lacks C1 originality.
- 0-9: Below B2.

Fluency & Coherence (0-20) — Proficient:
"Smooth, near-native flow. Wide repertoire of cohesive devices including ellipsis, fronting, end-weighting. WPM in the C1 band (130-160)."
- 18-20: Elegant flow; rhetorical structures used purposefully.
- 10-13: B2-level flow; lacks C1 elegance.
- 0-9: Below B2.

Pronunciation & Intelligibility (0-20) — Proficient:
"Native-like clarity. L1 features residual but not intrusive. Stress, rhythm, and intonation appropriate."
- 18-20: Near-native; stress and intonation serve meaning.
- 10-13: B2-level pronunciation.
- 0-9: Below B2.

Lexical Range (0-20) — Proficient:
"Near-native lexical range, including subtle near-synonyms and awareness of connotation. Idioms used naturally."
- 18-20: Native-like range with stylistic awareness.
- 10-13: B2-level range.
- 0-9: Below B2.

Grammatical Range & Accuracy (0-20) — Proficient:
"Subjunctive, advanced cleft constructions, hedging, complex noun phrases, nominalisation. Errors rare and stylistic."
- 18-20: Subjunctive, cleft, hedging used accurately and purposefully.
- 10-13: B2 structures only.
- 0-9: Below B2.`,

  C2: `RUBRIC FOR C2 SPEAKING — Mastery (LEGACY)

NOTE: CogniBoost officially offers proficiency assessment up to C1 only.
This rubric is retained for compatibility. All dimensions follow C1 plus
native-like execution and distinctive authorial voice.`,
};

export interface SpeakingDimensionScore {
  score: number;
  feedback: string;
}

export interface SpeakingInlineNote {
  text_segment: string;                                  // exact transcript snippet
  issue_type: 'pronunciation' | 'grammar' | 'vocab' | 'fluency' | 'register' | 'module_content_missing';
  explanation: string;
  suggestion: string;
  severity: 'minor' | 'moderate' | 'major';
}

export interface SpeakingGradeResponse {
  overall_score: number;
  level_assessment: CefrLevel;
  dimensions: {
    task_achievement: SpeakingDimensionScore;
    fluency_coherence: SpeakingDimensionScore;
    pronunciation_intelligibility: SpeakingDimensionScore;
    lexical_range: SpeakingDimensionScore;
    grammatical_range: SpeakingDimensionScore;
  };
  inline_notes: SpeakingInlineNote[];
  strengths: string[];
  improvement_priorities: string[];
  target_vocabulary_used: string[];                      // which target words appeared
  target_vocabulary_missing: string[];                   // which target words did NOT appear
  target_grammar_demonstrated: string[];                 // which target structures were observed
  estimated_cefr_for_this_speaking: CefrLevel;
  spanish_speaker_patterns_noticed: string[];
  words_per_minute: number;                              // computed from transcript + duration
}

export interface GradeSpeakingInput {
  targetLevel: CefrLevel;
  /** The Speaking Project prompt the student was asked to address. */
  speakingPrompt: string;
  /** Target vocabulary items defined for this Speaking Project. */
  targetVocabulary: string[];
  /** Target grammar structures defined for this Speaking Project. */
  targetGrammar: string[];
  /** Target expressions defined for this Speaking Project. */
  targetExpressions: string[];
  /** Target duration in seconds (used for fluency assessment). */
  targetDurationSeconds: number;
  /** Whisper transcript of the student's recording. */
  transcript: string;
  /** Actual duration of the recording in seconds. */
  actualDurationSeconds: number;
  /** Optional Whisper confidence score (0-1). Lower confidence → likely pronunciation issues. */
  whisperConfidence?: number;
}

const SYSTEM_PROMPT = `You are a CEFR-certified ESL oral examiner at CogniBoost ESL Academy, specialising in adult Spanish-speaking learners. You grade student speaking submissions strictly against the CogniBoost Speaking Rubric (v2.0, May 2026): five analytic dimensions, 0-100 total, Proficient (14-17) per dimension at the target level.

Speaking is graded INDIRECTLY from a Whisper transcript plus speech timing data (duration, words-per-minute, Whisper confidence). You DO NOT have access to the raw audio. You infer pronunciation from:
  - Whisper confidence score (lower → likely articulation issues)
  - Spanish-speaker error patterns visible in the transcript (b/v confusion, vowel substitution, /sh/ vs /ch/, dropped final consonants, etc.)
  - WPM relative to the level's target band

You follow the institutional anti-patterns at all times:
1. Do NOT penalise the same error twice across different dimensions. A missing connector is Fluency, NOT also Grammar.
2. Do NOT apply the rubric of a higher level. A B1 student is NOT penalised for the absence of C1 features.
3. Do NOT let overall communicative effort override an analytic dimension.
4. Score each dimension independently — do not anchor.
5. Limit inline_notes to AT MOST 6 — pick the most pedagogically valuable, not the most numerous.
6. Provide AT LEAST 2 specific strengths and EXACTLY 3 actionable improvement priorities.
7. Quote exact verbatim transcript text in inline_notes so the student can locate the moment in their recording.
8. Module Application is the heart of Task Achievement at CogniBoost: check whether the student USED the target vocabulary, grammar, and expressions defined for this Speaking Project. List used and missing items in the structured fields.

Pass threshold for institutional record: composite 70/100 (Proficient or above). Sub-70 returns feedback for re-recording, not failure.`;

function buildUserPrompt(input: GradeSpeakingInput): string {
  const {
    targetLevel,
    speakingPrompt,
    targetVocabulary,
    targetGrammar,
    targetExpressions,
    targetDurationSeconds,
    transcript,
    actualDurationSeconds,
    whisperConfidence,
  } = input;
  const rubric = SPEAKING_RUBRICS_BY_LEVEL[targetLevel];
  const wpmBand = SPEAKING_WPM_TARGETS[targetLevel];
  const actualWordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
  const actualWPM = actualDurationSeconds > 0
    ? Math.round((actualWordCount / actualDurationSeconds) * 60)
    : 0;

  return `Grade the following student speaking submission.

STUDENT CONTEXT:
- Target level: ${targetLevel}
- Native language: Spanish
- Target duration: ${targetDurationSeconds}s   (actual: ${actualDurationSeconds}s)
- Expected WPM band: ${wpmBand.min}-${wpmBand.max}   (actual: ${actualWPM} WPM, ${actualWordCount} words)
${whisperConfidence !== undefined ? `- Whisper transcription confidence: ${whisperConfidence.toFixed(2)} (lower → likely pronunciation issues)` : ''}

SPEAKING PROMPT WAS:
"${speakingPrompt}"

TARGET VOCABULARY (the module taught these — student should use them):
${targetVocabulary.map(v => `  • ${v}`).join('\n') || '  (none specified)'}

TARGET GRAMMAR STRUCTURES (the module taught these — student should demonstrate them):
${targetGrammar.map(g => `  • ${g}`).join('\n') || '  (none specified)'}

TARGET EXPRESSIONS (the module taught these — student should use them):
${targetExpressions.map(e => `  • ${e}`).join('\n') || '  (none specified)'}

STUDENT'S TRANSCRIPT (from Whisper):
"""
${transcript}
"""

${rubric}

OUTPUT REQUIRED (JSON, no additional text):
{
  "overall_score": <0-100, sum of the five dimensions>,
  "level_assessment": "<A1|A2|B1|B2|C1|C2 — what this submission actually demonstrates>",
  "dimensions": {
    "task_achievement":             {"score": <0-20>, "feedback": "<specific; cite target items used + missing>"},
    "fluency_coherence":            {"score": <0-20>, "feedback": "<specific; reference WPM and pause patterns>"},
    "pronunciation_intelligibility": {"score": <0-20>, "feedback": "<specific; cite L1 interference if any>"},
    "lexical_range":                {"score": <0-20>, "feedback": "<specific; cite vocabulary used and limitations>"},
    "grammatical_range":            {"score": <0-20>, "feedback": "<specific; reference level-expected structures>"}
  },
  "inline_notes": [
    {
      "text_segment": "<exact verbatim transcript phrase>",
      "issue_type": "<pronunciation|grammar|vocab|fluency|register|module_content_missing>",
      "explanation": "<why this is an issue, in plain pedagogical language>",
      "suggestion": "<corrected version OR what to add>",
      "severity": "<minor|moderate|major>"
    }
  ],
  "strengths": ["<specific positive 1>", "<specific positive 2>"],
  "improvement_priorities": [
    "<actionable item 1, specific to this submission>",
    "<actionable item 2>",
    "<actionable item 3>"
  ],
  "target_vocabulary_used": ["<word from target list that DID appear>", "..."],
  "target_vocabulary_missing": ["<word from target list that DID NOT appear>", "..."],
  "target_grammar_demonstrated": ["<grammar structure from target list that was observed>", "..."],
  "estimated_cefr_for_this_speaking": "<level>",
  "spanish_speaker_patterns_noticed": [
    "<L1 interference pattern observed (b/v confusion, vowel substitution, calque, dropped article, etc.)>"
  ],
  "words_per_minute": ${actualWPM}
}

SCORING REMINDERS:
- overall_score MUST equal the sum of the five dimension scores (max 100).
- Apply the anti-patterns from the system prompt: no double-penalty, no higher-level rubric, no holistic override.
- Limit inline_notes to AT MOST 6 — pick the most pedagogically valuable.
- Provide AT LEAST 2 strengths and EXACTLY 3 improvement_priorities.
- Quote exact verbatim transcript text in inline_notes.
- target_vocabulary_used / target_vocabulary_missing MUST partition the input targetVocabulary list — every target word goes into exactly one of these two arrays.
- target_grammar_demonstrated lists which of the target_grammar items the student actually demonstrated.
- For A1: pronunciation defaults higher (these students aren't expected to sound native).
- For Module Application: if the student ignored the module's target vocabulary/grammar entirely, that is a Task Achievement issue (cite specific missing items as module_content_missing in inline_notes).
- Feedback must be specific. "Practice pronunciation" is unacceptable. "Practice the /v/ sound — say 'very' not 'bery' — try slowing down on words starting with 'v'" is acceptable.`;
}

/**
 * Grade a single speaking submission against the level-specific rubric.
 * Caches the system prompt + rubric so repeat grades at the same level pay
 * ~0.1× input cost.
 */
export async function gradeSpeaking(input: GradeSpeakingInput): Promise<{
  grade: SpeakingGradeResponse;
  rawResponse: Anthropic.Message;
}> {
  const client = getAnthropicClient();
  const userPrompt = buildUserPrompt(input);

  // Note: adaptive thinking was removed 2026-05-15 because on very short
  // transcripts Claude would consume the budget thinking and produce ONLY
  // a `thinking` content block — no `text` block — and extractTextContent
  // would throw "No text block in Anthropic response". Grading is a
  // structured-output task that does not benefit from extended thinking,
  // so we just disable it.
  const stream = client.messages.stream({
    // Speaking grading uses Haiku — 3-5x faster than Sonnet and the rubric
    // work (5 dimensions from a transcript + timing data) doesn't need the
    // deeper reasoning Sonnet provides. Rolls back via env var.
    model: ANTHROPIC_MODELS.speaking,
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
  const grade = parseJsonFromResponse<SpeakingGradeResponse>(text);

  return { grade, rawResponse: message };
}
