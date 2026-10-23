import { ConflictError } from "../../errors/app-error";
import { parseOrThrow } from "../../validation/parse-or-throw";
import { registerSchema } from "./auth.schemas";
import type { PasswordHasher } from "./password-hasher";
import { EmailAlreadyExistsError, type Role, type UserRepository } from "./user.repository";

/** The public view of a user: never includes the password hash. */
export interface RegisteredUser {
  id: string;
  email: string;
  role: Role;
}

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  /**
   * Registers a new user. Anyone registering through the API is a USER; admins
   * are created out of band (seed script), never by the caller's request.
   */
  async register(input: unknown): Promise<RegisteredUser> {
    const { email, password } = parseOrThrow(registerSchema, input);
    const passwordHash = await this.hasher.hash(password);

    try {
      const user = await this.users.create({ email, passwordHash, role: "USER" });
      return { id: user.id, email: user.email, role: user.role };
    } catch (error) {
      // Rely on the database's uniqueness guarantee instead of check-then-insert,
      // which two concurrent registrations could both pass.
      if (error instanceof EmailAlreadyExistsError) {
        throw new ConflictError("A user with this email already exists", "EMAIL_TAKEN");
      }
      throw error;
    }
  }
}
