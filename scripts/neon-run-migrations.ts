import fs from "fs";
import path from "path";
import { Client } from "pg";

const NEON_CONNECTION_STRING = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || "";

async function runMigrations() {
  if (!NEON_CONNECTION_STRING) {
    throw new Error("Missing DATABASE_URL or NEON_DATABASE_URL environment variable.");
  }
  const client = new Client({
    connectionString: NEON_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to Neon DB.");

  await client.query(`
    CREATE TABLE IF NOT EXISTS public._migrations_history (
      name TEXT PRIMARY KEY,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
    );
  `);

  const executedResult = await client.query("SELECT name FROM public._migrations_history;");
  const executedSet = new Set(executedResult.rows.map((r: { name: string }) => r.name));

  const migrationsDir = path.join(__dirname, "../supabase/migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`Found ${files.length} migration files in total.`);

  for (const file of files) {
    if (executedSet.has(file)) {
      console.log(`SKIP (already executed): ${file}`);
      continue;
    }

    console.log(`\n--- Running migration: ${file} ---`);
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, "utf-8");

    try {
      await client.query("BEGIN;");
      await client.query(sql);
      await client.query("INSERT INTO public._migrations_history (name) VALUES ($1);", [file]);
      await client.query("COMMIT;");
      console.log(`SUCCESS: ${file}`);
    } catch (err: any) {
      await client.query("ROLLBACK;");
      console.error(`ERROR in ${file}:`, err.message);
      throw err;
    }
  }

  console.log("\nAll pending migrations processed successfully!");
  await client.end();
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
