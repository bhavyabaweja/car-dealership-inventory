import "dotenv/config";
import { createApp } from "./app";
import { loadConfig } from "./config/env";
import { createPrismaClient } from "./db/prisma";
import { AuthService } from "./modules/auth/auth.service";
import { BcryptPasswordHasher } from "./modules/auth/bcrypt-password-hasher";
import { JwtTokenService } from "./modules/auth/jwt-token-service";
import { PrismaUserRepository } from "./modules/auth/prisma-user.repository";
import { PrismaVehicleRepository } from "./modules/vehicles/prisma-vehicle.repository";
import { VehicleService } from "./modules/vehicles/vehicle.service";

// Composition root: the only place that picks concrete implementations and starts listening.
const config = loadConfig();

const prisma = createPrismaClient(config.databaseUrl);
const tokenService = new JwtTokenService(config.jwtSecret, config.jwtExpiresIn);
const authService = new AuthService(new PrismaUserRepository(prisma), new BcryptPasswordHasher(), tokenService);
const vehicleService = new VehicleService(new PrismaVehicleRepository(prisma));

const server = createApp({ authService, vehicleService, tokenService }).listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});

function shutdown(): void {
  server.close(() => {
    void prisma.$disconnect().then(() => process.exit(0));
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
