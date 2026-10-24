import { describe, expect, it } from "vitest";
import { brokenStorage, expiredToken, freshToken, makeToken, memoryStorage, NOW, userWithRole } from "../test/helpers";
import { clearSession, decodeExpiry, loadSession, saveSession, SESSION_KEY } from "./session";

const session = () => ({ token: freshToken(), user: userWithRole("ADMIN") });

describe("decodeExpiry", () => {
  it("reads the expiry of a token in milliseconds", () => {
    expect(decodeExpiry(makeToken({ exp: 1_800_000_000 }))).toBe(1_800_000_000_000);
  });

  it.each([["not a token"], [""], ["a.b.c"], [makeToken({})], [makeToken({ exp: "soon" })]])(
    "returns null for %j, which has no usable expiry",
    (token) => {
      expect(decodeExpiry(token)).toBeNull();
    },
  );
});

describe("saveSession and loadSession", () => {
  it("round-trips a session through storage", () => {
    const storage = memoryStorage();
    const saved = session();

    saveSession(storage, saved);

    expect(loadSession(storage, NOW)).toEqual(saved);
  });

  it("finds nothing when nothing was stored", () => {
    expect(loadSession(memoryStorage(), NOW)).toBeNull();
  });

  describe("discards, and removes from storage, a stored session that cannot be trusted", () => {
    it("whose token has already expired, so the dashboard never flashes up before a 401", () => {
      const storage = memoryStorage({ [SESSION_KEY]: JSON.stringify({ token: expiredToken(), user: userWithRole() }) });

      expect(loadSession(storage, NOW)).toBeNull();
      expect(storage.items.has(SESSION_KEY)).toBe(false);
    });

    it("whose token expires exactly now", () => {
      const token = makeToken({ exp: NOW / 1000 });
      const storage = memoryStorage({ [SESSION_KEY]: JSON.stringify({ token, user: userWithRole() }) });

      expect(loadSession(storage, NOW)).toBeNull();
    });

    it.each([
      ["is not JSON", "{broken"],
      ["is not an object", '"hello"'],
      ["has no token", JSON.stringify({ user: userWithRole() })],
      ["has no user", JSON.stringify({ token: freshToken() })],
      ["has a user with an unknown role", JSON.stringify({ token: freshToken(), user: { id: "1", email: "a@b.co", role: "SUPERUSER" } })],
      ["has a token that is not a JWT", JSON.stringify({ token: "garbage", user: userWithRole() })],
    ])("when the stored value %s", (_label, stored) => {
      const storage = memoryStorage({ [SESSION_KEY]: stored });

      expect(loadSession(storage, NOW)).toBeNull();
      expect(storage.items.has(SESSION_KEY)).toBe(false);
    });
  });

  it("clears the stored session", () => {
    const storage = memoryStorage();
    saveSession(storage, session());

    clearSession(storage);

    expect(storage.items.has(SESSION_KEY)).toBe(false);
  });

  describe("when storage is unavailable, as in some private modes", () => {
    it("loads nothing instead of crashing", () => {
      expect(loadSession(brokenStorage, NOW)).toBeNull();
    });

    it("saves and clears without throwing, so signing in still works for this visit", () => {
      expect(() => saveSession(brokenStorage, session())).not.toThrow();
      expect(() => clearSession(brokenStorage)).not.toThrow();
    });
  });
});
