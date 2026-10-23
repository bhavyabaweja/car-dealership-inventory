import "dotenv/config";
import { createApp } from "./app";
import { loadConfig } from "./config/env";
import { createPrismaClient } from "./db/prisma";
import { AuthService } from "./modules/auth/auth.service";
import { BcryptPasswordHasher } from "./modules/auth/bcrypt-password-hasher";
import { JwtTokenService } from "./modules/auth/jwt-token-service";
import { PrismaUserRepository } from "./modules/auth/prisma-user.repository";

// Composition root: the only place that picks concrete implementations and starts listening.
const config = loadConfig();

const prisma = createPrismaClient(config.databaseUrl);
const authService = new AuthService(
  new PrismaUserRepository(prisma),
  new BcryptPasswordHasher(),
  new JwtTokenService(config.jwtSecret, config.jwtExpiresIn),
);
const server = createApp({ authService }).listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});

function shutdown(): void {
  server.close(() => {
    void prisma.$disconnect().then(() => process.exit(0));
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
