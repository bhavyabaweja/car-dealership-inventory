import { describe, expect, it } from "vitest";
import { ConflictError } from "../../src/errors/app-error";
import { EmailAlreadyExistsError } from "../../src/modules/auth/user.repository";
import { authService, prisma, useCleanDatabase, users } from "../support/integration";

useCleanDatabase();

/** Inserts straight through SQL, bypassing the repository and service, to test the database's own rules. */
function insertRaw(email: string) {
  return prisma.$executeRaw`
    INSERT INTO "User" (id, email, "passwordHash", role)
    VALUES (gen_random_uuid()::text, ${email}, 'not-a-real-hash', 'USER')`;
}

describe("PrismaUserRepository", () => {
  it("persists a user and returns the stored record", async () => {
    const user = await users.create({ email: "jane@example.com", passwordHash: "hash", role: "USER" });

    expect(user).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      email: "jane@example.com",
      passwordHash: "hash",
      role: "USER",
      createdAt: expect.any(Date),
    });
  });

  it("raises EmailAlreadyExistsError when the email is taken", async () => {
    await users.create({ email: "jane@example.com", passwordHash: "hash", role: "USER" });

    await expect(users.create({ email: "jane@example.com", passwordHash: "other", role: "ADMIN" })).rejects.toBeInstanceOf(
      EmailAlreadyExistsError,
    );
  });

  it("does not mistake another database failure for a duplicate email", async () => {
    // Violates the lowercase CHECK constraint: the database refuses it, but not as a unique violation.
    const attempt = users.create({ email: "JANE@example.com", passwordHash: "hash", role: "USER" });

    await expect(attempt).rejects.toThrow();
    await expect(attempt).rejects.not.toBeInstanceOf(EmailAlreadyExistsError);
  });

  it("lets only one of two simultaneous creates for the same email succeed", async () => {
    const attempts = await Promise.allSettled([
      users.create({ email: "jane@example.com", passwordHash: "a", role: "USER" }),
      users.create({ email: "jane@example.com", passwordHash: "b", role: "USER" }),
    ]);

    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
    const rejected = attempts.find((a): a is PromiseRejectedResult => a.status === "rejected");
    expect(rejected?.reason).toBeInstanceOf(EmailAlreadyExistsError);
  });
});

describe("PrismaUserRepository.findByEmail", () => {
  it("returns the stored user, including the password hash needed to verify a login", async () => {
    const created = await users.create({ email: "jane@example.com", passwordHash: "hash", role: "ADMIN" });

    expect(await users.findByEmail("jane@example.com")).toEqual(created);
  });

  it("returns null when no user has that email", async () => {
    expect(await users.findByEmail("nobody@example.com")).toBeNull();
  });
});

describe("database-level email rules", () => {
  it("rejects a duplicate email even when inserted outside the application", async () => {
    await insertRaw("jane@example.com");

    await expect(insertRaw("jane@example.com")).rejects.toThrow(/User_email_key/);
  });

  it("rejects an email that is not lowercase, so casing can never create a duplicate", async () => {
    await insertRaw("jane@example.com");

    await expect(insertRaw("JANE@example.com")).rejects.toThrow(/User_email_is_lowercase/);
  });
});

describe("AuthService.register against the real database", () => {
  it("stores a bcrypt hash and never the password", async () => {
    await authService.register({ email: "Jane@Example.com", password: "Sup3rSecret!" });

    const rows = await prisma.$queryRaw<{ email: string; passwordHash: string; role: string }[]>`
      SELECT email, "passwordHash", role::text AS role FROM "User"`;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ email: "jane@example.com", role: "USER" });
    expect(rows[0]?.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(rows[0]?.passwordHash).not.toContain("Sup3rSecret!");
  });

  it("creates exactly one user when the same email registers twice at once", async () => {
    const attempts = await Promise.allSettled([
      authService.register({ email: "jane@example.com", password: "Sup3rSecret!" }),
      authService.register({ email: "jane@example.com", password: "An0therPass!" }),
    ]);

    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(1);
    const rejected = attempts.find((a): a is PromiseRejectedResult => a.status === "rejected");
    expect(rejected?.reason).toBeInstanceOf(ConflictError);

    const [{ count }] = await prisma.$queryRaw<[{ count: bigint }]>`SELECT count(*) AS count FROM "User"`;
    expect(count).toBe(1n);
  });
});
