import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FakePasswordHasher,
  FakeTokenService,
  InMemoryUserRepository,
} from "../../../tests/support/auth-test-doubles";
import { ConflictError, ValidationError } from "../../errors/app-error";
import { AuthService } from "./auth.service";

describe("AuthService.register", () => {
  let users: InMemoryUserRepository;
  let service: AuthService;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    service = new AuthService(users, new FakePasswordHasher(), new FakeTokenService());
  });

  it("creates a USER and returns it without the password hash", async () => {
    const result = await service.register({ email: "jane@example.com", password: "Sup3rSecret!" });

    expect(result).toEqual({ id: expect.any(String), email: "jane@example.com", role: "USER" });
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("stores only the hash of the password", async () => {
    await service.register({ email: "jane@example.com", password: "Sup3rSecret!" });

    expect(users.users[0]?.passwordHash).toBe("hashed:Sup3rSecret!");
    expect(JSON.stringify(users.users)).not.toContain('"Sup3rSecret!"');
  });

  it("trims and lowercases the email before storing it", async () => {
    await service.register({ email: "  Jane@Example.COM ", password: "Sup3rSecret!" });

    expect(users.users[0]?.email).toBe("jane@example.com");
  });

  it("ignores a role supplied by the caller", async () => {
    const body = { email: "mallory@example.com", password: "Sup3rSecret!", role: "ADMIN" };

    const result = await service.register(body);

    expect(result.role).toBe("USER");
    expect(users.users[0]?.role).toBe("USER");
  });

  it("rejects an email that is already registered, whatever its casing", async () => {
    await service.register({ email: "jane@example.com", password: "Sup3rSecret!" });

    await expect(service.register({ email: "JANE@example.com", password: "An0therPass!" })).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect(users.users).toHaveLength(1);
  });

  it("lets an unexpected repository failure through instead of reporting it as a duplicate email", async () => {
    const outage = new Error("connection lost");
    vi.spyOn(users, "create").mockRejectedValue(outage);

    await expect(service.register({ email: "jane@example.com", password: "Sup3rSecret!" })).rejects.toBe(outage);
  });

  describe("input validation", () => {
    const rejected: Array<[string, unknown]> = [
      ["a missing email", { password: "Sup3rSecret!" }],
      ["an empty email", { email: "", password: "Sup3rSecret!" }],
      ["a malformed email", { email: "not-an-email", password: "Sup3rSecret!" }],
      ["an email longer than 254 characters", { email: `${"a".repeat(250)}@example.com`, password: "Sup3rSecret!" }],
      ["a missing password", { email: "jane@example.com" }],
      ["a password shorter than 8 characters", { email: "jane@example.com", password: "1234567" }],
      // bcrypt silently ignores everything after 72 bytes, so longer passwords are refused.
      ["a password longer than 72 bytes", { email: "jane@example.com", password: "a".repeat(73) }],
      ["a password under 72 characters but over 72 bytes", { email: "jane@example.com", password: "é".repeat(40) }],
      ["a non-string password", { email: "jane@example.com", password: 12345678 }],
      ["no input at all", undefined],
    ];

    it.each(rejected)("rejects %s and stores nothing", async (_label, input) => {
      await expect(service.register(input)).rejects.toBeInstanceOf(ValidationError);
      expect(users.users).toHaveLength(0);
    });

    it("accepts passwords at the 8 and 72 byte limits", async () => {
      await service.register({ email: "short@example.com", password: "12345678" });
      await service.register({ email: "long@example.com", password: "a".repeat(72) });

      expect(users.users).toHaveLength(2);
    });

    it("reports which field is invalid", async () => {
      const error = await service.register({ email: "not-an-email", password: "Sup3rSecret!" }).catch((e) => e);

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.details).toContainEqual(expect.objectContaining({ field: "email" }));
    });
  });
});
