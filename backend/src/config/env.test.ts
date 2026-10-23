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
    });
  });

  it("uses PORT and JWT_EXPIRES_IN when provided", () => {
    expect(loadConfig({ ...valid, PORT: "8080", JWT_EXPIRES_IN: "30m" })).toMatchObject({
      port: 8080,
      jwtExpiresIn: "30m",
    });
  });

  it.each([
    ["DATABASE_URL is missing", { JWT_SECRET: valid.JWT_SECRET }, /DATABASE_URL/],
    ["JWT_SECRET is missing", { DATABASE_URL: valid.DATABASE_URL }, /JWT_SECRET/],
    ["JWT_SECRET is shorter than 32 characters", { ...valid, JWT_SECRET: "too-short" }, /JWT_SECRET/],
    ["PORT is not a number", { ...valid, PORT: "abc" }, /PORT/],
    ["PORT is out of range", { ...valid, PORT: "70000" }, /PORT/],
    ["JWT_EXPIRES_IN is not a duration", { ...valid, JWT_EXPIRES_IN: "soon" }, /JWT_EXPIRES_IN/],
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
