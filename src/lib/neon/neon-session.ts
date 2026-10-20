import { query } from "./db";
import { SessionUser } from "./auth";

/**
 * Verify a session from Neon Auth (Better Auth) by looking up neon_auth.session in database.
 * Server-only: requires database access.
 */
export async function verifyNeonAuthSession(rawToken: string): Promise<SessionUser | null> {
  if (!rawToken || typeof rawToken !== "string") return null;
  const cleanToken = decodeURIComponent(rawToken).split(".")[0];

  try {
    const res = await query(
      `SELECT s."userId", u.email, u.name, u.image, s."expiresAt"
       FROM neon_auth.session s
       JOIN neon_auth.user u ON s."userId" = u.id
       WHERE (s.token = $1 OR s.token = $2) AND s."expiresAt" > now()
       LIMIT 1;`,
      [rawToken, cleanToken]
    );

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      id: row.userId,
      email: row.email,
      user_metadata: {
        full_name: row.name,
        avatar_url: row.image,
      },
      role: "authenticated",
    };
  } catch (err) {
    console.warn("verifyNeonAuthSession lookup error:", err);
    return null;
  }
}
