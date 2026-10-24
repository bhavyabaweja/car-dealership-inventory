import request from "supertest";
import { afterAll, beforeEach } from "vitest";
import { createApp } from "../../src/app";
import { createPrismaClient } from "../../src/db/prisma";
import { AuthService } from "../../src/modules/auth/auth.service";
import { BcryptPasswordHasher } from "../../src/modules/auth/bcrypt-password-hasher";
import { ensureAdmin } from "../../src/modules/auth/ensure-admin";
import { JwtTokenService } from "../../src/modules/auth/jwt-token-service";
import { PrismaUserRepository } from "../../src/modules/auth/prisma-user.repository";
import { PrismaVehicleRepository } from "../../src/modules/vehicles/prisma-vehicle.repository";
import { VehicleService } from "../../src/modules/vehicles/vehicle.service";
import { TEST_JWT_SECRET } from "./jwt";

// Real implementations wired to the test database. Each test file gets its own copy of these.
// bcrypt runs at its minimum cost so the suite stays fast; the real server uses the default.
export const prisma = createPrismaClient(process.env.DATABASE_URL!);
export const users = new PrismaUserRepository(prisma);
export const hasher = new BcryptPasswordHasher(4);
export const tokens = new JwtTokenService(TEST_JWT_SECRET);
export const authService = new AuthService(users, hasher, tokens);
export const vehicleService = new VehicleService(new PrismaVehicleRepository(prisma));
export const app = createApp({ authService, vehicleService, tokenService: tokens });

/** Call once at the top of a test file: empties every table before each test, disconnects at the end. */
export function useCleanDatabase(): void {
  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "User", "Vehicle"');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
}

/** Creates a user with the given role through the real code paths and returns a token from a real login. */
export async function signInAs(role: "USER" | "ADMIN"): Promise<string> {
  const credentials = { email: `${role.toLowerCase()}@example.com`, password: "Sup3rSecret!" };
  if (role === "ADMIN") {
    await ensureAdmin(users, hasher, credentials); // admins cannot be created through the API
  } else {
    await request(app).post("/api/auth/register").send(credentials);
  }
  const response = await request(app).post("/api/auth/login").send(credentials);
  return response.body.token;
}
