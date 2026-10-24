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
    //
    // This is the connection the Prisma CLI uses (migrations); the running API uses DATABASE_URL alone.
    // On Neon, DATABASE_URL is the pooled address (host contains "-pooler"), which cannot hold the locks migrations
    // take, so DIRECT_URL carries the direct address for them. Unset (local development), both are the same database.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
