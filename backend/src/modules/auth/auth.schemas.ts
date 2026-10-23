import { z } from "zod";

/** bcrypt ignores everything past 72 bytes, so longer passwords would be silently truncated. */
const MAX_PASSWORD_BYTES = 72;
const MAX_EMAIL_LENGTH = 254;

const withinBcryptLimit = (password: string) => new TextEncoder().encode(password).length <= MAX_PASSWORD_BYTES;
const bcryptLimitMessage = { message: `Password must be at most ${MAX_PASSWORD_BYTES} bytes` };

/** Unknown keys, such as a client-supplied `role`, are dropped rather than passed along. */
export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().max(MAX_EMAIL_LENGTH).pipe(z.email()),
  password: z.string().min(8, "Password must be at least 8 characters").refine(withinBcryptLimit, bcryptLimitMessage),
});

/**
 * Logging in does not re-check the password rules or the email format: a wrong
 * value is simply "invalid credentials". The byte limit still applies, because
 * bcrypt would otherwise truncate an over-long password into a match.
 */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Email is required").max(MAX_EMAIL_LENGTH),
  password: z.string().min(1, "Password is required").refine(withinBcryptLimit, bcryptLimitMessage),
});
