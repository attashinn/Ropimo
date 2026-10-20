import { Client } from "pg";

const NEON_CONNECTION_STRING = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || "";

async function setup() {
  if (!NEON_CONNECTION_STRING) {
    throw new Error("Missing DATABASE_URL or NEON_DATABASE_URL environment variable.");
  }
  const client = new Client({
    connectionString: NEON_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to Neon DB successfully.");

  const initSql = `
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE SCHEMA IF NOT EXISTS auth;

    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE,
      encrypted_password TEXT,
      email_confirmed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
      raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
      raw_app_meta_data JSONB DEFAULT '{}'::jsonb,
      role TEXT DEFAULT 'authenticated',
      created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
      last_sign_in_at TIMESTAMPTZ
    );

    CREATE OR REPLACE FUNCTION auth.uid()
    RETURNS UUID AS $$
    BEGIN
      RETURN NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql STABLE;

    CREATE OR REPLACE FUNCTION auth.role()
    RETURNS TEXT AS $$
    BEGIN
      RETURN COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'authenticated');
    EXCEPTION WHEN OTHERS THEN
      RETURN 'authenticated';
    END;
    $$ LANGUAGE plpgsql STABLE;

    CREATE OR REPLACE FUNCTION auth.jwt()
    RETURNS JSONB AS $$
    BEGIN
      RETURN COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::JSONB;
    EXCEPTION WHEN OTHERS THEN
      RETURN '{}'::JSONB;
    END;
    $$ LANGUAGE plpgsql STABLE;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Role creation skipped or already exists: %', SQLERRM;
    END $$;

    GRANT USAGE ON SCHEMA public TO authenticated, anon;
    GRANT USAGE ON SCHEMA auth TO authenticated, anon;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
  `;

  await client.query(initSql);
  console.log("Foundation auth schema, functions, and roles created successfully.");

  await client.end();
}

setup().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
