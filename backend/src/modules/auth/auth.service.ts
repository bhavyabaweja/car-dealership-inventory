import { randomBytes } from "node:crypto";
import { ConflictError, UnauthorizedError } from "../../errors/app-error";
import { parseOrThrow } from "../../validation/parse-or-throw";
import { loginSchema, registerSchema } from "./auth.schemas";
import type { PasswordHasher } from "./password-hasher";
import type { TokenService } from "./token-service";
import { EmailAlreadyExistsError, type Role, type User, type UserRepository } from "./user.repository";

/** The public view of a user: never includes the password hash. */
export interface PublicUser {
  id: string;
  email: string;
  role: Role;
}

export interface LoginResult {
  token: string;
  user: PublicUser;
}

function toPublicUser({ id, email, role }: User): PublicUser {
  return { id, email, role };
}

export class AuthService {
  /**
   * A hash of a random password, compared against when the email is unknown so
   * that a failed login costs the same time whether or not the account exists.
   * Computed up front, with the real hasher's cost, so no request pays for it.
   */
  private readonly decoyHash: Promise<string>;

  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {
    this.decoyHash = hasher.hash(randomBytes(16).toString("hex"));
    this.decoyHash.catch(() => undefined); // a failure surfaces when it is awaited, not as an unhandled rejection
  }

  /**
   * Registers a new user. Anyone registering through the API is a USER; admins
   * are created out of band (seed script), never by the caller's request.
   */
  async register(input: unknown): Promise<PublicUser> {
    const { email, password } = parseOrThrow(registerSchema, input);
    const passwordHash = await this.hasher.hash(password);

    try {
      return toPublicUser(await this.users.create({ email, passwordHash, role: "USER" }));
    } catch (error) {
      // Rely on the database's uniqueness guarantee instead of check-then-insert,
      // which two concurrent registrations could both pass.
      if (error instanceof EmailAlreadyExistsError) {
        throw new ConflictError("A user with this email already exists", "EMAIL_TAKEN");
      }
      throw error;
    }
  }

  /**
   * Checks the credentials and issues an access token. An unknown email and a
   * wrong password are indistinguishable to the caller, in both response and timing.
   */
  async login(input: unknown): Promise<LoginResult> {
    const { email, password } = parseOrThrow(loginSchema, input);
    const user = await this.users.findByEmail(email);

    const passwordMatches = await this.hasher.compare(password, user?.passwordHash ?? (await this.decoyHash));
    if (!user || !passwordMatches) {
      throw new UnauthorizedError("Invalid email or password", "INVALID_CREDENTIALS");
    }

    return { token: this.tokens.sign({ sub: user.id, role: user.role }), user: toPublicUser(user) };
  }
}
