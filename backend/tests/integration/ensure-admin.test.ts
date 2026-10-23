import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { createPrismaClient } from "../../src/db/prisma";
import { AuthService } from "../../src/modules/auth/auth.service";
import { BcryptPasswordHasher } from "../../src/modules/auth/bcrypt-password-hasher";
import { ensureAdmin } from "../../src/modules/auth/ensure-admin";
import { JwtTokenService } from "../../src/modules/auth/jwt-token-service";
import { PrismaUserRepository } from "../../src/modules/auth/prisma-user.repository";
import { TEST_JWT_SECRET } from "../support/jwt";

const prisma = createPrismaClient(process.env.DATABASE_URL!);
const users = new PrismaUserRepository(prisma);
const hasher = new BcryptPasswordHasher(4);
const tokens = new JwtTokenService(TEST_JWT_SECRET);
const app = createApp({ authService: new AuthService(users, hasher, tokens) });

beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "User"');
});

afterAll(async () => {
  await prisma.$disconnect();
});

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
