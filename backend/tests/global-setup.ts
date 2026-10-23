import { execSync } from "node:child_process";

/** Brings the test database schema up to date before the integration tests run. */
export default function setup(): void {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Copy backend/.env.example to backend/.env and start the database with `docker compose up -d`.",
    );
  }

  // Never touches the development database: DATABASE_URL is overridden for this command only.
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
  });
}
