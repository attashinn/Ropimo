import { cookies } from "next/headers";
import { query } from "./db";
import { QueryBuilder, QueryData } from "./query-builder";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  hashPassword,
  SessionUser,
} from "./auth";
import { verifyNeonAuthSession } from "./neon-session";

export interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata: Record<string, any>;
  role?: string;
  created_at?: string;
  email_confirmed_at?: string | null;
  app_metadata?: Record<string, any>;
}

export interface SupabaseAuthResponse {
  data: {
    user: SupabaseUser | null;
    session?: any;
  };
  error: { message: string; code?: string } | null;
}

export interface NeonSupabaseClient {
  auth: {
    getUser(): Promise<SupabaseAuthResponse>;
    signOut(): Promise<{ error: null }>;
    updateUser(attributes: {
      password?: string;
      data?: Record<string, any>;
    }): Promise<SupabaseAuthResponse>;
    resetPasswordForEmail(
      email: string,
      options?: any
    ): Promise<{ data: any; error: any }>;
    signInWithPassword(credentials: {
      email: string;
      password: string;
    }): Promise<SupabaseAuthResponse>;
    signUp(credentials: {
      email: string;
      password: string;
      options?: any;
    }): Promise<SupabaseAuthResponse>;
    exchangeCodeForSession(
      code: string
    ): Promise<{ data: { session: any; user: SupabaseUser | null }; error: any }>;
    signInWithOAuth(params: any): Promise<{ data: any; error: any }>;
    signInWithOtp(params: { email: string; options?: any }): Promise<{ data: any; error: any }>;
  };
  from<T = any[]>(table: string): QueryBuilder<T>;
  rpc<T = any>(
    fnName: string,
    args?: Record<string, any>
  ): Promise<{ data: T | null; error: any }>;
}

export interface NeonAdminClient {
  auth: {
    admin: {
      createUser(params: {
        email: string;
        password?: string;
        user_metadata?: Record<string, any>;
        email_confirm?: boolean;
      }): Promise<{ data: { user: SupabaseUser | null }; error: any }>;
      getUserById(
        userId: string
      ): Promise<{ data: { user: SupabaseUser | null }; error: any }>;
      updateUserById(
        userId: string,
        attributes: {
          user_metadata?: Record<string, any>;
          password?: string;
          email?: string;
          email_confirm?: boolean;
        }
      ): Promise<{ data: { user: SupabaseUser | null }; error: any }>;
      deleteUser(userId: string): Promise<{ data: null; error: any }>;
      listUsers(): Promise<{ data: { users: SupabaseUser[] }; error: any }>;
    };
  };
  from<T = any[]>(table: string): QueryBuilder<T>;
  rpc<T = any>(
    fnName: string,
    args?: Record<string, any>
  ): Promise<{ data: T | null; error: any }>;
}

/**
 * Server client for authenticated requests
 */
