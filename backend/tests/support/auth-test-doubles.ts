import type { PasswordHasher } from "../../src/modules/auth/password-hasher";
import {
  EmailAlreadyExistsError,
  type NewUser,
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
}

/** Predictable stand-in so tests can see exactly what reaches the repository. */
export class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }
}
