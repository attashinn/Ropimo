import { NextRequest, NextResponse } from "next/server";
import { getFromR2 } from "@/lib/storage/r2";
import { requireUser, requireWorkspaceRole } from "@/lib/auth/require-user";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ key: string[] }> }
) {
  try {
    // 1. Require authenticated user login
    let user;
    try {
      user = await requireUser();
    } catch {
      return new NextResponse("Unauthorized: Login required to access workspace storage.", {
        status: 401,
      });
    }

    const { key: keyParts } = await context.params;
    if (!keyParts || keyParts.length === 0) {
      return new NextResponse("Key not specified", { status: 400 });
    }

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
    } catch (err: any) {
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
    } catch (fetchErr: any) {
      if (
        fetchErr?.name === "NoSuchKey" ||
        fetchErr?.$metadata?.httpStatusCode === 404 ||
        fetchErr?.message?.includes("not found") ||
        fetchErr?.message?.includes("ENOENT")
      ) {
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
      typeof result.Body.transformToWebStream === "function"
        ? result.Body.transformToWebStream()
        : result.Body;

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

    return new NextResponse(responseStream as any, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("[Storage API] Unexpected handler error:", error);
    return new NextResponse("File not found", { status: 404 });
  }
}
