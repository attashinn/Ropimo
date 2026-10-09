import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export function getSafeRedirectPath(rawPath: string | null, fallback = "/dashboard"): string {
  if (!rawPath) return fallback;
  // Ensure it's a relative path starting with a single '/' and avoid protocol-relative URLs or backslashes
  if (rawPath.startsWith("/") && !rawPath.startsWith("//") && !rawPath.includes("\\")) {
    return rawPath;
  }
  return fallback;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder-anon-key";

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh auth session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  supabaseResponse.headers.set("x-pathname", pathname);

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

  return supabaseResponse;
}
