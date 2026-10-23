import "dotenv/config";
import { createPrismaClient } from "./db/prisma";
import { BcryptPasswordHasher } from "./modules/auth/bcrypt-password-hasher";
import { ensureAdmin } from "./modules/auth/ensure-admin";
import { PrismaUserRepository } from "./modules/auth/prisma-user.repository";

/** Creates the administrator named by ADMIN_EMAIL / ADMIN_PASSWORD. Run with `npm run db:seed`. */
async function main(): Promise<void> {
  const { DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!DATABASE_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Set DATABASE_URL, ADMIN_EMAIL and ADMIN_PASSWORD (see .env.example) before seeding.");
  }

  const prisma = createPrismaClient(DATABASE_URL);
  try {
    const { email, created } = await ensureAdmin(new PrismaUserRepository(prisma), new BcryptPasswordHasher(), {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    console.log(created ? `Created administrator ${email}.` : `Administrator ${email} already exists; nothing changed.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
