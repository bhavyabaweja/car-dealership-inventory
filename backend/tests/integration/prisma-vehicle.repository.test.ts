import { describe, expect, it } from "vitest";
import { PrismaVehicleRepository } from "../../src/modules/vehicles/prisma-vehicle.repository";
import { InsufficientStockError, type NewVehicle } from "../../src/modules/vehicles/vehicle.repository";
import { prisma, useCleanDatabase } from "../support/integration";

useCleanDatabase();

const vehicles = new PrismaVehicleRepository(prisma);

const camry: NewVehicle = { make: "Toyota", model: "Camry", category: "Sedan", price: "25000.00", quantity: 5 };

/** Inserts straight through SQL, bypassing the repository, to test the database's own rules. */
function insertRaw({ price = "25000.00", quantity = 1 }: { price?: string; quantity?: number }) {
  return prisma.$executeRaw`
    INSERT INTO "Vehicle" (id, make, model, category, price, quantity, "updatedAt")
    VALUES (gen_random_uuid()::text, 'Toyota', 'Camry', 'Sedan', ${price}::numeric, ${quantity}, now())`;
}

async function seedCatalog() {
  await vehicles.create(camry);
  await vehicles.create({ make: "Toyota", model: "RAV4", category: "SUV", price: "32000.50", quantity: 3 });
  await vehicles.create({ make: "Honda", model: "Civic", category: "Sedan", price: "22000.00", quantity: 0 });
  await vehicles.create({ make: "Ford", model: "F-150", category: "Truck", price: "45999.99", quantity: 2 });
  await vehicles.create({ make: "BMW", model: "X5", category: "SUV", price: "61000.00", quantity: 1 });
}

const names = (found: { make: string; model: string }[]) => found.map((v) => `${v.make} ${v.model}`);

describe("PrismaVehicleRepository.create", () => {
  it("stores the vehicle and returns it with the price as an exact two-decimal string", async () => {
    const vehicle = await vehicles.create(camry);

    expect(vehicle).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      make: "Toyota",
      model: "Camry",
      category: "Sedan",
      price: "25000.00",
      quantity: 5,
    });
  });

  it.each([
    ["19999.99", "19999.99"],
    ["0.10", "0.10"],
    ["1500", "1500.00"],
    ["99999999.99", "99999999.99"],
  ])("keeps the price %s exact, as %s", async (given, expected) => {
    const vehicle = await vehicles.create({ ...camry, price: given });

    expect(vehicle.price).toBe(expected);
    expect((await vehicles.findAll())[0]?.price).toBe(expected);
  });
});

