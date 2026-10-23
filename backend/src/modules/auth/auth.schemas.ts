import { z } from "zod";

/** bcrypt ignores everything past 72 bytes, so longer passwords would be silently truncated. */
const MAX_PASSWORD_BYTES = 72;
const MAX_EMAIL_LENGTH = 254;

/** Unknown keys, such as a client-supplied `role`, are dropped rather than passed along. */
export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().max(MAX_EMAIL_LENGTH).pipe(z.email()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .refine((password) => new TextEncoder().encode(password).length <= MAX_PASSWORD_BYTES, {
      message: `Password must be at most ${MAX_PASSWORD_BYTES} bytes`,
    }),
});

export type RegisterInput = z.output<typeof registerSchema>;
