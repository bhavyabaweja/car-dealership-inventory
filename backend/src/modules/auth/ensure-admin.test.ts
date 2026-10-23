import { beforeEach, describe, expect, it } from "vitest";
import { FakePasswordHasher, InMemoryUserRepository } from "../../../tests/support/auth-test-doubles";
import { ConflictError, ValidationError } from "../../errors/app-error";
import { ensureAdmin } from "./ensure-admin";

describe("ensureAdmin", () => {
  let users: InMemoryUserRepository;
  let hasher: FakePasswordHasher;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
  });

  it("creates an ADMIN with a hashed password", async () => {
    const result = await ensureAdmin(users, hasher, { email: "admin@example.com", password: "Adm1nPassw0rd!" });

    expect(result).toEqual({ email: "admin@example.com", created: true });
    expect(users.users).toHaveLength(1);
    expect(users.users[0]).toMatchObject({ email: "admin@example.com", role: "ADMIN", passwordHash: "hashed:Adm1nPassw0rd!" });
  });

  it("normalizes the email like registration does", async () => {
    await ensureAdmin(users, hasher, { email: " Admin@Example.COM ", password: "Adm1nPassw0rd!" });

    expect(users.users[0]?.email).toBe("admin@example.com");
  });

  it("can be run again without creating a second admin or changing the existing password", async () => {
    await ensureAdmin(users, hasher, { email: "admin@example.com", password: "Adm1nPassw0rd!" });

    const again = await ensureAdmin(users, hasher, { email: "admin@example.com", password: "Different-Passw0rd!" });

    expect(again).toEqual({ email: "admin@example.com", created: false });
    expect(users.users).toHaveLength(1);
    expect(users.users[0]?.passwordHash).toBe("hashed:Adm1nPassw0rd!");
  });

  it("refuses to take over an email that belongs to a regular user, and does not promote them", async () => {
    await users.create({ email: "jane@example.com", passwordHash: "hashed:Sup3rSecret!", role: "USER" });

    await expect(ensureAdmin(users, hasher, { email: "jane@example.com", password: "Adm1nPassw0rd!" })).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(users.users[0]?.role).toBe("USER");
  });

  it.each([
    ["an invalid email", { email: "not-an-email", password: "Adm1nPassw0rd!" }],
    ["a weak password", { email: "admin@example.com", password: "short" }],
    ["missing values", {}],
  ])("rejects %s and creates nothing", async (_label, input) => {
    await expect(ensureAdmin(users, hasher, input)).rejects.toBeInstanceOf(ValidationError);
    expect(users.users).toHaveLength(0);
  });
});
