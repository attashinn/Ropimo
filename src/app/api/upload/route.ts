import { NextRequest, NextResponse } from "next/server";
import { uploadToR2, getR2PresignedUploadUrl } from "@/lib/storage/r2";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // 1. JSON Request for Presigned Upload URL
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { filename, fileType, folder = "uploads", workspaceId = "default" } = body;

      if (!filename) {
        return NextResponse.json({ error: "Filename is required" }, { status: 400 });
      }

      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const key = `${workspaceId}/${folder}/${timestamp}-${randomSuffix}-${sanitizedFilename}`;

      const presigned = await getR2PresignedUploadUrl(key, fileType || "application/octet-stream");

      return NextResponse.json({
        success: true,
        uploadUrl: presigned.uploadUrl,
        key: presigned.key,
        fileUrl: presigned.publicUrl,
      });
    }

    // 2. FormData Multipart File Upload
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "uploads";
    const workspaceId = (formData.get("workspaceId") as string) || "default";

    if (!file) {
      return NextResponse.json({ error: "No file provided in form data" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const key = `${workspaceId}/${folder}/${timestamp}-${randomSuffix}-${sanitizedFilename}`;

    const uploadResult = await uploadToR2({
      key,
      buffer,
      contentType: file.type || "application/octet-stream",
      metadata: {
        originalName: encodeURIComponent(file.name),
        size: file.size.toString(),
        uploadedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      key: uploadResult.key,
      url: uploadResult.url,
      fileUrl: uploadResult.url,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to upload file to storage" },
      { status: 500 }
    );
  }
}
