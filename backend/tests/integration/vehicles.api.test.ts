import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, prisma, signInAs, useCleanDatabase } from "../support/integration";

useCleanDatabase();

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
const camry = { make: "Toyota", model: "Camry", category: "Sedan", price: "19999.99", quantity: 3 };

async function addCamry(adminToken: string, overrides: object = {}): Promise<{ id: string }> {
  const response = await request(app)
    .post("/api/vehicles")
    .set(bearer(adminToken))
    .send({ ...camry, ...overrides });
  return response.body;
}

const stockOf = async (id: string) =>
  (await prisma.$queryRaw<{ quantity: number }[]>`SELECT quantity FROM "Vehicle" WHERE id = ${id}`)[0]?.quantity;

describe("vehicle API with the real database", () => {
  it("lets an admin stock the lot, and a customer browse, search and buy", async () => {
    const admin = await signInAs("ADMIN");
    const customer = await signInAs("USER");

    const created = await request(app).post("/api/vehicles").set(bearer(admin)).send(camry);
    expect(created.status).toBe(201);
    expect(created.body.price).toBe("19999.99");

    const listed = await request(app).get("/api/vehicles").set(bearer(customer));
    expect(listed.body).toEqual([{ ...camry, id: created.body.id }]);

    const found = await request(app).get("/api/vehicles/search?make=toy&maxPrice=19999.99").set(bearer(customer));
    expect(found.body).toHaveLength(1);

    const purchased = await request(app).post(`/api/vehicles/${created.body.id}/purchase`).set(bearer(customer));
    expect(purchased.status).toBe(200);
    expect(purchased.body.quantity).toBe(2);
    expect(await stockOf(created.body.id)).toBe(2);
  });

  it("compares prices exactly at the boundary, with no floating point error", async () => {
    const admin = await signInAs("ADMIN");
    await addCamry(admin);

    const search = (max: string) => request(app).get(`/api/vehicles/search?maxPrice=${max}`).set(bearer(admin));

    expect((await search("19999.99")).body).toHaveLength(1); // exactly the price: included
    expect((await search("19999.98")).body).toHaveLength(0); // one cent less: excluded
  });

  it("never sells more than the stock when many customers buy at the same moment", async () => {
    const admin = await signInAs("ADMIN");
    const customer = await signInAs("USER");
    const { id } = await addCamry(admin, { quantity: 3 });

    const responses = await Promise.all(
      Array.from({ length: 8 }, () => request(app).post(`/api/vehicles/${id}/purchase`).set(bearer(customer))),
    );

    const statuses = responses.map((r) => r.status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(3);
    expect(statuses.filter((s) => s === 409)).toHaveLength(5);
    expect(responses.filter((r) => r.status === 409).every((r) => r.body.error.code === "INSUFFICIENT_STOCK")).toBe(true);
    expect(await stockOf(id)).toBe(0);
  });

  it("does not let a regular customer change the catalog", async () => {
    const admin = await signInAs("ADMIN");
    const customer = await signInAs("USER");
    const { id } = await addCamry(admin);

    const attempts = await Promise.all([
      request(app).post("/api/vehicles").set(bearer(customer)).send(camry),
      request(app).put(`/api/vehicles/${id}`).set(bearer(customer)).send({ price: "1.00" }),
      request(app).delete(`/api/vehicles/${id}`).set(bearer(customer)),
      request(app).post(`/api/vehicles/${id}/restock`).set(bearer(customer)).send({ quantity: 100 }),
    ]);

    expect(attempts.map((r) => r.status)).toEqual([403, 403, 403, 403]);
    const rows = await prisma.$queryRaw<{ price: string; quantity: number }[]>`SELECT price::text AS price, quantity FROM "Vehicle"`;
    expect(rows).toEqual([{ price: "19999.99", quantity: 3 }]);
  });

  it("answers a restock past the stock limit with 409, not a server error, and keeps the stock", async () => {
    const admin = await signInAs("ADMIN");
    const { id } = await addCamry(admin);
    await prisma.$executeRaw`UPDATE "Vehicle" SET quantity = 999990 WHERE id = ${id}`;

    const over = await request(app).post(`/api/vehicles/${id}/restock`).set(bearer(admin)).send({ quantity: 11 });
    expect(over.status).toBe(409);
    expect(over.body.error.code).toBe("STOCK_LIMIT_EXCEEDED");
    expect(await stockOf(id)).toBe(999_990);

    const exact = await request(app).post(`/api/vehicles/${id}/restock`).set(bearer(admin)).send({ quantity: 10 });
    expect(exact.status).toBe(200);
    expect(exact.body.quantity).toBe(1_000_000);
  });

  it("refuses to edit the stock through PUT, and says where to go instead", async () => {
    const admin = await signInAs("ADMIN");
    const { id } = await addCamry(admin);

    const response = await request(app).put(`/api/vehicles/${id}`).set(bearer(admin)).send({ make: "Lexus", quantity: 50 });

    expect(response.status).toBe(400);
    expect(response.body.error.details).toEqual([{ field: "quantity", message: expect.stringMatching(/restock/i) }]);
    expect(await stockOf(id)).toBe(3);
  });

  it("lets an admin update, restock and delete, and a deleted vehicle can no longer be bought", async () => {
    const admin = await signInAs("ADMIN");
    const customer = await signInAs("USER");
    const { id } = await addCamry(admin, { quantity: 1 });

    const updated = await request(app).put(`/api/vehicles/${id}`).set(bearer(admin)).send({ price: 18500 });
    expect(updated.body.price).toBe("18500.00");

    const restocked = await request(app).post(`/api/vehicles/${id}/restock`).set(bearer(admin)).send({ quantity: 4 });
    expect(restocked.body.quantity).toBe(5);

    expect((await request(app).delete(`/api/vehicles/${id}`).set(bearer(admin))).status).toBe(204);
    expect((await request(app).post(`/api/vehicles/${id}/purchase`).set(bearer(customer))).status).toBe(404);
  });
});
