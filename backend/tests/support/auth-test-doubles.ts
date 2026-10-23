import type { PasswordHasher } from "../../src/modules/auth/password-hasher";
import { InvalidTokenError, type TokenPayload, type TokenService } from "../../src/modules/auth/token-service";
import {
  EmailAlreadyExistsError,
  type NewUser,
  type Role,
  type User,
  type UserRepository,
} from "../../src/modules/auth/user.repository";

/** Mirrors the database contract: emails are unique, and a duplicate insert is rejected. */
export class InMemoryUserRepository implements UserRepository {
  readonly users: User[] = [];

  async create(data: NewUser): Promise<User> {
    if (this.users.some((user) => user.email === data.email)) {
      throw new EmailAlreadyExistsError(data.email);
    }
    const user: User = { id: `user-${this.users.length + 1}`, createdAt: new Date(), ...data };
    this.users.push(user);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }
}

/** Predictable stand-in so tests can see exactly what reaches the repository. */
export class FakePasswordHasher implements PasswordHasher {
  /** How many comparisons ran, so tests can check that unknown users cost the same work as known ones. */
  compareCalls = 0;

  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }

  async compare(plain: string, hash: string): Promise<boolean> {
    this.compareCalls += 1;
    return hash === `hashed:${plain}`;
  }
}

/** Readable tokens (`token.<userId>.<role>`) that skip real cryptography. */
export class FakeTokenService implements TokenService {
  sign({ sub, role }: TokenPayload): string {
    return `token.${sub}.${role}`;
  }

  verify(token: string): TokenPayload {
    const [prefix, sub, role] = token.split(".");
    if (prefix !== "token" || !sub || (role !== "USER" && role !== "ADMIN")) {
      throw new InvalidTokenError();
    }
    return { sub, role: role as Role };
  }
}
