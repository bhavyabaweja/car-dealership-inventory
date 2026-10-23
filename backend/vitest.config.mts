import "dotenv/config";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // server.ts only wires real implementations together and starts listening.
      exclude: ["src/generated/**", "src/**/*.test.ts", "src/server.ts"],
    },
    projects: [
      {
        // Fast tests with in-memory fakes, including HTTP tests through supertest: no database needed.
        extends: true,
        test: { name: "unit", include: ["src/**/*.test.ts", "tests/api/**/*.test.ts"] },
      },
      {
        // Tests against the real PostgreSQL test database (see docker-compose.yml).
        // Files run one at a time because they share, and truncate, the same tables.
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["tests/global-setup.ts"],
          fileParallelism: false,
          env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? "" },
        },
      },
    ],
  },
});
