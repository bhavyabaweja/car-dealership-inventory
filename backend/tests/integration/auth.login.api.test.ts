import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { createPrismaClient } from "../../src/db/prisma";
import { AuthService } from "../../src/modules/auth/auth.service";
import { BcryptPasswordHasher } from "../../src/modules/auth/bcrypt-password-hasher";
import { JwtTokenService } from "../../src/modules/auth/jwt-token-service";
import { PrismaUserRepository } from "../../src/modules/auth/prisma-user.repository";
import { TEST_JWT_SECRET } from "../support/jwt";

const prisma = createPrismaClient(process.env.DATABASE_URL!);
const tokens = new JwtTokenService(TEST_JWT_SECRET);
const app = createApp({
  authService: new AuthService(new PrismaUserRepository(prisma), new BcryptPasswordHasher(4), tokens),
});

const credentials = { email: "jane@example.com", password: "Sup3rSecret!" };

beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "User"');
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("POST /api/auth/login with the real database", () => {
  it("logs in a registered user and returns a verifiable JWT for them", async () => {
    const registered = await request(app).post("/api/auth/register").send(credentials);

    const response = await request(app).post("/api/auth/login").send({ email: "JANE@example.com", password: credentials.password });

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual(registered.body);
    expect(tokens.verify(response.body.token)).toEqual({ sub: registered.body.id, role: "USER" });
  });

  it("gives an admin created directly in the database an ADMIN token", async () => {
    const hash = await new BcryptPasswordHasher(4).hash("Adm1nPassw0rd!");
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
