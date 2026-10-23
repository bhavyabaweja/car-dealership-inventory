import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, prisma, useCleanDatabase } from "../support/integration";

useCleanDatabase();

describe("POST /api/auth/register with the real database", () => {
  it("saves the user in PostgreSQL with a hashed password", async () => {
    const response = await request(app).post("/api/auth/register").send({ email: "Jane@Example.com", password: "Sup3rSecret!" });

    expect(response.status).toBe(201);
    const rows = await prisma.$queryRaw<{ id: string; email: string; passwordHash: string }[]>`
      SELECT id, email, "passwordHash" FROM "User"`;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: response.body.id, email: "jane@example.com" });
    expect(rows[0]?.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it("responds 409 for a duplicate email and keeps a single row", async () => {
    await request(app).post("/api/auth/register").send({ email: "jane@example.com", password: "Sup3rSecret!" });

    const response = await request(app).post("/api/auth/register").send({ email: "JANE@example.com", password: "An0therPass!" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("EMAIL_TAKEN");
    const [{ count }] = await prisma.$queryRaw<[{ count: bigint }]>`SELECT count(*) AS count FROM "User"`;
    expect(count).toBe(1n);
  });
});
