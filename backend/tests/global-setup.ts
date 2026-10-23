import { execSync } from "node:child_process";

/**
 * Stops the run with a readable message. The stack trace is dropped on purpose:
 * Vitest crashes while printing a trace from this file and the message is lost.
 */
function fail(message: string): never {
  const error = new Error(message);
  error.stack = `Error: ${message}`;
  throw error;
}

/** The integration tests empty tables between runs, so they must never touch a database with real data. */
function assertSafeTestDatabase(url: string): void {
  let databaseName: string;
  try {
    databaseName = new URL(url).pathname.slice(1);
  } catch {
    fail("TEST_DATABASE_URL is not a valid database URL.");
  }
  if (!databaseName.endsWith("_test")) {
    fail(
      `Refusing to run the integration tests against "${databaseName}": they empty tables, ` +
        'so TEST_DATABASE_URL must name a database ending in "_test".',
    );
  }
}

/** Applies pending migrations to the test database, and explains what to do if that cannot happen. */
function migrate(databaseUrl: string): void {
  try {
    // Never touches the development database: DATABASE_URL is overridden for this command only.
    execSync("npx prisma migrate deploy", { stdio: "pipe", env: { ...process.env, DATABASE_URL: databaseUrl } });
  } catch (error) {
    const { stdout, stderr } = error as { stdout?: Buffer; stderr?: Buffer };
    const reason = (
      `${stderr ?? ""}\n${stdout ?? ""}`.split("\n").find((line) => line.startsWith("Error")) ??
      "run `npx prisma migrate deploy` to see why"
    ).replace(/^Error:\s*/, "");
    fail(
      `Could not prepare the test database. ${reason}\n` +
        "Is PostgreSQL running? From the repository root, start it with: docker compose up -d",
    );
  }
}

/** Brings the test database schema up to date before the integration tests run. */
export default function setup(): void {
  // vitest.config.mts fills in TEST_DATABASE_URL, defaulting to the docker-compose test database.
  const testDatabaseUrl = process.env.TEST_DATABASE_URL!;
  assertSafeTestDatabase(testDatabaseUrl);
  migrate(testDatabaseUrl);
}