export async function createServerClient(): Promise<NeonSupabaseClient> {
  let user: SupabaseUser | null = null;

  try {
    const cookieStore = await cookies();
    const sessionCookie =
      cookieStore.get(SESSION_COOKIE_NAME)?.value ||
      cookieStore.get("sb-access-token")?.value;

    if (sessionCookie) {
      const verified = await verifySessionToken(sessionCookie);
      if (verified) {
        user = {
          id: verified.id,
          email: verified.email,
          user_metadata: verified.user_metadata || {},
          role: verified.role || "authenticated",
        };
      }
    }

    if (!user) {
      const neonAuthCookie =
        cookieStore.get("__Secure-neon-auth.session_token")?.value ||
        cookieStore.get("neon-auth.session_token")?.value;

      if (neonAuthCookie) {
        const verifiedNeon = await verifyNeonAuthSession(neonAuthCookie);
        if (verifiedNeon) {
          user = {
            id: verifiedNeon.id,
            email: verifiedNeon.email,
            user_metadata: verifiedNeon.user_metadata || {},
            role: verifiedNeon.role || "authenticated",
          };
        }
      }
    }
  } catch {
    // Context where cookies are not available
  }

  return {
    auth: {
      async getUser(): Promise<SupabaseAuthResponse> {
        if (!user) {
          return { data: { user: null }, error: { message: "Not authenticated" } };
        }
        return { data: { user }, error: null };
      },
      async signOut() {
        try {
          const cookieStore = await cookies();
          cookieStore.delete(SESSION_COOKIE_NAME);
          cookieStore.delete("sb-access-token");
          cookieStore.delete("sb-refresh-token");
          cookieStore.delete("__Secure-neon-auth.session_token");
          cookieStore.delete("neon-auth.session_token");
        } catch {}
        return { error: null };
      },
      async updateUser(attributes) {
        if (!user) {
          return { data: { user: null }, error: { message: "Not authenticated" } };
        }
        try {
          if (attributes.password) {
            const hashed = await hashPassword(attributes.password);
            await query(
              `UPDATE auth.users SET encrypted_password = $1, updated_at = now() WHERE id = $2;`,
              [hashed, user.id]
            );
          }
          if (attributes.data) {
            await query(
              `UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || $1::jsonb, updated_at = now() WHERE id = $2;`,
              [JSON.stringify(attributes.data), user.id]
            );
            user.user_metadata = { ...user.user_metadata, ...attributes.data };
          }
          return { data: { user }, error: null };
        } catch (err: any) {
          return { data: { user: null }, error: { message: err.message } };
        }
      },
      async resetPasswordForEmail(email) {
        return { data: { success: true }, error: null };
      },
      async signInWithPassword({ email, password }) {
        try {
          const res = await query(
            `SELECT id, email, encrypted_password, raw_user_meta_data, role FROM auth.users WHERE email = $1;`,
            [email.toLowerCase().trim()]
          );
          if (res.rows.length === 0) {
            return { data: { user: null }, error: { message: "Invalid credentials" } };
          }
          return {
            data: {
              user: {
                id: res.rows[0].id,
                email: res.rows[0].email,
                user_metadata: res.rows[0].raw_user_meta_data || {},
              },
            },
            error: null,
          };
        } catch (err: any) {
          return { data: { user: null }, error: { message: err.message } };
        }
      },
      async signUp({ email, password, options }) {
        try {
          const encrypted = await hashPassword(password);
          const res = await query(
            `INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data, email_confirmed_at)
             VALUES ($1, $2, $3, now())
             RETURNING id, email, raw_user_meta_data, role;`,
            [email.toLowerCase().trim(), encrypted, JSON.stringify(options?.data || {})]
          );
          return {
            data: {
              user: {
                id: res.rows[0].id,
                email: res.rows[0].email,
                user_metadata: res.rows[0].raw_user_meta_data || {},
              },
            },
            error: null,
          };
        } catch (err: any) {
          return { data: { user: null }, error: { message: err.message } };
        }
      },
      async exchangeCodeForSession(code) {
        return { data: { session: null, user }, error: null };
      },
      async signInWithOAuth(params: { provider: string; options?: { redirectTo?: string } }) {
        const neonAuthUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL || process.env.NEON_AUTH_URL;
        if (neonAuthUrl && params.provider === "google") {
          try {
            const callbackURL = params.options?.redirectTo || "http://localhost:3000/auth/callback";
            const res = await fetch(`${neonAuthUrl}/sign-in/social`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ provider: "google", callbackURL }),
            });
            const data = await res.json();
            if (data?.url) {
              if (typeof window !== "undefined") {
                window.location.href = data.url;
              }
              return { data: { provider: "google", url: data.url }, error: null };
            }
          } catch (err: any) {
            return { data: null, error: { message: err.message } };
          }
        }
        return { data: null, error: { message: "OAuth provider not configured" } };
      },
      async signInWithOtp(params: { email: string; options?: any }) {
        return { data: { success: true }, error: null };
      },
    },
    from<T = QueryData[]>(table: string): QueryBuilder<T> {
      return new QueryBuilder<T>(table);
    },
    async rpc<T = any>(fnName: string, args: Record<string, any> = {}) {
      try {
        const keys = Object.keys(args);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
        const params = keys.map((k) => args[k]);
        const sql = `SELECT * FROM public.${fnName}(${placeholders});`;
        const res = await query(sql, params);
        return { data: (res.rows[0]?.result ?? res.rows) as T, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err.message } };
      }
    },
  };
}

