import { beforeEach, describe, expect, it } from "vitest";
import {
  FakePasswordHasher,
  FakeTokenService,
  InMemoryUserRepository,
} from "../../../tests/support/auth-test-doubles";
import { UnauthorizedError, ValidationError } from "../../errors/app-error";
import { AuthService } from "./auth.service";

describe("AuthService.login", () => {
  let users: InMemoryUserRepository;
  let hasher: FakePasswordHasher;
  let tokens: FakeTokenService;
  let service: AuthService;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
    tokens = new FakeTokenService();
    service = new AuthService(users, hasher, tokens);
    await service.register({ email: "jane@example.com", password: "Sup3rSecret!" });
  });

  it("returns a token for the user and the user's public fields", async () => {
    const result = await service.login({ email: "jane@example.com", password: "Sup3rSecret!" });

    expect(result.user).toEqual({ id: expect.any(String), email: "jane@example.com", role: "USER" });
    expect(tokens.verify(result.token)).toEqual({ sub: result.user.id, role: "USER" });
    expect(JSON.stringify(result)).not.toContain("hashed:");
  });

  it("matches the email regardless of casing and surrounding whitespace", async () => {
    const result = await service.login({ email: "  JANE@Example.com ", password: "Sup3rSecret!" });

    expect(result.user.email).toBe("jane@example.com");
  });

  it("puts the user's real role in the token, so admins get admin tokens", async () => {
    await users.create({ email: "admin@example.com", passwordHash: "hashed:Adm1nPassw0rd!", role: "ADMIN" });

    const { token } = await service.login({ email: "admin@example.com", password: "Adm1nPassw0rd!" });

    expect(tokens.verify(token).role).toBe("ADMIN");
  });

  describe("bad credentials", () => {
    it("rejects a wrong password with INVALID_CREDENTIALS", async () => {
      const error = await service.login({ email: "jane@example.com", password: "wrong-password" }).catch((e) => e);

      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.code).toBe("INVALID_CREDENTIALS");
    });

    it("answers an unknown email exactly like a wrong password, so accounts cannot be enumerated", async () => {
      const wrongPassword = await service.login({ email: "jane@example.com", password: "wrong-password" }).catch((e) => e);
      const unknownEmail = await service.login({ email: "nobody@example.com", password: "wrong-password" }).catch((e) => e);

      expect(unknownEmail).toBeInstanceOf(UnauthorizedError);
      expect(unknownEmail.code).toBe(wrongPassword.code);
      expect(unknownEmail.message).toBe(wrongPassword.message);
    });

    it("compares against a genuine decoy hash for an unknown email, so response time does not reveal it", async () => {
      const before = hasher.compareCalls;

      await service.login({ email: "nobody@example.com", password: "whatever-password" }).catch(() => undefined);

      expect(hasher.compareCalls).toBe(before + 1);
      // Comparing against "" or a made-up string would be quick; it must be a hash the hasher itself produced.
      expect(hasher.issued.has(hasher.lastComparedHash!)).toBe(true);
      expect(hasher.lastComparedHash).not.toBe("hashed:Sup3rSecret!"); // and not a real user's hash
    });
  });

  describe("input validation", () => {
    it.each([
      ["a missing email", { password: "Sup3rSecret!" }],
      ["an empty email", { email: "", password: "Sup3rSecret!" }],
      ["a missing password", { email: "jane@example.com" }],
      ["an empty password", { email: "jane@example.com", password: "" }],
      ["a non-string password", { email: "jane@example.com", password: 12345678 }],
      ["no input at all", undefined],
    ])("rejects %s with a ValidationError", async (_label, input) => {
      await expect(service.login(input)).rejects.toBeInstanceOf(ValidationError);
    });

    it("rejects a password over 72 bytes, which bcrypt would silently truncate into a match", async () => {
      // Registered with exactly 72 bytes; bcrypt would treat "…x" as the same password.
      const registered = "a".repeat(72);
      await service.register({ email: "long@example.com", password: registered });

      await expect(service.login({ email: "long@example.com", password: `${registered}x` })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });
});
