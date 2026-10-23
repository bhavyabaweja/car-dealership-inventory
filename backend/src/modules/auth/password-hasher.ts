/** One-way password hashing, kept behind an interface so services stay independent of the algorithm. */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
}
