import request from "supertest";
import { describe, expect, it } from "vitest";
import type { AppDependencies } from "../../src/app";
import { buildTestApp } from "../support/build-test-app";

// Render calls this to decide whether a new deploy is up. It must answer without a login and without touching
// the database: a database that is waking up (Neon suspends idle ones) must not make Render restart a healthy API.

/** A service that fails the test the moment anything uses it. */
function unusable<T extends object>(name: string): T {
  return new Proxy({} as T, {
    get(_target, property) {
      throw new Error(`/api/health used ${name}.${String(property)}`);
    },
  });
}

describe("GET /api/health", () => {
  it("answers 200 {status: ok} to anyone", async () => {
    const { app } = buildTestApp();

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("answers without using the auth or vehicle services, so without the database", async () => {
    const { app } = buildTestApp({
      authService: unusable<AppDependencies["authService"]>("authService"),
      vehicleService: unusable<AppDependencies["vehicleService"]>("vehicleService"),
    });

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
  });
});
