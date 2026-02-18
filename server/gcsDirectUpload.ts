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
