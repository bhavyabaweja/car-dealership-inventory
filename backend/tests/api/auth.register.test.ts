import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildTestApp } from "../support/build-test-app";

const buildApp = buildTestApp;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/auth/register", () => {
  it("creates the user and responds 201 with its public fields only", async () => {
    const { app } = buildApp();

    const response = await request(app).post("/api/auth/register").send({ email: "jane@example.com", password: "Sup3rSecret!" });

    expect(response.status).toBe(201);
    expect(response.headers["content-type"]).toMatch(/application\/json/);
    expect(response.body).toEqual({ id: expect.any(String), email: "jane@example.com", role: "USER" });
  });

  it("normalizes the email and ignores a client-supplied role", async () => {
    const { app, users } = buildApp();

    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: " Mallory@Example.COM ", password: "Sup3rSecret!", role: "ADMIN" });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ email: "mallory@example.com", role: "USER" });
    expect(users.users[0]?.role).toBe("USER");
  });

  it("responds 409 EMAIL_TAKEN when the email is already registered", async () => {
    const { app } = buildApp();
    await request(app).post("/api/auth/register").send({ email: "jane@example.com", password: "Sup3rSecret!" });

    const response = await request(app).post("/api/auth/register").send({ email: "JANE@example.com", password: "An0therPass!" });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: { code: "EMAIL_TAKEN", message: expect.any(String) } });
  });

  it.each([
    ["email", { email: "not-an-email", password: "Sup3rSecret!" }],
    ["password", { email: "jane@example.com", password: "short" }],
  ])("responds 400 VALIDATION_ERROR naming the invalid %s", async (field, payload) => {
    const { app, users } = buildApp();

    const response = await request(app).post("/api/auth/register").send(payload);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details).toContainEqual({ field, message: expect.any(String) });
    expect(users.users).toHaveLength(0);
  });

  it("responds 400 VALIDATION_ERROR when there is no body", async () => {
    const { app } = buildApp();

    const response = await request(app).post("/api/auth/register");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("responds 400 INVALID_JSON for a malformed JSON body", async () => {
    const { app } = buildApp();

    const response = await request(app).post("/api/auth/register").set("Content-Type", "application/json").send('{"email": ');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: { code: "INVALID_JSON", message: expect.any(String) } });
  });

  it("responds 413 PAYLOAD_TOO_LARGE for an oversized body", async () => {
    const { app } = buildApp();

    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "jane@example.com", password: "x".repeat(200_000) });

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});

describe("app-wide behaviour", () => {
  it("responds 404 NOT_FOUND in the standard error shape for unknown routes", async () => {
    const { app } = buildApp();

    const response = await request(app).get("/api/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: "NOT_FOUND", message: expect.any(String) } });
  });

  it("hides internal error details behind a generic 500 and logs them server-side", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = async () => {
      throw new Error("connect ECONNREFUSED db:5432 password=hunter2");
    };
    const { app } = buildApp({ authService: { register: failure, login: failure } });

    const response = await request(app).post("/api/auth/register").send({ email: "jane@example.com", password: "Sup3rSecret!" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
    expect(JSON.stringify(response.body)).not.toContain("hunter2");
    expect(logged).toHaveBeenCalled();
  });

  it.each([
    ["a body that is not valid for its declared compression", "br", 400],
    ["a compression the server does not support", "x-unsupported", 415],
  ])("reports %s as a client error, not as a server failure", async (_label, encoding, expectedStatus) => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const { app } = buildApp();

    const response = await request(app)
      .post("/api/auth/register")
      .set("Content-Type", "application/json")
      .set("Content-Encoding", encoding)
      .send("{}");

    expect(response.status).toBe(expectedStatus);
    expect(response.body).toEqual({ error: { code: "BAD_REQUEST", message: expect.any(String) } });
    expect(logged).not.toHaveBeenCalled(); // the client's mistake is not an incident
  });

  it("does not advertise the framework in response headers", async () => {
    const { app } = buildApp();

    const response = await request(app).get("/api/does-not-exist");

    expect(response.headers["x-powered-by"]).toBeUndefined();
  });
});
