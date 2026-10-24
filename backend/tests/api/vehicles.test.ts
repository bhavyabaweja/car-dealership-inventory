import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { buildTestApp } from "../support/build-test-app";

const camry = { make: "Toyota", model: "Camry", category: "Sedan", price: "25000.00", quantity: 5 };

let ctx: ReturnType<typeof buildTestApp>;
let vehicleId: string;
let adminToken: string;
let userToken: string;

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeEach(async () => {
  ctx = buildTestApp();
  vehicleId = (await ctx.vehicles.create(camry)).id;
  adminToken = ctx.tokens.sign({ sub: "admin-1", role: "ADMIN" });
  userToken = ctx.tokens.sign({ sub: "user-1", role: "USER" });
});

type Call = (agent: ReturnType<typeof request>, id: string) => request.Test;

/** Every endpoint, who may call it, and what success looks like. */
const endpoints: Array<{ name: string; adminOnly: boolean; success: number; call: Call }> = [
  { name: "GET /api/vehicles", adminOnly: false, success: 200, call: (a) => a.get("/api/vehicles") },
  { name: "GET /api/vehicles/search", adminOnly: false, success: 200, call: (a) => a.get("/api/vehicles/search?make=toy") },
  { name: "POST /api/vehicles/:id/purchase", adminOnly: false, success: 200, call: (a, id) => a.post(`/api/vehicles/${id}/purchase`) },
  { name: "POST /api/vehicles", adminOnly: true, success: 201, call: (a) => a.post("/api/vehicles").send({ ...camry, model: "Corolla" }) },
  { name: "PUT /api/vehicles/:id", adminOnly: true, success: 200, call: (a, id) => a.put(`/api/vehicles/${id}`).send({ make: "Lexus" }) },
  { name: "DELETE /api/vehicles/:id", adminOnly: true, success: 204, call: (a, id) => a.delete(`/api/vehicles/${id}`) },
  { name: "POST /api/vehicles/:id/restock", adminOnly: true, success: 200, call: (a, id) => a.post(`/api/vehicles/${id}/restock`).send({ quantity: 3 }) },
];

