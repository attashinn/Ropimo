import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import path from "path";

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || "1bcc061fdf9ab260ead275b289f90e0a";
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || "ropimo";
const R2_ENDPOINT =
  process.env.CLOUDFLARE_R2_ENDPOINT ||
  `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "";
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

const hasValidR2Credentials =
  Boolean(R2_ACCESS_KEY_ID && R2_ACCESS_KEY_ID.trim().length > 5) &&
  Boolean(R2_SECRET_ACCESS_KEY && R2_SECRET_ACCESS_KEY.trim().length > 5);

// Initialize S3 Client configured for Cloudflare R2
export const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || "dummy",
    secretAccessKey: R2_SECRET_ACCESS_KEY || "dummy",
  },
});

export interface UploadOptions {
  key: string;
  buffer: Buffer | Uint8Array;
  contentType: string;
  metadata?: Record<string, string>;
}

/**
 * Upload a file buffer directly to Cloudflare R2 (or fallback to local storage ONLY in development)
 */
export async function uploadToR2({
  key,
  buffer,
  contentType,
  metadata,
}: UploadOptions): Promise<{ key: string; url: string; publicUrl: string }> {
  const sanitizedKey = key.replace(/^\/+/, "");

  if (hasValidR2Credentials) {
    try {
      const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: sanitizedKey,
        Body: buffer,
        ContentType: contentType,
        Metadata: metadata,
      });

      await r2Client.send(command);

      const fileUrl = getR2FileUrl(sanitizedKey);

      return {
        key: sanitizedKey,
        url: fileUrl,
        publicUrl: fileUrl,
      };
    } catch (r2Error) {
      console.warn("R2 upload error:", r2Error);
      if (process.env.NODE_ENV === "production") {
        throw new Error("Cloudflare R2 upload failed in production. Local uploads are disabled.");
      }
    }
  }

  // In production, fallback to public/uploads is strictly forbidden (read-only filesystem & security risk)
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Cloudflare R2 storage credentials are required in production. Local filesystem upload fallback is prohibited on Vercel/serverless."
    );
  }

  // Development-only fallback: Save file to local public/uploads directory for testing
  try {
    const localPath = path.join(process.cwd(), "public", "uploads", sanitizedKey);
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(localPath, buffer);

    const fileUrl = `/api/storage/${sanitizedKey}`;
    return {
      key: sanitizedKey,
      url: fileUrl,
      publicUrl: fileUrl,
    };
  } catch (fsErr) {
    console.error("Local storage fallback failed:", fsErr);
    throw new Error("Failed to store file in storage.");
  }
}

/**
 * Delete a file object from Cloudflare R2 or local development storage
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  const sanitizedKey = key.replace(/^\/+/, "");

  if (hasValidR2Credentials) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: sanitizedKey,
      });
      await r2Client.send(command);
      return true;
    } catch (err) {
      console.error("Error deleting from R2:", err);
    }
  }

  if (process.env.NODE_ENV !== "production") {
    try {
      const localPath = path.join(process.cwd(), "public", "uploads", sanitizedKey);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        return true;
      }
    } catch (e) {
      console.error("Error deleting local file:", e);
    }
  }

  return false;
}

/**
 * Get file stream / object from Cloudflare R2 or local development storage
 */
export async function getFromR2(key: string) {
  const sanitizedKey = key.replace(/^\/+/, "");

  // Check local file in development only
  if (process.env.NODE_ENV !== "production") {
    const localPath = path.join(process.cwd(), "public", "uploads", sanitizedKey);
    if (fs.existsSync(localPath)) {
      const fileBuffer = fs.readFileSync(localPath);
      return {
        Body: {
          transformToWebStream: () => {
            return new ReadableStream({
              start(controller) {
                controller.enqueue(new Uint8Array(fileBuffer));
                controller.close();
              },
            });
          },
        },
        ContentType: undefined,
        ContentLength: fileBuffer.length,
        ETag: undefined,
      };
    }
  }

  if (hasValidR2Credentials) {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: sanitizedKey,
    });
    return await r2Client.send(command);
  }

  const notFoundErr = new Error("File not found in storage");
  notFoundErr.name = "NoSuchKey";
  throw notFoundErr;
}

/**
 * Generate a pre-signed upload URL for direct browser-to-R2 upload
 */
export async function getR2PresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 3600
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  const sanitizedKey = key.replace(/^\/+/, "");

  if (hasValidR2Credentials) {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: sanitizedKey,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(r2Client, command, {
      expiresIn: expiresInSeconds,
    });

    return {
      uploadUrl,
      key: sanitizedKey,
      publicUrl: getR2FileUrl(sanitizedKey),
    };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Cloudflare R2 storage credentials are required for presigned uploads in production.");
  }

  return {
    uploadUrl: `/api/upload`,
    key: sanitizedKey,
    publicUrl: `/api/storage/${sanitizedKey}`,
  };
}

/**
 * Resolve proxy access URL for a stored R2 key
 */
export function getR2FileUrl(key: string): string {
  const sanitizedKey = key.replace(/^\/+/, "");
  if (R2_PUBLIC_URL && R2_PUBLIC_URL.trim().length > 0) {
    const base = R2_PUBLIC_URL.replace(/\/+$/, "");
    return `${base}/${sanitizedKey}`;
  }
  return `/api/storage/${sanitizedKey}`;
}

export { R2_BUCKET_NAME, R2_ENDPOINT, R2_ACCOUNT_ID };
