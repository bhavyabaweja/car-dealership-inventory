import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildTestApp } from "../support/build-test-app";

const credentials = { email: "jane@example.com", password: "Sup3rSecret!" };

async function appWithRegisteredUser() {
  const built = buildTestApp();
  await request(built.app).post("/api/auth/register").send(credentials);
  return built;
}

describe("POST /api/auth/login", () => {
  it("responds 200 with a token and the user's public fields", async () => {
    const { app, tokens } = await appWithRegisteredUser();

    const response = await request(app).post("/api/auth/login").send(credentials);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      token: expect.any(String),
      user: { id: expect.any(String), email: "jane@example.com", role: "USER" },
    });
    expect(tokens.verify(response.body.token).sub).toBe(response.body.user.id);
  });

  it("forbids caching the response, since it carries a credential", async () => {
    const { app } = await appWithRegisteredUser();

    const response = await request(app).post("/api/auth/login").send(credentials);

    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("responds 401 INVALID_CREDENTIALS with an identical body for a wrong password and an unknown email", async () => {
    const { app } = await appWithRegisteredUser();

    const wrongPassword = await request(app).post("/api/auth/login").send({ ...credentials, password: "nope-nope-nope" });
    const unknownEmail = await request(app).post("/api/auth/login").send({ email: "nobody@example.com", password: "nope-nope-nope" });

    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body).toEqual({ error: { code: "INVALID_CREDENTIALS", message: expect.any(String) } });
    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it.each([
    ["email", { password: "Sup3rSecret!" }],
    ["password", { email: "jane@example.com" }],
  ])("responds 400 VALIDATION_ERROR naming the missing %s", async (field, payload) => {
    const { app } = await appWithRegisteredUser();

    const response = await request(app).post("/api/auth/login").send(payload);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details).toContainEqual({ field, message: expect.any(String) });
  });
});
