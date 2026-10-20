import { NextResponse } from "next/server";
import { query } from "@/lib/neon/db";
import {
  comparePassword,
  signSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/neon/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const res = await query(
      `SELECT id, email, encrypted_password, raw_user_meta_data, role FROM auth.users WHERE email = $1;`,
      [cleanEmail]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid login credentials" },
        { status: 400 }
      );
    }

    const dbUser = res.rows[0];
    const passwordMatch = await comparePassword(
      password,
      dbUser.encrypted_password || ""
    );

    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid login credentials" },
        { status: 400 }
      );
    }

    const sessionUser = {
      id: dbUser.id,
      email: dbUser.email,
      user_metadata: dbUser.raw_user_meta_data || {},
      role: dbUser.role || "authenticated",
    };

    const token = await signSessionToken(sessionUser);

    const response = NextResponse.json({
      user: sessionUser,
      session: {
        access_token: token,
        user: sessionUser,
      },
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    };

    response.cookies.set(SESSION_COOKIE_NAME, token, cookieOptions);
    response.cookies.set("sb-access-token", token, cookieOptions);

    return response;
  } catch (err: any) {
    console.error("[Login Route Error]:", err);
    return NextResponse.json(
      { error: err.message || "Login failed" },
      { status: 500 }
    );
  }
}
