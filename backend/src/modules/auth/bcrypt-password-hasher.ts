import { compare, hash } from "bcryptjs";
import type { PasswordHasher } from "./password-hasher";

export class BcryptPasswordHasher implements PasswordHasher {
  /** @param cost bcrypt work factor; each +1 doubles the time an attacker needs per guess. */
  constructor(private readonly cost = 10) {}

  hash(plain: string): Promise<string> {
    return hash(plain, this.cost);
  }

  compare(plain: string, hashed: string): Promise<boolean> {
    return compare(plain, hashed);
  }
}
