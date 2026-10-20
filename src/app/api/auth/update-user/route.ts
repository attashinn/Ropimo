import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/neon/db";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  hashPassword,
} from "@/lib/neon/auth";

export async function POST(request: NextRequest) {
  try {
    const token =
      request.cookies.get(SESSION_COOKIE_NAME)?.value ||
      request.cookies.get("sb-access-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionUser = await verifySessionToken(token);
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { password } = await request.json();
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const encrypted = await hashPassword(password);
    await query(
      `UPDATE auth.users SET encrypted_password = $1, updated_at = now() WHERE id = $2;`,
      [encrypted, sessionUser.id]
    );

    return NextResponse.json({ user: sessionUser });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update user" },
      { status: 500 }
    );
  }
}
