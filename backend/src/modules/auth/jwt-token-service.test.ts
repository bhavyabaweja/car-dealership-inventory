import jwt from "jsonwebtoken";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JwtTokenService } from "./jwt-token-service";
import { ExpiredTokenError, InvalidTokenError } from "./token-service";

const SECRET = "test-secret-that-is-at-least-32-characters-long";
const service = new JwtTokenService(SECRET, "1h");

const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");

afterEach(() => {
  vi.useRealTimers();
});

describe("JwtTokenService", () => {
  it("returns the user id and role from a token it signed", () => {
    const token = service.sign({ sub: "user-1", role: "ADMIN" });

    expect(service.verify(token)).toEqual({ sub: "user-1", role: "ADMIN" });
  });

  it("expires tokens after the configured lifetime", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = service.sign({ sub: "user-1", role: "USER" });

    vi.setSystemTime(new Date("2026-01-01T00:59:59Z"));
    expect(service.verify(token).sub).toBe("user-1");

    vi.setSystemTime(new Date("2026-01-01T01:00:01Z"));
    expect(() => service.verify(token)).toThrow(ExpiredTokenError);
  });

  describe("rejects tokens it should not trust", () => {
    const valid = service.sign({ sub: "user-1", role: "USER" });

    it("with a signature from a different secret", () => {
      const forged = jwt.sign({ role: "ADMIN" }, "another-secret-that-is-also-32-characters!!", { subject: "user-1" });

      expect(() => service.verify(forged)).toThrow(InvalidTokenError);
    });

    it("whose payload was edited after signing", () => {
      const [header, , signature] = valid.split(".");
      const promoted = base64url({ sub: "user-1", role: "ADMIN", exp: 9999999999 });

      expect(() => service.verify(`${header}.${promoted}.${signature}`)).toThrow(InvalidTokenError);
    });

    it('with the unsigned "none" algorithm', () => {
      const unsigned = `${base64url({ alg: "none", typ: "JWT" })}.${base64url({ sub: "user-1", role: "ADMIN" })}.`;

      expect(() => service.verify(unsigned)).toThrow(InvalidTokenError);
    });

    it("signed with another algorithm, even using the right secret", () => {
      const hs512 = jwt.sign({ role: "ADMIN" }, SECRET, { subject: "user-1", algorithm: "HS512" });

      expect(() => service.verify(hs512)).toThrow(InvalidTokenError);
    });

    it.each([
      ["has no subject", jwt.sign({ role: "USER" }, SECRET)],
      ["has an unknown role", jwt.sign({ role: "SUPERUSER" }, SECRET, { subject: "user-1" })],
      ["has no role", jwt.sign({}, SECRET, { subject: "user-1" })],
    ])("when it %s", (_label, token) => {
      expect(() => service.verify(token)).toThrow(InvalidTokenError);
    });

    it.each(["", "garbage", "a.b.c"])("when it is not a JWT (%j)", (token) => {
      expect(() => service.verify(token)).toThrow(InvalidTokenError);
    });
  });
});
