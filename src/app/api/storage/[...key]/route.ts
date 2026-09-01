import { NextRequest, NextResponse } from "next/server";
import { getFromR2 } from "@/lib/storage/r2";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key: keyParts } = await context.params;
    if (!keyParts || keyParts.length === 0) {
      return new NextResponse("Key not specified", { status: 400 });
    }

    const key = keyParts.join("/");
    const result = await getFromR2(key);

    if (!result.Body) {
      return new NextResponse("File not found", { status: 404 });
    }

    // Convert AWS SDK stream to Web ReadableStream
    const responseStream = result.Body.transformToWebStream();

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

    // Cache control for performance
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new NextResponse(responseStream, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("Error retrieving file from R2:", error);
    if (error?.name === "NoSuchKey" || error?.$metadata?.httpStatusCode === 404) {
      return new NextResponse("File not found", { status: 404 });
    }
    return new NextResponse("Error fetching file", { status: 500 });
  }
}
