import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/neon/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };

  response.cookies.delete(SESSION_COOKIE_NAME);
  response.cookies.delete("sb-access-token");
  response.cookies.delete("sb-refresh-token");

  return response;
}
