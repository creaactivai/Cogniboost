/**
 * Whisper transcription client.
 *
 * Wraps OpenAI's Whisper API for converting student speaking-submission
 * audio into text + timing data that gradeSpeaking() consumes.
 *
 * Two entry points:
 *   transcribeFromUrl(url)    — fetch a file (e.g. from GCS) then transcribe
 *   transcribeFromBuffer(buf) — already-in-memory audio buffer
 *
 * Both return:
 *   {
 *     transcript: string,                         // full text
 *     durationSeconds: number,                    // total length of audio
 *     avgConfidence: number,                      // 0..1, from segment avg_logprob
 *     wordsPerMinute: number,                    // computed
 *     language: string                            // ISO language code Whisper detected
 *     segments: Array<{ start, end, text, avgLogprob }>
 *   }
 *
 * Notes:
 *   - We always force language='en' since CogniBoost is an English-learning
 *     platform. Spanish-speaker code-switching is captured in the transcript
 *     as Whisper transliterates Spanish phrases phonetically when they appear.
 *   - response_format='verbose_json' is needed to get segment-level
 *     confidence (avg_logprob). The simple 'json' format omits those fields.
 *   - File extension matters for Whisper's autodetection. The caller must
 *     supply the correct extension (.webm, .mp4, .m4a, .mp3, .wav).
 */

import OpenAI from 'openai';
import { File } from 'node:buffer';

let cachedClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey || apiKey === 'sk-placeholder-not-configured') {
    throw new Error('AI_INTEGRATIONS_OPENAI_API_KEY is not configured');
  }
  cachedClient = new OpenAI({ apiKey });
  return cachedClient;
}

export interface WhisperSegment {
  start: number;
  end: number;
  text: string;
  avgLogprob: number;       // negative number; closer to 0 = higher confidence
}

export interface WhisperResult {
  transcript: string;
  durationSeconds: number;
  /** 0..1 — derived from avg_logprob (exp(avg_logprob) averaged across segments) */
  avgConfidence: number;
  wordsPerMinute: number;
  language: string;
  segments: WhisperSegment[];
  /** Detected pauses longer than this threshold (default 1.5s) — useful for Fluency assessment */
  longPauses: Array<{ start: number; duration: number }>;
  fillerCount: number;       // count of "uh", "um", "eh" tokens
}

const FILLER_TOKENS = /\b(uh+|um+|eh+|ah+|er+|hmm+)\b/gi;
const LONG_PAUSE_THRESHOLD = 1.5;     // seconds

function buildResult(verboseJson: any): WhisperResult {
  const transcript = String(verboseJson.text ?? '').trim();
  const duration = Number(verboseJson.duration ?? 0);
  const segments: WhisperSegment[] = (verboseJson.segments ?? []).map((s: any) => ({
    start: Number(s.start ?? 0),
    end: Number(s.end ?? 0),
    text: String(s.text ?? '').trim(),
    avgLogprob: Number(s.avg_logprob ?? -1),
  }));

  // Confidence: exp(avg_logprob) averaged across segments. avg_logprob is in
  // log space (typically -0.1 to -1.5 for English speech); exp() brings it
  // to a 0..1 probability-ish scale.
  let avgConfidence = 0;
  if (segments.length > 0) {
    const sum = segments.reduce((acc, s) => acc + Math.exp(s.avgLogprob), 0);
    avgConfidence = Math.max(0, Math.min(1, sum / segments.length));
  }

  // Long pauses = gaps between consecutive segments > threshold.
  const longPauses: Array<{ start: number; duration: number }> = [];
  for (let i = 1; i < segments.length; i++) {
    const gap = segments[i].start - segments[i - 1].end;
    if (gap > LONG_PAUSE_THRESHOLD) {
      longPauses.push({ start: segments[i - 1].end, duration: gap });
    }
  }

  // Word count + WPM.
  const wordCount = transcript.split(/\s+/).filter(Boolean).length;
  const wordsPerMinute = duration > 0 ? Math.round((wordCount / duration) * 60) : 0;

  // Filler tokens.
  const fillerCount = (transcript.match(FILLER_TOKENS) || []).length;

  return {
    transcript,
    durationSeconds: duration,
    avgConfidence,
    wordsPerMinute,
    language: String(verboseJson.language ?? 'en'),
    segments,
    longPauses,
    fillerCount,
  };
}

/**
 * Transcribe an audio file fetched from a URL (e.g. GCS).
 */
export async function transcribeFromUrl(
  url: string,
  opts: { filename?: string } = {}
): Promise<WhisperResult> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Whisper: failed to fetch audio from ${url}: ${res.status} ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  const filename = opts.filename || url.split('/').pop()?.split('?')[0] || 'audio.webm';
  return transcribeFromBuffer(buf, filename);
}

/**
 * Transcribe an in-memory audio buffer.
 */
export async function transcribeFromBuffer(
  buf: Buffer,
  filename: string
): Promise<WhisperResult> {
  const client = getOpenAIClient();
  // OpenAI SDK expects a File-like object. node's built-in File constructor
  // works directly with the SDK as of v6.
  const file = new File([buf], filename, { type: guessMimeType(filename) });

  const response: any = await client.audio.transcriptions.create({
    file: file as any,
    model: 'whisper-1',
    language: 'en',                         // force English
    response_format: 'verbose_json',        // need segments + avg_logprob
    timestamp_granularities: ['segment'],
  });

  return buildResult(response);
}

function guessMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() || '';
  switch (ext) {
    case 'webm': return 'audio/webm';
    case 'ogg':  return 'audio/ogg';
    case 'mp3':  return 'audio/mpeg';
    case 'mp4':
    case 'm4a':  return 'audio/mp4';
    case 'wav':  return 'audio/wav';
    case 'flac': return 'audio/flac';
    default:     return 'application/octet-stream';
  }
}
