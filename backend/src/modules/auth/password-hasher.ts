/** Password hashing, kept behind an interface so services stay independent of the algorithm. */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;

  /** Whether `plain` is the password `hash` was made from. A malformed hash never matches. */
  compare(plain: string, hash: string): Promise<boolean>;
}