/**
 * Admin client with full database access
 */
export function createAdminClient(): NeonAdminClient {
  return {
    auth: {
      admin: {
        async createUser(params) {
          try {
            const encryptedPassword = params.password
              ? await hashPassword(params.password)
              : null;

            const res = await query(
              `INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data, email_confirmed_at)
               VALUES ($1, $2, $3, CASE WHEN $4::boolean THEN now() ELSE null END)
               RETURNING id, email, raw_user_meta_data, created_at;`,
              [
                params.email.toLowerCase().trim(),
                encryptedPassword,
                JSON.stringify(params.user_metadata || {}),
                params.email_confirm ?? true,
              ]
            );

            const row = res.rows[0];
            const user: SupabaseUser = {
              id: row.id,
              email: row.email,
              user_metadata: row.raw_user_meta_data || {},
              created_at: row.created_at,
            };

            return { data: { user }, error: null };
          } catch (err: any) {
            return { data: { user: null }, error: { message: err.message } };
          }
        },
        async getUserById(userId: string) {
          try {
            const res = await query(
              `SELECT id, email, raw_user_meta_data, created_at FROM auth.users WHERE id = $1;`,
              [userId]
            );
            if (res.rows.length === 0) {
              return { data: { user: null }, error: { message: "User not found" } };
            }
            const row = res.rows[0];
            return {
              data: {
                user: {
                  id: row.id,
                  email: row.email,
                  user_metadata: row.raw_user_meta_data || {},
                  created_at: row.created_at,
                },
              },
              error: null,
            };
          } catch (err: any) {
            return { data: { user: null }, error: { message: err.message } };
          }
        },
        async updateUserById(userId, attributes) {
          try {
            if (attributes.password) {
              const hashed = await hashPassword(attributes.password);
              await query(
                `UPDATE auth.users SET encrypted_password = $1, updated_at = now() WHERE id = $2;`,
                [hashed, userId]
              );
            }
            if (attributes.user_metadata) {
              await query(
                `UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || $1::jsonb, updated_at = now() WHERE id = $2;`,
                [JSON.stringify(attributes.user_metadata), userId]
              );
            }
            if (attributes.email) {
              await query(
                `UPDATE auth.users SET email = $1, updated_at = now() WHERE id = $2;`,
                [attributes.email.toLowerCase().trim(), userId]
              );
            }
            const updatedUser = await this.getUserById(userId);
            return updatedUser;
          } catch (err: any) {
            return { data: { user: null }, error: { message: err.message } };
          }
        },
        async deleteUser(userId: string) {
          try {
            await query(`DELETE FROM auth.users WHERE id = $1;`, [userId]);
            return { data: null, error: null };
          } catch (err: any) {
            return { data: null, error: { message: err.message } };
          }
        },
        async listUsers() {
          try {
            const res = await query(
              `SELECT id, email, raw_user_meta_data, created_at FROM auth.users ORDER BY created_at DESC LIMIT 100;`
            );
            const users = res.rows.map((row) => ({
              id: row.id,
              email: row.email,
              user_metadata: row.raw_user_meta_data || {},
              created_at: row.created_at,
            }));
            return { data: { users }, error: null };
          } catch (err: any) {
            return { data: { users: [] }, error: { message: err.message } };
          }
        },
      },
    },
    from<T = QueryData[]>(table: string): QueryBuilder<T> {
      return new QueryBuilder<T>(table);
    },
    async rpc<T = any>(fnName: string, args: Record<string, any> = {}) {
      try {
        const keys = Object.keys(args);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
        const params = keys.map((k) => args[k]);
        const sql = `SELECT * FROM public.${fnName}(${placeholders});`;
        const res = await query(sql, params);
        return { data: (res.rows[0]?.result ?? res.rows) as T, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err.message } };
      }
    },
  };
}
