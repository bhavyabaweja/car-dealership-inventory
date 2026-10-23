import { z } from "zod";

/** How the example secret in .env.example begins. It is public, so anyone could forge tokens signed with it. */
const PLACEHOLDER_SECRET_PREFIX = "replace-me";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  // Short or published secrets let anyone forge a token, so refuse to start with one.
  JWT_SECRET: z
    .string()
    .min(32, "must be at least 32 characters")
    .refine((secret) => !secret.startsWith(PLACEHOLDER_SECRET_PREFIX), {
      message: "is still the placeholder from .env.example; generate a real secret",
    }),
  // Positive only: a zero lifetime would issue tokens that are already expired.
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^[1-9]\d*[smhd]$/, "must be a positive number followed by s, m, h or d, such as 30m or 1h")
    .default("1h"),
});

export interface AppConfig {
  databaseUrl: string;
  port: number;
  jwtSecret: string;
  jwtExpiresIn: string;
}

/**
 * Validates the environment once at startup so misconfiguration fails fast.
 * Error messages name the setting but never include its value.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${problems.join("\n")}`);
  }
  const { DATABASE_URL, PORT, JWT_SECRET, JWT_EXPIRES_IN } = result.data;
  return { databaseUrl: DATABASE_URL, port: PORT, jwtSecret: JWT_SECRET, jwtExpiresIn: JWT_EXPIRES_IN };
}
