import { z } from "zod";

/**
 * Environment is validated lazily (on first use) rather than at import time so
 * that `next build` and unit tests of pure logic never crash on a missing var.
 * Call `loadEnv()` at the I/O edge (route handlers, pipeline construction).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Postgres in production; SQLite file for local/dev. One string to switch.
  DATABASE_URL: z.string().min(1).default("file:./dev.db"),

  // Shared secret the intake caller must present (Authorization: Bearer <secret>).
  INTAKE_SHARED_SECRET: z.string().min(16, "INTAKE_SHARED_SECRET must be >= 16 chars"),

  // Reviewer dashboard login.
  DASHBOARD_PASSWORD: z.string().min(8, "DASHBOARD_PASSWORD must be >= 8 chars"),
  // Used to sign session cookies (HMAC).
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be >= 16 chars"),

  // Extraction provider keys. Precedence: OpenAI, then Anthropic, then the
  // deterministic mock extractor (dev/test only) if neither key is set.
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o"),

  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-6"),

  // Below this overall extraction confidence a submission is sent to manual
  // review rather than auto-approved/rejected. 0..1.
  CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.7),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Test-only: clear the memoised env so a test can re-run validation. */
export function resetEnvForTests(): void {
  cached = null;
}
