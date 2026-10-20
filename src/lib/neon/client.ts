class BrowserQueryBuilder<T = any[]> implements PromiseLike<{ data: T; error: any; count: number | null }> {
  private tableName: string;
  private operation = "SELECT";
  private selectColumns = "*";
  private whereList: { col: string; op: string; val: any }[] = [];
  private limitCount?: number;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns = "*"): this {
    this.selectColumns = columns;
    return this;
  }

  eq(column: string, value: any): this {
    this.whereList.push({ col: column, op: "eq", val: value });
    return this;
  }

  neq(column: string, value: any): this {
    this.whereList.push({ col: column, op: "neq", val: value });
    return this;
  }

  in(column: string, values: any[]): this {
    this.whereList.push({ col: column, op: "in", val: values });
    return this;
  }

  is(column: string, value: any): this {
    this.whereList.push({ col: column, op: "is", val: value });
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  single(): Promise<{ data: any; error: any; count: number | null }> {
    this.limitCount = 1;
    return this.execute().then((res) => ({
      ...res,
      data: Array.isArray(res.data) ? res.data[0] || null : res.data,
    }));
  }

  maybeSingle(): Promise<{ data: any; error: any; count: number | null }> {
    this.limitCount = 1;
    return this.execute().then((res) => ({
      ...res,
      data: Array.isArray(res.data) ? res.data[0] || null : res.data,
    }));
  }

  async execute(): Promise<{ data: T; error: any; count: number | null }> {
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: this.tableName,
          operation: this.operation,
          columns: this.selectColumns,
          where: this.whereList,
          limit: this.limitCount,
        }),
      });
      return await res.json();
    } catch (err: any) {
      return { data: [] as unknown as T, error: { message: err.message }, count: null };
    }
  }

  then<TResult1 = { data: T; error: any; count: number | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: T; error: any; count: number | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export function createClient() {
  return {
    auth: {
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        try {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const json = await res.json();
          if (!res.ok) {
            return {
              data: { user: null, session: null },
              error: { message: json.error || "Login failed" },
            };
          }
          return { data: { user: json.user, session: json.session }, error: null };
        } catch (err: any) {
          return {
            data: { user: null, session: null },
            error: { message: err.message || "Network error" },
          };
        }
      },

      async signUp({
        email,
        password,
        options,
      }: {
        email: string;
        password: string;
        options?: { data?: Record<string, any>; emailRedirectTo?: string };
      }) {
        try {
          const res = await fetch("/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, options }),
          });
          const json = await res.json();
          if (!res.ok) {
            return {
              data: { user: null, session: null },
              error: { message: json.error || "Signup failed" },
            };
          }
          return { data: { user: json.user, session: json.session }, error: null };
        } catch (err: any) {
          return {
            data: { user: null, session: null },
            error: { message: err.message || "Network error" },
          };
        }
      },

      async signOut() {
        try {
          await fetch("/api/auth/signout", { method: "POST" });
        } catch {}
        return { error: null };
      },

      async getUser() {
        try {
          const res = await fetch("/api/auth/user");
          if (!res.ok) {
            return { data: { user: null }, error: { message: "Unauthorized" } };
          }
          const json = await res.json();
          return { data: { user: json.user }, error: null };
        } catch (err: any) {
          return { data: { user: null }, error: { message: err.message } };
        }
      },

      async updateUser({ password }: { password?: string }) {
        try {
          const res = await fetch("/api/auth/update-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          });
          const json = await res.json();
          if (!res.ok) {
            return { data: { user: null }, error: { message: json.error || "Update failed" } };
          }
          return { data: { user: json.user }, error: null };
        } catch (err: any) {
          return { data: { user: null }, error: { message: err.message } };
        }
      },

      async resetPasswordForEmail(email: string, options?: any) {
        try {
          await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, options }),
          });
          return { data: {}, error: null };
        } catch (err: any) {
          return { data: {}, error: { message: err.message } };
        }
      },

      async resend({ email }: { type?: string; email: string; options?: any }) {
        return { data: {}, error: null };
      },

      async signInWithOAuth(params: { provider: string; options?: { redirectTo?: string } }) {
        const neonAuthUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL || "";
        if (params.provider === "google") {
          try {
            const origin = typeof window !== "undefined" ? window.location.origin : "";
            const callbackURL = params.options?.redirectTo || `${origin}/auth/callback`;
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
            return { data: null, error: { message: data?.message || "Failed to initialize Google sign-in" } };
          } catch (err: any) {
            return { data: null, error: { message: err.message || "Network error" } };
          }
        }
        return { data: null, error: { message: `OAuth provider ${params.provider} is not supported.` } };
      },

      onAuthStateChange() {
        return {
          data: {
            subscription: {
              unsubscribe: () => {},
            },
          },
        };
      },
    },

    from<T = any[]>(table: string) {
      return new BrowserQueryBuilder<T>(table);
    },
  };
}
