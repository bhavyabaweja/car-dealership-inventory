import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Read directly instead of with Prisma's env(), which throws when the variable is missing.
    // `prisma generate` (run on install) never connects, so it must work without a .env file;
    // commands that do need the database still fail with a clear message if this is unset.
    url: process.env.DATABASE_URL,
  },
});
