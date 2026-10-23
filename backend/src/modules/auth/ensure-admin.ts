import { ConflictError } from "../../errors/app-error";
import { parseOrThrow } from "../../validation/parse-or-throw";
import { registerSchema } from "./auth.schemas";
import type { PasswordHasher } from "./password-hasher";
import type { UserRepository } from "./user.repository";

export interface EnsureAdminResult {
  email: string;
  /** False when the admin already existed and nothing was changed. */
  created: boolean;
}

/**
 * Makes sure an administrator with this email exists. Admins cannot be created
 * through the API, so this is how the first one is made (see src/seed.ts).
 *
 * It is safe to run repeatedly: an existing admin is left exactly as it is,
 * including their password. It never promotes a regular user.
 */
export async function ensureAdmin(
  users: UserRepository,
  hasher: PasswordHasher,
  input: unknown,
): Promise<EnsureAdminResult> {
  // The same email and password rules as registration, so an admin can't be weaker than a user.
  const { email, password } = parseOrThrow(registerSchema, input);

  const existing = await users.findByEmail(email);
  if (existing) {
    if (existing.role !== "ADMIN") {
      throw new ConflictError(`${email} belongs to a regular user; refusing to promote them`, "EMAIL_TAKEN");
    }
    return { email, created: false };
  }

  await users.create({ email, passwordHash: await hasher.hash(password), role: "ADMIN" });
  return { email, created: true };
}
