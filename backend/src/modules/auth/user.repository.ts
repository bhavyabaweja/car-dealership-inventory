/** The single list of roles; the Role type and runtime checks such as token validation derive from it. */
export const ROLES = ["USER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

/** What is needed to create a user. The email must already be normalized (trimmed, lowercase). */
export interface NewUser {
  email: string;
  passwordHash: string;
  role: Role;
}

export interface User extends NewUser {
  id: string;
  createdAt: Date;
}

/** Thrown by a repository when the email is already taken; the database is the authority on this. */
export class EmailAlreadyExistsError extends Error {
  constructor(readonly email: string) {
    super(`A user with email "${email}" already exists`);
    this.name = "EmailAlreadyExistsError";
  }
}

export interface UserRepository {
  /** @throws EmailAlreadyExistsError if a user with the same email exists. */
  create(data: NewUser): Promise<User>;

  /** @param email already normalized (trimmed, lowercase). */
  findByEmail(email: string): Promise<User | null>;
}
