import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { authenticate, requireAdmin } from "../../src/middleware/authenticate";
import { errorHandler } from "../../src/middleware/error-handler";
import { JwtTokenService } from "../../src/modules/auth/jwt-token-service";
import { ExpiredTokenError, type TokenService } from "../../src/modules/auth/token-service";
import { FakeTokenService } from "../support/auth-test-doubles";
import { TEST_JWT_SECRET } from "../support/jwt";

/** A minimal app with one route per guard, standing in for the real protected routes. */
function buildGuardedApp(tokens: TokenService) {
  const app = express();
  app.get("/protected", authenticate(tokens), (req, res) => res.json({ user: req.user }));
  app.get("/admin-only", authenticate(tokens), requireAdmin, (_req, res) => res.json({ ok: true }));
  app.get("/admin-without-authenticate", requireAdmin, (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  return app;
}

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("authenticate", () => {
  const tokens = new FakeTokenService();
  const app = buildGuardedApp(tokens);

  it("lets a valid token through and exposes the caller as req.user", async () => {
    const response = await request(app).get("/protected").set(bearer(tokens.sign({ sub: "user-7", role: "USER" })));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: { id: "user-7", role: "USER" } });
  });

  it("accepts the Bearer scheme in any letter case, as HTTP requires", async () => {
    const response = await request(app).get("/protected").set("Authorization", `bearer ${tokens.sign({ sub: "u", role: "USER" })}`);

    expect(response.status).toBe(200);
  });

  it("responds 401 UNAUTHENTICATED with a Bearer challenge when no token is sent", async () => {
    const response = await request(app).get("/protected");

    expect(response.status).toBe(401);
    expect(response.headers["www-authenticate"]).toMatch(/^Bearer/);
    expect(response.body).toEqual({ error: { code: "UNAUTHENTICATED", message: expect.any(String) } });
  });

  it.each([
    ["a different scheme", "Basic dXNlcjpwYXNz"],
    ["a scheme with no token", "Bearer"],
    ["a scheme with an empty token", "Bearer "],
    ["extra parts after the token", "Bearer token.u1.USER extra"],
    ["a token that is not valid", "Bearer garbage"],
  ])("responds 401 for %s", async (_label, header) => {
    const response = await request(app).get("/protected").set("Authorization", header);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("responds 401 TOKEN_EXPIRED when the token has expired, so clients know to log in again", async () => {
    const expiring: TokenService = {
      sign: () => "unused",
      verify: () => {
        throw new ExpiredTokenError();
      },
    };

    const response = await request(buildGuardedApp(expiring)).get("/protected").set(bearer("anything"));

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("TOKEN_EXPIRED");
  });

  it("does not turn unexpected failures into a 401", async () => {
    const broken: TokenService = {
      sign: () => "unused",
      verify: () => {
        throw new TypeError("bug in the token service");
      },
    };
    const quiet = () => {};
    const original = console.error;
    console.error = quiet;

    try {
      const response = await request(buildGuardedApp(broken)).get("/protected").set(bearer("anything"));
      expect(response.status).toBe(500);
    } finally {
      console.error = original;
    }
  });

  it("works with real JWTs: accepts a signed token and rejects a tampered one", async () => {
    const jwtTokens = new JwtTokenService(TEST_JWT_SECRET);
    const jwtApp = buildGuardedApp(jwtTokens);
    const token = jwtTokens.sign({ sub: "user-1", role: "USER" });
    const [header, , signature] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ sub: "user-1", role: "ADMIN", exp: 9999999999 })).toString("base64url");

    const valid = await request(jwtApp).get("/protected").set(bearer(token));
    const forged = await request(jwtApp).get("/admin-only").set(bearer(`${header}.${forgedPayload}.${signature}`));

    expect(valid.status).toBe(200);
    expect(forged.status).toBe(401);
  });
});

describe("requireAdmin", () => {
  const tokens = new FakeTokenService();
  const app = buildGuardedApp(tokens);

  it("lets an ADMIN through", async () => {
    const response = await request(app).get("/admin-only").set(bearer(tokens.sign({ sub: "admin-1", role: "ADMIN" })));

    expect(response.status).toBe(200);
  });

  it("responds 403 FORBIDDEN to an authenticated USER", async () => {
    const response = await request(app).get("/admin-only").set(bearer(tokens.sign({ sub: "user-1", role: "USER" })));

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: { code: "FORBIDDEN", message: expect.any(String) } });
  });

  it("responds 401, not 403, when nobody is authenticated", async () => {
    const response = await request(app).get("/admin-only");

    expect(response.status).toBe(401);
  });

  it("denies access if it is mistakenly used without authenticate in front of it", async () => {
    const response = await request(app).get("/admin-without-authenticate");

    expect(response.status).toBe(401);
  });
});
