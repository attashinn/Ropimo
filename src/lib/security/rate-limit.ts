import "server-only";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory sliding window cache
const memoryStore = new Map<string, RateLimitRecord>();

// Cleanup stale keys every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      if (record.resetAt <= now) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitOptions {
  intervalSeconds: number;
  maxRequests: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for a specific identifier (e.g. client IP + action namespace).
 * Uses Upstash REST if configured in env, or memoryStore sliding window.
 */
export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { intervalSeconds: 60, maxRequests: 10 }
): Promise<RateLimitResult> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // 1. Try Upstash Redis if environment credentials exist
  if (upstashUrl && upstashToken) {
    try {
      const key = `ratelimit:${identifier}`;
      const res = await fetch(`${upstashUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", key],
          ["EXPIRE", key, options.intervalSeconds, "NX"],
          ["TTL", key],
        ]),
      });

      if (res.ok) {
        const data = await res.json();
        const currentCount = Number(data[0]?.result || 1);
        const ttl = Number(data[2]?.result || options.intervalSeconds);
        const remaining = Math.max(0, options.maxRequests - currentCount);

        return {
          success: currentCount <= options.maxRequests,
          remaining,
          reset: Date.now() + ttl * 1000,
        };
      }
    } catch (err) {
      console.warn("[RateLimit] Upstash call failed, falling back to memory store:", err);
    }
  }

  // 2. Sliding Window In-Memory Fallback
  const now = Date.now();
  const existing = memoryStore.get(identifier);

  if (!existing || existing.resetAt <= now) {
    const record: RateLimitRecord = {
      count: 1,
      resetAt: now + options.intervalSeconds * 1000,
    };
    memoryStore.set(identifier, record);
    return {
      success: true,
      remaining: options.maxRequests - 1,
      reset: record.resetAt,
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, options.maxRequests - existing.count);

  return {
    success: existing.count <= options.maxRequests,
    remaining,
    reset: existing.resetAt,
  };
}

/**
 * Helper to extract client IP from Next.js request headers
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  return "127.0.0.1";
}
