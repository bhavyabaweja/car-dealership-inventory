import { afterAll, beforeEach } from "vitest";
import { createApp } from "../../src/app";
import { createPrismaClient } from "../../src/db/prisma";
import { AuthService } from "../../src/modules/auth/auth.service";
import { BcryptPasswordHasher } from "../../src/modules/auth/bcrypt-password-hasher";
import { JwtTokenService } from "../../src/modules/auth/jwt-token-service";
import { PrismaUserRepository } from "../../src/modules/auth/prisma-user.repository";
import { TEST_JWT_SECRET } from "./jwt";

// Real implementations wired to the test database. Each test file gets its own copy of these.
// bcrypt runs at its minimum cost so the suite stays fast; the real server uses the default.
export const prisma = createPrismaClient(process.env.DATABASE_URL!);
export const users = new PrismaUserRepository(prisma);
export const hasher = new BcryptPasswordHasher(4);
export const tokens = new JwtTokenService(TEST_JWT_SECRET);
export const authService = new AuthService(users, hasher, tokens);
export const app = createApp({ authService });

/** Call once at the top of a test file: empties the users table before each test, disconnects at the end. */
export function useCleanDatabase(): void {
  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "User"');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
}
