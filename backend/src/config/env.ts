import { z } from "zod";

/** How the example secret in .env.example begins. It is public, so anyone could forge tokens signed with it. */
const PLACEHOLDER_SECRET_PREFIX = "replace-me";

/** The origin a browser sends for a page at this address, or undefined if the entry is not a bare http(s) origin. */
function toOrigin(entry: string): string | undefined {
  try {
    const url = new URL(entry);
    const bare = entry.replace(/\/+$/, "").toLowerCase();
    return (url.protocol === "http:" || url.protocol === "https:") && url.origin === bare ? url.origin : undefined;
  } catch {
    return undefined;
  }
}

/** Comma-separated origins, such as "https://app.vercel.app,http://localhost:5173"; unset or blank means none. */
const corsOriginsSchema = z
  .string()
  .optional()
  .transform((value, ctx) => {
    const origins = new Set<string>();
    for (const entry of (value ?? "").split(",").map((part) => part.trim()).filter(Boolean)) {
      const origin = toOrigin(entry);
      if (origin === undefined) {
        // The entry is left out of the message, as with every setting here.
        ctx.addIssue({
          code: "custom",
          message: 'must list origins like "https://app.example.com" (scheme and host, no path), separated by commas',
        });
        return z.NEVER;
      }
      origins.add(origin);
    }
    return [...origins];
  });

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
  CORS_ORIGIN: corsOriginsSchema,
});

export interface AppConfig {
  databaseUrl: string;
  port: number;
  jwtSecret: string;
  jwtExpiresIn: string;
  /** Sites allowed to call the API from a browser; empty when the page and API share an origin. */
  corsOrigins: string[];
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
  const { DATABASE_URL, PORT, JWT_SECRET, JWT_EXPIRES_IN, CORS_ORIGIN } = result.data;
  return {
    databaseUrl: DATABASE_URL,
    port: PORT,
    jwtSecret: JWT_SECRET,
    jwtExpiresIn: JWT_EXPIRES_IN,
    corsOrigins: CORS_ORIGIN,
  };
}
