import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.NEON_DATABASE_URL ||
  "";

// Global pool cache for Next.js hot-reloading in development
declare global {
  // eslint-disable-next-line no-var
  var __neonPool: Pool | undefined;
}

export function getNeonPool(): Pool {
  if (!global.__neonPool) {
    if (!connectionString) {
      throw new Error(
        "[Neon DB] Missing DATABASE_URL or NEON_DATABASE_URL environment variable."
      );
    }
    global.__neonPool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    global.__neonPool.on("error", (err) => {
      console.error("[Neon Pool Error]:", err.message);
    });
  }

  return global.__neonPool;
}

export async function query<R extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<R>> {
  const pool = getNeonPool();
  return pool.query<R>(text, params);
}

export async function getClient(): Promise<PoolClient> {
  const pool = getNeonPool();
  return pool.connect();
}
