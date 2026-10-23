import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  // Short secrets can be brute-forced offline from any token, so refuse to start with one.
  JWT_SECRET: z.string().min(32, "must be at least 32 characters"),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, "must be a number followed by s, m, h or d, such as 30m or 1h")
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