describe("PrismaVehicleRepository.findAll", () => {
  it("returns everything, including sold-out vehicles, ordered by make then model", async () => {
    await seedCatalog();

    expect(names(await vehicles.findAll())).toEqual(["BMW X5", "Ford F-150", "Honda Civic", "Toyota Camry", "Toyota RAV4"]);
  });

  it("returns an empty list when there are no vehicles", async () => {
    expect(await vehicles.findAll()).toEqual([]);
  });

  describe("filters", () => {
    it("match make, model and category partially and without regard to case", async () => {
      await seedCatalog();

      expect(names(await vehicles.findAll({ make: "toy" }))).toEqual(["Toyota Camry", "Toyota RAV4"]);
      expect(names(await vehicles.findAll({ model: "CIV" }))).toEqual(["Honda Civic"]);
      expect(names(await vehicles.findAll({ category: "suv" }))).toEqual(["BMW X5", "Toyota RAV4"]);
    });

    it("treat %, _ and \\ as ordinary characters, not wildcards or escapes", async () => {
      await seedCatalog();
      await vehicles.create({ ...camry, make: "Pct%", model: "Under_score", category: "Back\\slash" });
      const special = ["Pct% Under_score"];

      // As wildcards, "%" and "_" would match every vehicle; they must match only the one containing them.
      expect(names(await vehicles.findAll({ make: "%" }))).toEqual(special);
      expect(names(await vehicles.findAll({ model: "_" }))).toEqual(special);
      // An unescaped "\" would escape the closing wildcard and stop matching a literal backslash.
      expect(names(await vehicles.findAll({ category: "\\" }))).toEqual(special);
    });

    it("include both ends of a price range", async () => {
      await seedCatalog();

      expect(names(await vehicles.findAll({ minPrice: "25000", maxPrice: "32000.50" }))).toEqual([
        "Toyota Camry",
        "Toyota RAV4",
      ]);
    });

    it("compare prices as numbers, not as text", async () => {
      await seedCatalog();

      // As text, "9000" sorts after "25000.00"; as a number it is far below every price.
      expect(await vehicles.findAll({ minPrice: "9000" })).toHaveLength(5);
      expect(names(await vehicles.findAll({ maxPrice: "30000" }))).toEqual(["Honda Civic", "Toyota Camry"]);
    });

    it("combine with AND", async () => {
      await seedCatalog();

      expect(names(await vehicles.findAll({ make: "toyota", category: "suv" }))).toEqual(["Toyota RAV4"]);
      expect(await vehicles.findAll({ make: "toyota", maxPrice: "1000" })).toEqual([]);
    });

    it("are ignored when empty", async () => {
      await seedCatalog();

      expect(await vehicles.findAll({})).toHaveLength(5);
    });
  });
});

describe("PrismaVehicleRepository.update", () => {
  it("changes only the given fields and returns the vehicle", async () => {
    const { id } = await vehicles.create(camry);

    const updated = await vehicles.update(id, { price: "24999.99", category: "Hybrid" });

    expect(updated).toEqual({ id, make: "Toyota", model: "Camry", category: "Hybrid", price: "24999.99", quantity: 5 });
  });

  it("returns null for a vehicle that does not exist", async () => {
    expect(await vehicles.update("no-such-id", { make: "Ford" })).toBeNull();
  });

  it("reports a database failure as an error, not as a missing vehicle", async () => {
    const { id } = await vehicles.create(camry);

    // Violates the positive-price CHECK constraint; the vehicle exists, so null would be a lie.
    await expect(vehicles.update(id, { price: "0" })).rejects.toThrow();
    expect((await vehicles.findAll())[0]?.price).toBe("25000.00");
  });
});

describe("PrismaVehicleRepository.remove", () => {
  it("deletes the vehicle and says so", async () => {
    const { id } = await vehicles.create(camry);

    expect(await vehicles.remove(id)).toBe(true);
    expect(await vehicles.findAll()).toEqual([]);
  });

  it("returns false for a vehicle that does not exist", async () => {
    expect(await vehicles.remove("no-such-id")).toBe(false);
  });
});

