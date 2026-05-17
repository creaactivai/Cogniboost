import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";

/**
 * Direct Google Cloud Storage upload service.
 * Replaces the Replit sidecar-based ObjectStorageService for Railway deployment.
 *
 * Required env vars:
 *   GCS_BUCKET_NAME    — GCS bucket name (e.g. "cogniboost-uploads")
 *   GCS_SERVICE_ACCOUNT — Base64-encoded JSON service account key
 */

let storageClient: Storage | null = null;

function getStorage(): Storage {
  if (storageClient) return storageClient;

  const keyBase64 = process.env.GCS_SERVICE_ACCOUNT;
  if (!keyBase64) {
    throw new Error("GCS_SERVICE_ACCOUNT env var not set. Set it to a base64-encoded GCS service account JSON key.");
  }

  const keyJson = JSON.parse(Buffer.from(keyBase64, "base64").toString("utf-8"));
  storageClient = new Storage({ credentials: keyJson, projectId: keyJson.project_id });
  return storageClient;
}

function getBucketName(): string {
  const name = process.env.GCS_BUCKET_NAME;
  if (!name) {
    throw new Error("GCS_BUCKET_NAME env var not set.");
  }
  return name;
}

/**
 * Upload a file buffer to GCS and return its public URL.
 */
export async function uploadToGcs(
  buffer: Buffer,
  originalFilename: string,
  contentType: string,
): Promise<{ url: string; name: string }> {
  const storage = getStorage();
  const bucketName = getBucketName();
  const bucket = storage.bucket(bucketName);

  // Generate unique object name: uploads/<uuid>/<original-filename>
  const objectName = `uploads/${randomUUID()}/${originalFilename}`;
  const file = bucket.file(objectName);

  await file.save(buffer, {
    contentType,
    metadata: { cacheControl: "public, max-age=31536000" },
  });

  // Make the file publicly readable
  await file.makePublic();

  const url = `https://storage.googleapis.com/${bucketName}/${objectName}`;
  return { url, name: originalFilename };
}

// ────────────────────────────────────────────────────────────────────
// Vocabulary audio cache helpers — "generate once, store forever"
// ────────────────────────────────────────────────────────────────────
// Deterministic object path keyed on (voice_id, lowercased term hash).
// First student to click a word triggers ElevenLabs once → MP3 saved
// to GCS → every future click anywhere serves from GCS for free.
// Mirror the lesson-factory pattern (pre-generated MP3s on GCS).

import { createHash } from "crypto";

function gcsVocabAudioPath(voiceId: string, term: string): string {
  // sha256 of lowercased normalized term → 16-char hex prefix
  // (collision-safe enough for vocab; deterministic across calls)
  const norm = term.trim().toLowerCase();
  const hash = createHash("sha256").update(norm).digest("hex").slice(0, 24);
  return `vocab-audio/${voiceId}/${hash}.mp3`;
}

export function gcsVocabAudioUrl(voiceId: string, term: string): string {
  const bucketName = getBucketName();
  const path = gcsVocabAudioPath(voiceId, term);
  return `https://storage.googleapis.com/${bucketName}/${path}`;
}

/** Returns true if a cached MP3 already exists in GCS for this (voice, term). */
export async function vocabAudioExists(voiceId: string, term: string): Promise<boolean> {
  try {
    const storage = getStorage();
    const bucket = storage.bucket(getBucketName());
    const [exists] = await bucket.file(gcsVocabAudioPath(voiceId, term)).exists();
    return !!exists;
  } catch (err) {
    console.warn("[vocabAudioExists] check failed:", (err as any)?.message);
    return false;
  }
}

/** Save an MP3 buffer at the deterministic path and return its public URL. */
export async function saveVocabAudio(
  voiceId: string,
  term: string,
  buffer: Buffer,
): Promise<string> {
  const storage = getStorage();
  const bucketName = getBucketName();
  const bucket = storage.bucket(bucketName);
  const path = gcsVocabAudioPath(voiceId, term);
  const file = bucket.file(path);

  await file.save(buffer, {
    contentType: "audio/mpeg",
    metadata: {
      cacheControl: "public, max-age=31536000, immutable",
      metadata: { term: term.slice(0, 200), voiceId },
    },
  });
  await file.makePublic();

  return `https://storage.googleapis.com/${bucketName}/${path}`;
}
