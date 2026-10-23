import "dotenv/config";
import { createApp } from "./app";
import { createPrismaClient } from "./db/prisma";
import { AuthService } from "./modules/auth/auth.service";
import { BcryptPasswordHasher } from "./modules/auth/bcrypt-password-hasher";
import { PrismaUserRepository } from "./modules/auth/prisma-user.repository";

// Composition root: the only place that picks concrete implementations and starts listening.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Copy backend/.env.example to backend/.env.");
}
const port = Number(process.env.PORT ?? 3000);

const prisma = createPrismaClient(databaseUrl);
const authService = new AuthService(new PrismaUserRepository(prisma), new BcryptPasswordHasher());
const server = createApp({ authService }).listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

function shutdown(): void {
  server.close(() => {
    void prisma.$disconnect().then(() => process.exit(0));
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
