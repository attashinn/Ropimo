import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().optional(),
  NEON_DATABASE_URL: z.string().optional(),
  SESSION_SECRET: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().default(process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "neon-anon-key"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // Storage (Cloudflare R2)
  CLOUDFLARE_R2_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_R2_BUCKET_NAME: z.string().optional(),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().optional(),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().optional(),
  CLOUDFLARE_R2_ENDPOINT: z.string().optional(),
  NEXT_PUBLIC_R2_PUBLIC_URL: z.string().optional(),

  // Bot protection & rate limit
  TURNSTILE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().default(process.env.RESEND_FROM_EMAIL || "Zambic <invite@testing.brnnd.com>"),
  RESEND_FROM_EMAIL: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  EMAIL_MODE: z.enum(["resend", "outbox"]).default("resend"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),

  // Cloudflare AI
  CLOUDFLARE_AI_TOKEN: z.string().optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),

  // OpenRouter & ElevenLabs
  OPENROUTER_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),

  // Neon Auth (Hosted Better Auth on Neon)
  NEON_AUTH_URL: z.string().optional(),
  NEXT_PUBLIC_NEON_AUTH_URL: z.string().optional(),
  NEON_AUTH_JWKS_URL: z.string().optional(),
});

function parseEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.warn("⚠️ Warning: Environment variable validation:", parsed.error.flatten().fieldErrors);
    return process.env as unknown as z.infer<typeof envSchema>;
  }

  return parsed.data;
}

export const env = parseEnv();
