import bcrypt from "bcryptjs";

export interface SessionUser {
  id: string;
  email: string;
  user_metadata: Record<string, any>;
  role?: string;
}

export const SESSION_COOKIE_NAME = "app_session";

const SECRET =
  process.env.SESSION_SECRET ||
  process.env.CRON_SECRET ||
  "neon-super-secret-default-key-32-chars-long";

// Helper to base64url encode and decode
function base64UrlEncode(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str).toString("base64url");
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "base64url").toString("utf-8");
  }
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return atob(str);
}

async function getHmacKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Sign a session token containing the user's ID, email, and metadata.
 */
export async function signSessionToken(user: SessionUser): Promise<string> {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadData = {
    sub: user.id,
    email: user.email,
    user_metadata: user.user_metadata || {},
    role: user.role || "authenticated",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
  };
  const payload = base64UrlEncode(JSON.stringify(payloadData));
  const dataToSign = `${header}.${payload}`;

  const key = await getHmacKey();
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(dataToSign)
  );

  const signature = base64UrlEncode(
    String.fromCharCode(...new Uint8Array(signatureBuffer))
  );

  return `${dataToSign}.${signature}`;
}

/**
 * Verify a session token and return the payload if valid.
 */
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const dataToSign = `${header}.${payload}`;

  try {
    const key = await getHmacKey();
    const sigBytes = Uint8Array.from(base64UrlDecode(signature), (c) =>
      c.charCodeAt(0)
    );

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(dataToSign)
    );

    if (!isValid) return null;

    const parsed = JSON.parse(base64UrlDecode(payload));
    if (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return {
      id: parsed.sub,
      email: parsed.email,
      user_metadata: parsed.user_metadata || {},
      role: parsed.role || "authenticated",
    };
  } catch {
    return null;
  }
}

/**
 * Hash a password using bcrypt.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

/**
 * Compare plain password with bcrypt hash.
 */
export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

