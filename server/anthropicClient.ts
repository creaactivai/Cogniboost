/**
 * Anthropic Claude client — singleton + helpers.
 *
 * Adopted in Phase 0 of the CogniBoost v2.0 build (see MASTER_PLAN_REVISED.md).
 *
 * Two model tiers:
 *   - GRADING (default: claude-sonnet-4-6) — cheap/fast, used by the
 *     writing/reading grading endpoints and any latency-sensitive scoring.
 *   - CONTENT (default: claude-opus-4-7) — used by the One-Click AI Lesson
 *     Generator and Lab Pack Generator (Master Plan v2.0 §13).
 *
 * The api key MUST be a real `sk-ant-...` Anthropic key — do NOT route through
 * any Replit-style proxy. See `AI_INTEGRATIONS_OPENAI_BASE_URL` cleanup in
 * the Reinilza ticket post-mortem for why we don't repeat that pattern.
 */

import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

/**
 * Lazily-instantiated singleton. Throws on first use if ANTHROPIC_API_KEY is
 * unset, so the server can boot without Anthropic configured (legacy OpenAI
 * paths still work) but any new AI-graded code path fails loudly with a real
 * error instead of a generic 500.
 */
export function getAnthropicClient(): Anthropic {
  if (_client) return _client;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not configured. Set it in Railway env vars. ' +
      'See HANDOVER_OPERATIONS_GUIDE.md → Environment Variables for context.'
    );
  }
  if (!apiKey.startsWith('sk-ant-')) {
    throw new Error(
      'ANTHROPIC_API_KEY does not start with "sk-ant-". The Replit proxy ' +
      'format is NOT supported on Railway. Get a real key at ' +
      'https://console.anthropic.com/settings/keys'
    );
  }

  _client = new Anthropic({ apiKey });
  return _client;
}

/** Model IDs surfaced through env so we can rotate without code edits. */
export const ANTHROPIC_MODELS = {
  /** Grading: writing, reading, listening short-answer scoring. */
  get grading(): string {
    return process.env.ANTHROPIC_MODEL_GRADING ?? 'claude-sonnet-4-6';
  },
  /** Content generation: lesson packs, reading passages, Lab Packs. */
  get content(): string {
    return process.env.ANTHROPIC_MODEL_CONTENT ?? 'claude-opus-4-7';
  },
} as const;

/** Type guard for the JSON-object content block returned by `messages.create`. */
export function extractTextContent(message: Anthropic.Message): string {
  const textBlock = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  if (!textBlock) {
    throw new Error(`No text block in Anthropic response. Got ${message.content.length} blocks: ${message.content.map(b => b.type).join(', ')}`);
  }
  return textBlock.text;
}

/**
 * Best-effort JSON extraction from a model response. Claude returns text;
 * we extract the first `{...}` or `[...]` block. Throws with the original
 * text if parsing fails — the caller surfaces this to the admin so the
 * actual failure mode is visible (per Master Plan §15 "surface real errors").
 */
export function parseJsonFromResponse<T = unknown>(text: string): T {
  // First try direct parse
  try {
    return JSON.parse(text) as T;
  } catch {
    // fall through
  }
  // Strip markdown code fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced) {
    try {
      return JSON.parse(fenced[1]) as T;
    } catch {
      // fall through
    }
  }
  // Find first balanced JSON object or array
  const firstBrace = Math.min(
    ...['{', '['].map(c => {
      const i = text.indexOf(c);
      return i === -1 ? Infinity : i;
    })
  );
  if (firstBrace !== Infinity) {
    const candidate = text.slice(firstBrace);
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // fall through
    }
  }
  throw new Error(`Failed to parse JSON from Claude response. Raw text:\n${text}`);
}
