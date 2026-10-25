import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildTestApp } from "../support/build-test-app";

// The frontend (on Vercel) and the API (on Render) are different origins, so the browser only lets the page read
// the API's answers when the API names that origin. Only origins listed in CORS_ORIGIN are named.

const APP = "https://car-dealership.vercel.app";
const appWith = (corsOrigins: string[]) => buildTestApp({ corsOrigins }).app;

describe("an origin the API has been told to allow", () => {
  const app = appWith([APP, "http://localhost:5173"]);

  it("is named in the answer, and the answer says it varies by origin so caches keep them apart", async () => {
    const response = await request(app).get("/api/vehicles").set("Origin", APP);

    expect(response.headers["access-control-allow-origin"]).toBe(APP);
    expect(response.headers.vary).toMatch(/\bOrigin\b/);
  });

  it("is also named on errors, so the page can read why a request was refused", async () => {
    const response = await request(app).post("/api/vehicles/some-id/purchase").set("Origin", APP); // no token: 401

    expect(response.status).toBe(401);
    expect(response.headers["access-control-allow-origin"]).toBe(APP);
  });

  it("is named on a route that does not exist, too", async () => {
    const response = await request(app).get("/api/nothing-here").set("Origin", APP);

    expect(response.status).toBe(404);
    expect(response.headers["access-control-allow-origin"]).toBe(APP);
  });

  it("gets each allowed origin echoed back as itself, not the whole list", async () => {
    const response = await request(app).get("/api/vehicles").set("Origin", "http://localhost:5173");

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("is told what a preflight may ask for, and the preflight needs no login", async () => {
    const response = await request(app)
      .options("/api/vehicles/some-id/purchase")
      .set("Origin", APP)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "authorization,content-type");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(APP);
    const methods = String(response.headers["access-control-allow-methods"]).split(/\s*,\s*/);
    expect(methods).toEqual(expect.arrayContaining(["GET", "POST", "PUT", "DELETE"]));
    const headers = String(response.headers["access-control-allow-headers"]).toLowerCase().split(/\s*,\s*/);
    expect(headers).toEqual(expect.arrayContaining(["authorization", "content-type"]));
    expect(Number(response.headers["access-control-max-age"])).toBeGreaterThan(0);
  });

  it("does not get credentials (cookies) allowed: the app signs in with a bearer token", async () => {
    const response = await request(app).get("/api/vehicles").set("Origin", APP);

    expect(response.headers).not.toHaveProperty("access-control-allow-credentials");
  });
});

describe("an origin that is not on the list", () => {
  const app = appWith([APP]);

  it.each([
    ["another site", "https://evil.example"],
    ["a longer address that starts the same", `${APP}.evil.example`],
    ["the same host over plain http", "http://car-dealership.vercel.app"],
    ["the same host on another port", "https://car-dealership.vercel.app:8443"],
  ])("is not named, for %s", async (_label, origin) => {
    const response = await request(app).get("/api/vehicles").set("Origin", origin);

    expect(response.headers).not.toHaveProperty("access-control-allow-origin");
  });

  it("is not told what a preflight may ask for, so the browser stops the real request", async () => {
    const response = await request(app)
      .options("/api/vehicles")
      .set("Origin", "https://evil.example")
      .set("Access-Control-Request-Method", "POST");

    expect(response.headers).not.toHaveProperty("access-control-allow-origin");
    expect(response.headers).not.toHaveProperty("access-control-allow-methods");
  });
});

describe("a request with no Origin header (same-origin pages, curl, health checks)", () => {
  it("is answered as before and gets no CORS headers", async () => {
    const response = await request(appWith([APP])).post("/api/vehicles/some-id/purchase");

    expect(response.status).toBe(401);
    expect(response.headers).not.toHaveProperty("access-control-allow-origin");
  });
});

describe("when no origins are configured (local development, through the Vite proxy)", () => {
  it("adds no CORS headers at all", async () => {
    const response = await request(appWith([])).get("/api/vehicles").set("Origin", APP);

    expect(response.headers).not.toHaveProperty("access-control-allow-origin");
  });

  it("is the default when the dependency is left out", async () => {
    const { app } = buildTestApp();

    const response = await request(app).get("/api/vehicles").set("Origin", APP);

    expect(response.headers).not.toHaveProperty("access-control-allow-origin");
  });
});
