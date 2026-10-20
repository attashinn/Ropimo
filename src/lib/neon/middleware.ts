import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./auth";

export function getSafeRedirectPath(rawPath: string | null, fallback = "/dashboard"): string {
  if (!rawPath) return fallback;
  if (rawPath.startsWith("/") && !rawPath.startsWith("//") && !rawPath.includes("\\")) {
    return rawPath;
  }
  return fallback;
}

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });

  const sessionCookie =
    request.cookies.get(SESSION_COOKIE_NAME)?.value ||
    request.cookies.get("sb-access-token")?.value;

  let user = null;
  if (sessionCookie) {
    try {
      user = await verifySessionToken(sessionCookie);
    } catch {
      user = null;
    }
  }

  if (!user) {
    const neonCookie =
      request.cookies.get("__Secure-neon-auth.session_token")?.value ||
      request.cookies.get("neon-auth.session_token")?.value;
    if (neonCookie && neonCookie.length > 10) {
      user = { id: "neon-authenticated" };
    }
  }

  const { pathname } = request.nextUrl;
  response.headers.set("x-pathname", pathname);

  // Block design kit completely in production
  if (
    process.env.NODE_ENV === "production" &&
    (pathname === "/app/kit" ||
      pathname === "/app/_kit" ||
      pathname.startsWith("/app/kit/") ||
      pathname.startsWith("/app/_kit/"))
  ) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const isProtectedPath =
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/app")) &&
    !pathname.startsWith("/app/_kit") &&
    !pathname.startsWith("/app/kit");

  const isAuthOnlyPath =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/signin";

  // Unauthenticated users trying to access protected pages -> redirect to /login?next=...
  if (!user && isProtectedPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Authenticated users trying to access /login or /signup -> redirect to /dashboard
  if (user && isAuthOnlyPath) {
    const nextParam = request.nextUrl.searchParams.get("next");
    const safeTarget = getSafeRedirectPath(nextParam, "/dashboard");
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = safeTarget;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
