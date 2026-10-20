import { NextResponse } from "next/server";
import { query } from "@/lib/neon/db";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const res = await query(
      `SELECT id FROM auth.users WHERE email = $1;`,
      [email.toLowerCase().trim()]
    );

    if (res.rows.length === 0) {
      // Don't leak existence, return success
      return NextResponse.json({ success: true });
    }

    // In local development or production without SMTP, log password reset request
    console.log(`[Neon Auth]: Password reset requested for ${email}`);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Reset password request failed" },
      { status: 500 }
    );
  }
}
