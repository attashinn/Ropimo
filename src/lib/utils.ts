import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to conditionally combine class names with tailwind-merge.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Strip HTML tags and decode basic HTML entities for clean plain-text summaries
 */
export function stripHtml(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolves the public application URL for emails, invites, notifications, and redirects.
 * Automatically resolves https://ropimo.vercel.app in production/Vercel instead of localhost.
 */
export function getAppUrl(requestHeaders?: Headers | null): string {
  // Check client-side browser environment
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }

  // Check incoming request headers if provided
  if (requestHeaders) {
    const origin = requestHeaders.get("origin");
    if (origin && !origin.includes("localhost") && !origin.includes("127.0.0.1")) {
      return origin.replace(/\/$/, "");
    }
    const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      const proto = requestHeaders.get("x-forwarded-proto") || "https";
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  }

  // Configured environment variables
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  // Vercel system environment variables
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  // Production or Vercel preview fallback
  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    return "https://app.zambic.com";
  }

  // Local development fallback
  return "http://localhost:3000";
}

