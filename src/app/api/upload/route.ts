import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { uploadToR2, getR2PresignedUploadUrl } from "@/lib/storage/r2";
import { requireWorkspaceRole, requireUser } from "@/lib/auth/require-user";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";

const ALLOWED_TYPES: Record<string, { mimes: string[]; maxSize: number }> = {
  // Images (Max 5MB)
  jpg: { mimes: ["image/jpeg"], maxSize: 5 * 1024 * 1024 },
  jpeg: { mimes: ["image/jpeg"], maxSize: 5 * 1024 * 1024 },
  png: { mimes: ["image/png"], maxSize: 5 * 1024 * 1024 },
  webp: { mimes: ["image/webp"], maxSize: 5 * 1024 * 1024 },
  gif: { mimes: ["image/gif"], maxSize: 5 * 1024 * 1024 },

  // Documents (Max 20MB)
  pdf: { mimes: ["application/pdf"], maxSize: 20 * 1024 * 1024 },
  doc: { mimes: ["application/msword"], maxSize: 20 * 1024 * 1024 },
  docx: {
    mimes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    maxSize: 20 * 1024 * 1024,
  },
  txt: { mimes: ["text/plain"], maxSize: 5 * 1024 * 1024 },
  csv: { mimes: ["text/csv", "text/plain"], maxSize: 10 * 1024 * 1024 },
};

const DANGEROUS_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "sh", "php", "phtml", "py", "rb", "js", "ts", "vbs", "pl",
  "jar", "cgi", "htm", "html", "svg", "bin", "elf", "scr", "msi", "dll", "com",
]);

function validateFilenameAndExtension(filename: string): { safeExt: string; sanitizedName: string } {
  const sanitized = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const parts = sanitized.split(".");

  if (parts.length < 2) {
    throw new Error("File must have a valid file extension.");
  }

  // Reject double extensions (e.g. file.php.jpg or file.exe.pdf)
  for (let i = 1; i < parts.length - 1; i++) {
    const intermediateExt = parts[i].toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(intermediateExt) || ALLOWED_TYPES[intermediateExt]) {
      throw new Error("Suspicious filename rejected: Double extensions are strictly prohibited.");
    }
  }

  const ext = parts[parts.length - 1].toLowerCase();
  if (!ALLOWED_TYPES[ext]) {
    throw new Error(`File extension '.${ext}' is not permitted.`);
  }

  return { safeExt: ext, sanitizedName: sanitized };
}

export async function POST(request: NextRequest) {
  try {
    // 1. IP-based rate limiting on upload endpoint (max 15 uploads per minute)
    const clientIp = getClientIp(request.headers);
    const rateLimit = await checkRateLimit(`upload:${clientIp}`, {
      intervalSeconds: 60,
      maxRequests: 15,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many upload requests. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    const contentType = request.headers.get("content-type") || "";

    // 2. JSON Request for Presigned Upload URL
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { filename, fileType, workspaceId, folder = "general" } = body;

      if (!workspaceId) {
        return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
      }

      // Check authentication & workspace membership (Never trust client-sent workspaceId)
      const isCandidateUpload = folder === "resumes";
      if (!isCandidateUpload) {
        await requireWorkspaceRole(workspaceId);
      }

      if (!filename) {
        return NextResponse.json({ error: "filename is required" }, { status: 400 });
      }

      const { safeExt } = validateFilenameAndExtension(filename);
      if (isCandidateUpload && !["pdf", "doc", "docx"].includes(safeExt)) {
        return NextResponse.json(
          { error: "Public uploads are strictly limited to resume document formats (.pdf, .doc, .docx)." },
          { status: 400 }
        );
      }
      const typeConfig = ALLOWED_TYPES[safeExt];

      if (fileType && !typeConfig.mimes.includes(fileType) && fileType !== "application/octet-stream") {
        return NextResponse.json(
          { error: `MIME type '${fileType}' does not match extension '.${safeExt}'.` },
          { status: 400 }
        );
      }

      // Format key strictly as workspaceId/uuid.ext to prevent guessability and collision
      const fileUuid = crypto.randomUUID();
      const key = `${workspaceId}/${fileUuid}.${safeExt}`;

      const presigned = await getR2PresignedUploadUrl(key, fileType || typeConfig.mimes[0]);

      return NextResponse.json({
        success: true,
        uploadUrl: presigned.uploadUrl,
        key: presigned.key,
        fileUrl: `/api/storage/${presigned.key}`,
      });
    }

    // 3. FormData Multipart File Upload
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const workspaceId = (formData.get("workspaceId") as string) || "";
    const folder = (formData.get("folder") as string) || "general";

    if (!file) {
      return NextResponse.json({ error: "No file provided in form data" }, { status: 400 });
    }

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    // Authenticate unless candidate resume submission
    const isCandidateUpload = folder === "resumes";
    if (!isCandidateUpload) {
      await requireWorkspaceRole(workspaceId);
    }

    const { safeExt, sanitizedName } = validateFilenameAndExtension(file.name);
    if (isCandidateUpload && !["pdf", "doc", "docx"].includes(safeExt)) {
      return NextResponse.json(
        { error: "Public uploads are strictly limited to resume document formats (.pdf, .doc, .docx)." },
        { status: 400 }
      );
    }
    const typeConfig = ALLOWED_TYPES[safeExt];

    if (file.size > typeConfig.maxSize) {
      return NextResponse.json(
        {
          error: `File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed limit (${Math.round(
            typeConfig.maxSize / 1024 / 1024
          )}MB) for .${safeExt}.`,
        },
        { status: 400 }
      );
    }

    if (file.type && !typeConfig.mimes.includes(file.type) && file.type !== "application/octet-stream") {
      return NextResponse.json(
        { error: `MIME type '${file.type}' does not match extension '.${safeExt}'.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileUuid = crypto.randomUUID();
    const key = `${workspaceId}/${fileUuid}.${safeExt}`;

    const uploadResult = await uploadToR2({
      key,
      buffer,
      contentType: file.type || typeConfig.mimes[0],
      metadata: {
        originalName: encodeURIComponent(sanitizedName),
        size: file.size.toString(),
        uploadedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      key: uploadResult.key,
      url: `/api/storage/${uploadResult.key}`,
      fileUrl: `/api/storage/${uploadResult.key}`,
      name: sanitizedName,
      size: file.size,
      type: file.type || typeConfig.mimes[0],
    });
  } catch (error: any) {
    console.error("[Upload API] Error:", error?.message);
    const statusCode = error?.message?.includes("Forbidden")
      ? 403
      : error?.message?.includes("Unauthorized")
      ? 401
      : error?.message?.includes("prohibited") || error?.message?.includes("extension")
      ? 400
      : 500;

    return NextResponse.json(
      { error: error?.message || "Failed to upload file." },
      { status: statusCode }
    );
  }
}