describe.each(endpoints)("access to $name", ({ adminOnly, success, call }) => {
  it("needs a token", async () => {
    const response = await call(request(ctx.app), vehicleId);

    expect(response.status).toBe(401);
    expect(response.headers["www-authenticate"]).toMatch(/^Bearer/);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("rejects a forged token", async () => {
    const response = await call(request(ctx.app), vehicleId).set(bearer("not-a-real-token"));

    expect(response.status).toBe(401);
  });

  if (adminOnly) {
    it("is forbidden to a regular user, who changes nothing", async () => {
      const before = JSON.stringify(ctx.vehicles.vehicles);

      const response = await call(request(ctx.app), vehicleId).set(bearer(userToken));

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
      expect(JSON.stringify(ctx.vehicles.vehicles)).toBe(before);
    });

    it("is allowed to an admin", async () => {
      const response = await call(request(ctx.app), vehicleId).set(bearer(adminToken));

      expect(response.status).toBe(success);
    });
  } else {
    it("is allowed to a regular user", async () => {
      const response = await call(request(ctx.app), vehicleId).set(bearer(userToken));

      expect(response.status).toBe(success);
    });
  }
});

describe("POST /api/vehicles", () => {
  it("creates the vehicle and responds 201 with it, price as a string", async () => {
    const response = await request(ctx.app)
      .post("/api/vehicles")
      .set(bearer(adminToken))
      .send({ make: "Ford", model: "F-150", category: "Truck", price: 45999.99, quantity: 2 });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: expect.any(String),
      make: "Ford",
      model: "F-150",
      category: "Truck",
      price: "45999.99",
      quantity: 2,
    });
    expect(typeof response.body.price).toBe("string");
  });

  it("responds 400 VALIDATION_ERROR naming each invalid field, and creates nothing", async () => {
    const response = await request(ctx.app)
      .post("/api/vehicles")
      .set(bearer(adminToken))
      .send({ ...camry, make: "", price: "-5", quantity: 1.5 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    const fields = response.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(["make", "price", "quantity"]));
    expect(ctx.vehicles.vehicles).toHaveLength(1); // only the one from setup
  });

  it("responds 400 when there is no body", async () => {
    const response = await request(ctx.app).post("/api/vehicles").set(bearer(adminToken));

    expect(response.status).toBe(400);
  });
});

describe("GET /api/vehicles", () => {
  it("lists every vehicle, sold-out ones included, with prices as strings", async () => {
    await ctx.vehicles.create({ make: "Honda", model: "Civic", category: "Sedan", price: "22000.00", quantity: 0 });

    const response = await request(ctx.app).get("/api/vehicles").set(bearer(userToken));

    expect(response.status).toBe(200);
    expect(response.body).toEqual([
      expect.objectContaining({ make: "Honda", model: "Civic", quantity: 0, price: "22000.00" }),
      expect.objectContaining({ make: "Toyota", model: "Camry", quantity: 5, price: "25000.00" }),
    ]);
  });
});

describe("GET /api/vehicles/search", () => {
  beforeEach(async () => {
    await ctx.vehicles.create({ make: "Toyota", model: "RAV4", category: "SUV", price: "32000.50", quantity: 3 });
    await ctx.vehicles.create({ make: "Honda", model: "Civic", category: "Sedan", price: "22000.00", quantity: 0 });
  });

  const search = (query: string) => request(ctx.app).get(`/api/vehicles/search${query}`).set(bearer(userToken));
  const models = (response: request.Response) => response.body.map((v: { model: string }) => v.model);

  it("is not mistaken for a vehicle id", async () => {
    expect((await search("")).status).toBe(200);
  });

  it("filters by make, model and category", async () => {
    expect(models(await search("?make=toy"))).toEqual(["Camry", "RAV4"]);
    expect(models(await search("?model=CIV"))).toEqual(["Civic"]);
    expect(models(await search("?category=suv"))).toEqual(["RAV4"]);
  });

  it("filters by an inclusive price range", async () => {
    expect(models(await search("?minPrice=25000&maxPrice=32000.50"))).toEqual(["Camry", "RAV4"]);
    expect(models(await search("?minPrice=30000"))).toEqual(["RAV4"]);
  });

  it("combines filters and ignores blank ones, as an empty form sends them", async () => {
    expect(models(await search("?make=toyota&category=sedan&model=&minPrice="))).toEqual(["Camry"]);
  });

  it("finds nothing without an error", async () => {
    const response = await search("?make=ferrari");

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it.each([
    ["a minimum above the maximum", "?minPrice=30000&maxPrice=20000", "minPrice"],
    ["a price that is not a number", "?minPrice=cheap", "minPrice"],
    ["a filter given twice", "?make=a&make=b", "make"],
  ])("responds 400 for %s", async (_label, query, field) => {
    const response = await search(query);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details).toContainEqual({ field, message: expect.any(String) });
  });
});

describe("PUT /api/vehicles/:id", () => {
  it("updates the given fields and responds with the vehicle", async () => {
    const response = await request(ctx.app)
      .put(`/api/vehicles/${vehicleId}`)
      .set(bearer(adminToken))
      .send({ price: "24999.99", category: "Hybrid" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: vehicleId, ...camry, price: "24999.99", category: "Hybrid" });
  });

  it("leaves the stock alone even if a quantity is sent", async () => {
    const response = await request(ctx.app)
      .put(`/api/vehicles/${vehicleId}`)
      .set(bearer(adminToken))
      .send({ model: "Corolla", quantity: 999 });

    expect(response.body.quantity).toBe(5);
  });

  it("responds 400 when there is nothing valid to change", async () => {
    const response = await request(ctx.app).put(`/api/vehicles/${vehicleId}`).set(bearer(adminToken)).send({});

    expect(response.status).toBe(400);
  });

  it("responds 404 VEHICLE_NOT_FOUND for an unknown vehicle", async () => {
    const response = await request(ctx.app).put("/api/vehicles/no-such-id").set(bearer(adminToken)).send({ make: "Ford" });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("VEHICLE_NOT_FOUND");
  });
});

describe("DELETE /api/vehicles/:id", () => {
  it("deletes the vehicle and responds 204 with no body", async () => {
    const response = await request(ctx.app).delete(`/api/vehicles/${vehicleId}`).set(bearer(adminToken));

    expect(response.status).toBe(204);
    expect(response.text).toBe("");
    expect(ctx.vehicles.vehicles).toHaveLength(0);
  });

  it("responds 404 VEHICLE_NOT_FOUND for an unknown vehicle", async () => {
    const response = await request(ctx.app).delete("/api/vehicles/no-such-id").set(bearer(adminToken));

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("VEHICLE_NOT_FOUND");
  });
});

describe("POST /api/vehicles/:id/purchase", () => {
  const purchase = (id: string) => request(ctx.app).post(`/api/vehicles/${id}/purchase`).set(bearer(userToken));

  it("takes one unit when no body is sent and responds with the vehicle", async () => {
    const response = await purchase(vehicleId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: vehicleId, ...camry, quantity: 4 });
  });

  it("takes the requested number of units", async () => {
    expect((await purchase(vehicleId).send({ quantity: 3 })).body.quantity).toBe(2);
  });

  it("responds 409 INSUFFICIENT_STOCK when too few are left, and keeps the stock", async () => {
    const response = await purchase(vehicleId).send({ quantity: 6 });

    expect(response.status).toBe(409);
    expect(response.body.error).toEqual({ code: "INSUFFICIENT_STOCK", message: expect.stringContaining("5") });
    expect(ctx.vehicles.vehicles[0]?.quantity).toBe(5);
  });

  it("cannot buy a sold-out vehicle", async () => {
    await ctx.vehicles.adjustStock(vehicleId, -5);

    expect((await purchase(vehicleId)).status).toBe(409);
  });

  it("responds 400 for a quantity that makes no sense", async () => {
    const response = await purchase(vehicleId).send({ quantity: -2 });

    expect(response.status).toBe(400);
    expect(ctx.vehicles.vehicles[0]?.quantity).toBe(5);
  });

  it("responds 404 VEHICLE_NOT_FOUND for an unknown vehicle", async () => {
    const response = await purchase("no-such-id");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("VEHICLE_NOT_FOUND");
  });
});

describe("POST /api/vehicles/:id/restock", () => {
  const restock = (id: string) => request(ctx.app).post(`/api/vehicles/${id}/restock`).set(bearer(adminToken));

  it("adds the given number of units", async () => {
    const response = await restock(vehicleId).send({ quantity: 7 });

    expect(response.status).toBe(200);
    expect(response.body.quantity).toBe(12);
  });

  it.each([[{}], [{ quantity: -3 }], [{ quantity: 0 }], [{ quantity: "2" }]])("responds 400 for %j", async (body) => {
    const response = await restock(vehicleId).send(body);

    expect(response.status).toBe(400);
    expect(ctx.vehicles.vehicles[0]?.quantity).toBe(5);
  });

  it("responds 404 VEHICLE_NOT_FOUND for an unknown vehicle", async () => {
    const response = await restock("no-such-id").send({ quantity: 1 });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("VEHICLE_NOT_FOUND"); // not the generic NOT_FOUND of a missing route
  });
});

describe("unknown vehicle routes", () => {
  it("answer 404 NOT_FOUND in the standard shape", async () => {
    const response = await request(ctx.app).get("/api/vehicles/a/b/c").set(bearer(userToken));

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});