describe("PrismaVehicleRepository.adjustStock", () => {
  it("adds and removes stock and returns the new quantity", async () => {
    const { id } = await vehicles.create(camry);

    expect((await vehicles.adjustStock(id, 10))?.quantity).toBe(15);
    expect((await vehicles.adjustStock(id, -4))?.quantity).toBe(11);
  });

  it("allows selling the very last unit", async () => {
    const { id } = await vehicles.create({ ...camry, quantity: 1 });

    expect((await vehicles.adjustStock(id, -1))?.quantity).toBe(0);
  });

  it("refuses to go below zero, reports what is available, and leaves the stock alone", async () => {
    const { id } = await vehicles.create({ ...camry, quantity: 2 });

    const error = await vehicles.adjustStock(id, -3).catch((e) => e);

    expect(error).toBeInstanceOf(InsufficientStockError);
    expect(error).toMatchObject({ available: 2, requested: 3 });
    expect((await vehicles.findAll())[0]?.quantity).toBe(2);
  });

  it("returns null for a vehicle that does not exist", async () => {
    expect(await vehicles.adjustStock("no-such-id", -1)).toBeNull();
    expect(await vehicles.adjustStock("no-such-id", 5)).toBeNull();
  });

  describe("at the stock limit of 1,000,000", () => {
    it("allows filling the stock exactly to the limit", async () => {
      const { id } = await vehicles.create({ ...camry, quantity: 999_990 });

      expect((await vehicles.adjustStock(id, 10))?.quantity).toBe(1_000_000);
    });

    it("refuses to go over it, reports the room left, and leaves the stock alone", async () => {
      const { id } = await vehicles.create({ ...camry, quantity: 999_990 });

      const error = await vehicles.adjustStock(id, 11).catch((e) => e);

      expect(error).toMatchObject({ name: "StockLimitExceededError", current: 999_990, requested: 11, room: 10 });
      expect((await vehicles.findAll())[0]?.quantity).toBe(999_990);
    });

    it("still reports a missing vehicle as null, even for a restock too large to fit anywhere", async () => {
      expect(await vehicles.adjustStock("no-such-id", 2_000_000)).toBeNull();
    });

    it("never goes over it when restocks race: of 3 simultaneous restocks of 400,000, exactly 2 succeed", async () => {
      const { id } = await vehicles.create({ ...camry, quantity: 0 });

      const attempts = await Promise.allSettled(Array.from({ length: 3 }, () => vehicles.adjustStock(id, 400_000)));

      const rejected = attempts.filter((a): a is PromiseRejectedResult => a.status === "rejected");
      expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(2);
      expect(rejected).toHaveLength(1);
      expect(rejected[0]?.reason).toMatchObject({ name: "StockLimitExceededError" });
      expect((await vehicles.findAll())[0]?.quantity).toBe(800_000);
    });
  });

  it("never oversells: of 20 simultaneous purchases of 5 units, exactly 5 succeed", async () => {
    const { id } = await vehicles.create({ ...camry, quantity: 5 });

    const attempts = await Promise.allSettled(Array.from({ length: 20 }, () => vehicles.adjustStock(id, -1)));

    const rejected = attempts.filter((a): a is PromiseRejectedResult => a.status === "rejected");
    expect(attempts.filter((a) => a.status === "fulfilled")).toHaveLength(5);
    expect(rejected).toHaveLength(15);
    expect(rejected.every((a) => a.reason instanceof InsufficientStockError)).toBe(true);
    expect((await vehicles.findAll())[0]?.quantity).toBe(0);
  });
});

describe("database-level vehicle rules", () => {
  it("rejects a negative quantity, however it is written", async () => {
    await expect(insertRaw({ quantity: -1 })).rejects.toThrow(/Vehicle_quantity_non_negative/);
  });

  it("rejects stock being pushed below zero by a plain UPDATE", async () => {
    const { id } = await vehicles.create({ ...camry, quantity: 1 });

    await expect(prisma.$executeRaw`UPDATE "Vehicle" SET quantity = quantity - 2 WHERE id = ${id}`).rejects.toThrow(
      /Vehicle_quantity_non_negative/,
    );
  });

  it("accepts stock of exactly 1,000,000 but rejects one more, however it is written", async () => {
    await expect(insertRaw({ quantity: 1_000_000 })).resolves.toBe(1);
    await expect(insertRaw({ quantity: 1_000_001 })).rejects.toThrow(/Vehicle_quantity_within_limit/);
  });

  it("rejects stock being pushed over the limit by a plain UPDATE", async () => {
    const { id } = await vehicles.create({ ...camry, quantity: 1_000_000 });

    await expect(prisma.$executeRaw`UPDATE "Vehicle" SET quantity = quantity + 1 WHERE id = ${id}`).rejects.toThrow(
      /Vehicle_quantity_within_limit/,
    );
  });

  it.each([["0"], ["-100.00"]])("rejects a price of %s", async (price) => {
    await expect(insertRaw({ price })).rejects.toThrow(/Vehicle_price_positive/);
  });
});
