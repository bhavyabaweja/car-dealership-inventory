import request from "supertest";
import { describe, expect, it } from "vitest";
import { ensureAdmin } from "../../src/modules/auth/ensure-admin";
import { app, hasher, prisma, tokens, useCleanDatabase, users } from "../support/integration";

useCleanDatabase();

describe("ensureAdmin with the real database", () => {
  it("creates an admin who can then log in and receives an ADMIN token", async () => {
    await ensureAdmin(users, hasher, { email: "admin@example.com", password: "Adm1nPassw0rd!" });

    const response = await request(app).post("/api/auth/login").send({ email: "admin@example.com", password: "Adm1nPassw0rd!" });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe("ADMIN");
    expect(tokens.verify(response.body.token).role).toBe("ADMIN");
  });

  it("leaves exactly one admin row when run twice", async () => {
    await ensureAdmin(users, hasher, { email: "admin@example.com", password: "Adm1nPassw0rd!" });
    await ensureAdmin(users, hasher, { email: "admin@example.com", password: "Adm1nPassw0rd!" });

    const [{ count }] = await prisma.$queryRaw<[{ count: bigint }]>`SELECT count(*) AS count FROM "User"`;
    expect(count).toBe(1n);
  });
});
