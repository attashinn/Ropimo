import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/neon/auth";
import { verifyNeonAuthSession } from "@/lib/neon/neon-session";

export async function GET(request: NextRequest) {
  const token =
    request.cookies.get(SESSION_COOKIE_NAME)?.value ||
    request.cookies.get("sb-access-token")?.value;

  if (token) {
    const user = await verifySessionToken(token);
    if (user) {
      return NextResponse.json({ user });
    }
  }

  const neonToken =
    request.cookies.get("__Secure-neon-auth.session_token")?.value ||
    request.cookies.get("neon-auth.session_token")?.value;

  if (neonToken) {
    const user = await verifyNeonAuthSession(neonToken);
    if (user) {
      return NextResponse.json({ user });
    }
  }

  return NextResponse.json({ user: null }, { status: 401 });
}
