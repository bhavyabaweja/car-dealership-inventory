import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, hasher, prisma, tokens, useCleanDatabase } from "../support/integration";

useCleanDatabase();

const credentials = { email: "jane@example.com", password: "Sup3rSecret!" };

describe("POST /api/auth/login with the real database", () => {
  it("logs in a registered user and returns a verifiable JWT for them", async () => {
    const registered = await request(app).post("/api/auth/register").send(credentials);

    const response = await request(app).post("/api/auth/login").send({ email: "JANE@example.com", password: credentials.password });

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual(registered.body);
    expect(tokens.verify(response.body.token)).toEqual({ sub: registered.body.id, role: "USER" });
  });

  it("gives an admin created directly in the database an ADMIN token", async () => {
    const hash = await hasher.hash("Adm1nPassw0rd!");
    await prisma.$executeRaw`
      INSERT INTO "User" (id, email, "passwordHash", role)
      VALUES (gen_random_uuid()::text, 'admin@example.com', ${hash}, 'ADMIN')`;

    const response = await request(app).post("/api/auth/login").send({ email: "admin@example.com", password: "Adm1nPassw0rd!" });

    expect(response.status).toBe(200);
    expect(tokens.verify(response.body.token).role).toBe("ADMIN");
  });

  it("rejects the wrong password with 401", async () => {
    await request(app).post("/api/auth/register").send(credentials);

    const response = await request(app).post("/api/auth/login").send({ ...credentials, password: "not-the-password" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
  });
});
