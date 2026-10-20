import { NextResponse } from "next/server";
import { query } from "@/lib/neon/db";
import {
  hashPassword,
  signSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/neon/auth";

export async function POST(request: Request) {
  try {
    const { email, password, options } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const checkRes = await query(
      `SELECT id FROM auth.users WHERE email = $1;`,
      [cleanEmail]
    );

    if (checkRes.rows.length > 0) {
      return NextResponse.json(
        { error: "A user with this email address already exists" },
        { status: 400 }
      );
    }

    const encryptedPassword = await hashPassword(password);
    const metadata = options?.data || {};

    const insertRes = await query(
      `INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data, email_confirmed_at)
       VALUES ($1, $2, $3, now())
       RETURNING id, email, raw_user_meta_data, role, created_at;`,
      [cleanEmail, encryptedPassword, JSON.stringify(metadata)]
    );

    const dbUser = insertRes.rows[0];

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
    console.error("[Signup Route Error]:", err);
    return NextResponse.json(
      { error: err.message || "Signup failed" },
      { status: 500 }
    );
  }
}
