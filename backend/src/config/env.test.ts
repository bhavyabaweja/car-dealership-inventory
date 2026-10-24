import { describe, expect, it } from "vitest";
import { loadConfig } from "./env";

const valid = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  JWT_SECRET: "a-secret-that-is-at-least-32-characters-long",
};

describe("loadConfig", () => {
  it("reads the settings and applies defaults for the optional ones", () => {
    expect(loadConfig(valid)).toEqual({
      databaseUrl: valid.DATABASE_URL,
      port: 3000,
      jwtSecret: valid.JWT_SECRET,
      jwtExpiresIn: "1h",
      corsOrigins: [],
    });
  });

  it("uses PORT and JWT_EXPIRES_IN when provided", () => {
    expect(loadConfig({ ...valid, PORT: "8080", JWT_EXPIRES_IN: "30m" })).toMatchObject({
      port: 8080,
      jwtExpiresIn: "30m",
    });
  });

  describe("CORS_ORIGIN, the sites allowed to call the API from a browser", () => {
    it("is a comma-separated list; spaces, empty entries and trailing slashes are tidied away", () => {
      const env = { ...valid, CORS_ORIGIN: " https://car-dealership.vercel.app/ ,http://localhost:5173,, " };

      expect(loadConfig(env).corsOrigins).toEqual(["https://car-dealership.vercel.app", "http://localhost:5173"]);
    });

    it("counts a blank value as unset, as an empty line in a .env file or a blank dashboard field gives", () => {
      expect(loadConfig({ ...valid, CORS_ORIGIN: "  " }).corsOrigins).toEqual([]);
    });

    it("lists each origin once", () => {
      const env = { ...valid, CORS_ORIGIN: "https://a.example,https://a.example/" };

      expect(loadConfig(env).corsOrigins).toEqual(["https://a.example"]);
    });

    it.each([
      ["a wildcard (the allow-list is the point)", "*"],
      ["a host with no scheme, which a browser would never send", "car-dealership.vercel.app"],
      ["a page address rather than an origin", "https://car-dealership.vercel.app/login"],
      ["an address with a query", "https://car-dealership.vercel.app?x=1"],
      ["a scheme that is not http or https", "ftp://car-dealership.vercel.app"],
      ["one bad entry among good ones", "https://a.example,nonsense"],
    ])("fails fast and names the setting for %s", (_label, value) => {
      expect(() => loadConfig({ ...valid, CORS_ORIGIN: value })).toThrow(/CORS_ORIGIN/);
    });
  });

  it.each([
    ["DATABASE_URL is missing", { JWT_SECRET: valid.JWT_SECRET }, /DATABASE_URL/],
    ["JWT_SECRET is missing", { DATABASE_URL: valid.DATABASE_URL }, /JWT_SECRET/],
    ["JWT_SECRET is shorter than 32 characters", { ...valid, JWT_SECRET: "too-short" }, /JWT_SECRET/],
    ["PORT is not a number", { ...valid, PORT: "abc" }, /PORT/],
    ["PORT is out of range", { ...valid, PORT: "70000" }, /PORT/],
    ["JWT_EXPIRES_IN is not a duration", { ...valid, JWT_EXPIRES_IN: "soon" }, /JWT_EXPIRES_IN/],
    // A zero lifetime would issue tokens that are already expired, so nobody could ever log in.
    ["JWT_EXPIRES_IN is zero", { ...valid, JWT_EXPIRES_IN: "0s" }, /JWT_EXPIRES_IN/],
    ["JWT_EXPIRES_IN is zero with leading zeros", { ...valid, JWT_EXPIRES_IN: "00h" }, /JWT_EXPIRES_IN/],
    [
      "JWT_SECRET is still the placeholder from .env.example",
      { ...valid, JWT_SECRET: "replace-me-with-a-long-random-string-of-at-least-32-characters" },
      /JWT_SECRET.*placeholder/s,
    ],
  ])("fails fast and names the setting when %s", (_label, env, expected) => {
    expect(() => loadConfig(env)).toThrow(expected);
  });

  it("never echoes the JWT secret in its error message", () => {
    expect.assertions(1);
    try {
      loadConfig({ ...valid, JWT_SECRET: "short-but-secret" });
    } catch (error) {
      expect((error as Error).message).not.toContain("short-but-secret");
    }
  });
});
