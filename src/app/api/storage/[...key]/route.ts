import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getFromR2 } from "@/lib/storage/r2";
import { requireUser, requireWorkspaceRole } from "@/lib/auth/require-user";

const StorageKeySchema = z.array(z.string().min(1)).min(1, "Key not specified");

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ key: string[] }> }
) {
  try {
    // 1. Require authenticated user login
    try {
      await requireUser();
    } catch {
      return new NextResponse("Unauthorized: Login required to access workspace storage.", {
        status: 401,
      });
    }

    const resolvedParams = await context.params;
    const parseResult = StorageKeySchema.safeParse(resolvedParams?.key);

    if (!parseResult.success) {
      return new NextResponse("Bad Request: Invalid storage key structure.", { status: 400 });
    }

    const keyParts = parseResult.data;

    // 2. Validate key format: must be prefixed by workspaceId
    const workspaceId = keyParts[0];
    if (!workspaceId) {
      return new NextResponse("Bad Request: Storage key must be scoped to a workspace.", {
        status: 400,
      });
    }

    // 3. Verify that the authenticated user belongs to the requested workspace
    try {
      await requireWorkspaceRole(workspaceId);
    } catch {
      return new NextResponse(
        `Forbidden: You do not have permission to access files from workspace ${workspaceId}.`,
        { status: 403 }
      );
    }

    const key = keyParts.join("/");

    // 4. Retrieve file from storage
    let result;
    try {
      result = await getFromR2(key);
    } catch (fetchErr: unknown) {
      const isNotFound =
        fetchErr &&
        typeof fetchErr === "object" &&
        ("name" in fetchErr && (fetchErr as { name: string }).name === "NoSuchKey" ||
          "$metadata" in fetchErr && (fetchErr as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404 ||
          "message" in fetchErr && typeof (fetchErr as { message: string }).message === "string" &&
            ((fetchErr as { message: string }).message.includes("not found") ||
              (fetchErr as { message: string }).message.includes("ENOENT")));

      if (isNotFound) {
        return new NextResponse("File not found", { status: 404 });
      }
      console.error("[Storage API] Error fetching from R2:", fetchErr);
      return new NextResponse("File not found", { status: 404 });
    }

    if (!result || !result.Body) {
      return new NextResponse("File not found", { status: 404 });
    }

    // Convert to web stream
    const responseStream =
      typeof (result.Body as { transformToWebStream?: () => ReadableStream }).transformToWebStream === "function"
        ? (result.Body as { transformToWebStream: () => ReadableStream }).transformToWebStream()
        : (result.Body as unknown as BodyInit);

    const headers = new Headers();
    if (result.ContentType) {
      headers.set("Content-Type", result.ContentType);
    }
    if (result.ContentLength) {
      headers.set("Content-Length", result.ContentLength.toString());
    }
    if (result.ETag) {
      headers.set("ETag", result.ETag);
    }

    // Private cache-control scoped to user session
    headers.set("Cache-Control", "private, no-transform, max-age=3600");
    headers.set("X-Content-Type-Options", "nosniff");

    return new NextResponse(responseStream as BodyInit, {
      status: 200,
      headers,
    });
  } catch (error: unknown) {
    console.error("[Storage API] Unexpected handler error:", error);
    return new NextResponse("File not found", { status: 404 });
  }
}
