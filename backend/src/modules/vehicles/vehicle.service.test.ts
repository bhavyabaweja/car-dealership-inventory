import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryVehicleRepository } from "../../../tests/support/vehicle-test-doubles";
import { ConflictError, NotFoundError, ValidationError } from "../../errors/app-error";
import { VehicleService } from "./vehicle.service";

const camry = { make: "Toyota", model: "Camry", category: "Sedan", price: "25000.00", quantity: 5 };

describe("VehicleService", () => {
  let repository: InMemoryVehicleRepository;
  let service: VehicleService;

  beforeEach(() => {
    repository = new InMemoryVehicleRepository();
    service = new VehicleService(repository);
  });

  /** Puts a vehicle straight into the repository, as test setup. */
  const stock = (overrides: Partial<typeof camry> = {}) => repository.create({ ...camry, ...overrides });

  describe("create", () => {
    it("stores the vehicle and returns it with its id", async () => {
      const vehicle = await service.create(camry);

      expect(vehicle).toEqual({ id: expect.any(String), ...camry });
      expect(repository.vehicles).toHaveLength(1);
    });

    it("starts with no stock when no quantity is given", async () => {
      const { quantity } = await service.create({ make: "Ford", model: "F-150", category: "Truck", price: "45999.99" });

      expect(quantity).toBe(0);
    });

    it("trims the text fields", async () => {
      const vehicle = await service.create({ ...camry, make: "  Toyota ", model: " Camry", category: "Sedan  " });

      expect(vehicle).toMatchObject({ make: "Toyota", model: "Camry", category: "Sedan" });
    });

    it.each([
      ["1500", "1500.00"],
      ["1500.5", "1500.50"],
      ["0.99", "0.99"],
      ["99999999.99", "99999999.99"],
      [25000.5, "25000.50"],
      [18000, "18000.00"],
      [" 12.30 ", "12.30"],
    ])("accepts the price %j and keeps it as the exact string %s", async (given, expected) => {
      expect((await service.create({ ...camry, price: given })).price).toBe(expected);
    });

    it("ignores fields the client may not set, such as the id", async () => {
      const vehicle = await service.create({ ...camry, id: "chosen-by-client" });

      expect(vehicle.id).not.toBe("chosen-by-client");
    });

    describe("rejects", () => {
      const rejected: Array<[string, unknown]> = [
        ["a missing make", { ...camry, make: undefined }],
        ["a blank make", { ...camry, make: "   " }],
        ["a make over 50 characters", { ...camry, make: "x".repeat(51) }],
        ["a missing model", { ...camry, model: undefined }],
        ["a missing category", { ...camry, category: undefined }],
        ["a non-string make", { ...camry, make: 42 }],
        ["a missing price", { ...camry, price: undefined }],
        ["a non-numeric price", { ...camry, price: "cheap" }],
        ["a price of zero", { ...camry, price: "0" }],
        ["a price of 0.00", { ...camry, price: "0.00" }],
        ["a negative price", { ...camry, price: "-5" }],
        ["a price with three decimals, which would be rounded silently", { ...camry, price: "10.999" }],
        ["a price in scientific notation", { ...camry, price: "1e5" }],
        ["a price above the 99,999,999.99 maximum", { ...camry, price: "100000000" }],
        ["a float with binary noise as price", { ...camry, price: 0.1 + 0.2 }],
        ["a boolean price", { ...camry, price: true }],
        ["a negative quantity", { ...camry, quantity: -1 }],
        ["a fractional quantity", { ...camry, quantity: 1.5 }],
        ["a quantity sent as text", { ...camry, quantity: "5" }],
        ["a quantity over the 100,000 maximum", { ...camry, quantity: 100_001 }],
        ["no input at all", undefined],
      ];

      it.each(rejected)("%s", async (_label, input) => {
        await expect(service.create(input)).rejects.toBeInstanceOf(ValidationError);
        expect(repository.vehicles).toHaveLength(0);
      });

      it("and says which fields are wrong", async () => {
        const error = await service.create({ ...camry, make: "", price: "-1" }).catch((e) => e);

        expect(error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ field: "make" }),
            expect.objectContaining({ field: "price" }),
          ]),
        );
      });
    });
  });

  describe("list", () => {
    it("returns every vehicle, including sold-out ones, ordered by make and model", async () => {
      await stock({ make: "Toyota", model: "Camry" });
      await stock({ make: "Honda", model: "Civic", quantity: 0 });
      await stock({ make: "Toyota", model: "Corolla" });

      const names = (await service.list()).map((v) => `${v.make} ${v.model}`);

      expect(names).toEqual(["Honda Civic", "Toyota Camry", "Toyota Corolla"]);
    });
  });

  describe("search", () => {
    beforeEach(async () => {
      await stock({ make: "Toyota", model: "Camry", category: "Sedan", price: "25000.00" });
      await stock({ make: "Toyota", model: "RAV4", category: "SUV", price: "32000.50" });
      await stock({ make: "Honda", model: "Civic", category: "Sedan", price: "22000.00", quantity: 0 });
    });

    const found = async (query: unknown) => (await service.search(query)).map((v) => v.model);

    it("returns everything when there is no query, or only blank values, as an empty search form sends", async () => {
      expect(await found(undefined)).toHaveLength(3);
      expect(await found({})).toHaveLength(3);
      expect(await found({ make: "", model: "  ", category: "", minPrice: "", maxPrice: "" })).toHaveLength(3);
    });

    it("filters by make, model and category", async () => {
      expect(await found({ make: "toy" })).toEqual(["Camry", "RAV4"]);
      expect(await found({ model: "civ" })).toEqual(["Civic"]);
      expect(await found({ category: "SUV" })).toEqual(["RAV4"]);
    });

    it("filters by an inclusive price range, with either end optional", async () => {
      expect(await found({ minPrice: "25000", maxPrice: "32000.50" })).toEqual(["Camry", "RAV4"]);
      expect(await found({ minPrice: "30000" })).toEqual(["RAV4"]);
      expect(await found({ maxPrice: "22000" })).toEqual(["Civic"]);
    });

    it("combines filters with AND", async () => {
      expect(await found({ make: "toyota", category: "sedan", maxPrice: "30000" })).toEqual(["Camry"]);
    });

    it("trims text filters and ignores parameters it does not know", async () => {
      expect(await found({ make: "  honda ", colour: "red" })).toEqual(["Civic"]);
    });

    it("accepts prices given as numbers", async () => {
      expect(await found({ minPrice: 30000 })).toEqual(["RAV4"]);
    });

    it.each([
      ["a minimum price above the maximum", { minPrice: "30000", maxPrice: "20000" }, "minPrice"],
      ["a non-numeric minimum price", { minPrice: "cheap" }, "minPrice"],
      ["a negative maximum price", { maxPrice: "-1" }, "maxPrice"],
      ["a price with three decimals", { maxPrice: "10.999" }, "maxPrice"],
      ["a filter over 50 characters", { make: "x".repeat(51) }, "make"],
      ["a filter given twice, as ?make=a&make=b sends", { make: ["a", "b"] }, "make"],
    ])("rejects %s", async (_label, query, field) => {
      const error = await service.search(query).catch((e) => e);

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.details).toContainEqual(expect.objectContaining({ field }));
    });
  });

  describe("update", () => {
    it("changes only the given fields and returns the vehicle", async () => {
      const { id } = await stock();

      const updated = await service.update(id, { price: 24999.99, category: " Hybrid " });

      expect(updated).toEqual({ id, ...camry, price: "24999.99", category: "Hybrid" });
    });

    it.each([
      ["a quantity next to a real change", { model: "Corolla", quantity: 999 }],
      ["only a quantity", { quantity: 3 }],
      ["a quantity of zero", { make: "Ford", quantity: 0 }],
      ["a null quantity", { make: "Ford", quantity: null }],
    ])("refuses %s, pointing to restock, instead of ignoring it, and changes nothing", async (_label, input) => {
      const { id } = await stock({ quantity: 5 });

      const error = await service.update(id, input).catch((e) => e);

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.details).toEqual([{ field: "quantity", message: expect.stringMatching(/restock/i) }]);
      expect(repository.vehicles[0]).toMatchObject(camry);
    });

    it.each([
      ["nothing to change", {}],
      ["no input at all", undefined],
      ["a blank make", { make: "  " }],
      ["a price of zero", { price: "0" }],
      ["a price with three decimals", { price: "1.234" }],
    ])("rejects %s and changes nothing", async (_label, input) => {
      const { id } = await stock();

      await expect(service.update(id, input)).rejects.toBeInstanceOf(ValidationError);
      expect(repository.vehicles[0]).toMatchObject(camry);
    });

    it("reports an unknown vehicle as VEHICLE_NOT_FOUND", async () => {
      const error = await service.update("no-such-id", { make: "Ford" }).catch((e) => e);

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.code).toBe("VEHICLE_NOT_FOUND");
    });
  });

  describe("remove", () => {
    it("deletes the vehicle", async () => {
      const { id } = await stock();

      await service.remove(id);

      expect(repository.vehicles).toHaveLength(0);
    });

    it("reports an unknown vehicle as VEHICLE_NOT_FOUND", async () => {
      await expect(service.remove("no-such-id")).rejects.toMatchObject({ code: "VEHICLE_NOT_FOUND" });
    });
  });

  describe("purchase", () => {
    it("takes one unit by default, even without any input", async () => {
      const { id } = await stock({ quantity: 5 });

      expect((await service.purchase(id, undefined)).quantity).toBe(4);
      expect((await service.purchase(id, {})).quantity).toBe(3);
    });

    it("takes the requested number of units", async () => {
      const { id } = await stock({ quantity: 5 });

      expect((await service.purchase(id, { quantity: 3 })).quantity).toBe(2);
    });

    it("sells the last unit, leaving none", async () => {
      const { id } = await stock({ quantity: 1 });

      expect((await service.purchase(id, {})).quantity).toBe(0);
    });

    it.each([
      ["more than is in stock", 2, { quantity: 3 }],
      ["a vehicle that is sold out", 0, {}],
    ])("refuses %s with INSUFFICIENT_STOCK, saying how many are left, and changes nothing", async (_label, quantity, input) => {
      const { id } = await stock({ quantity });

      const error = await service.purchase(id, input).catch((e) => e);

      expect(error).toBeInstanceOf(ConflictError);
      expect(error.code).toBe("INSUFFICIENT_STOCK");
      expect(error.message).toContain(String(quantity));
      expect(repository.vehicles[0]?.quantity).toBe(quantity);
    });

    it.each([
      ["zero units", { quantity: 0 }],
      ["a negative number of units", { quantity: -1 }],
      ["a fractional number of units", { quantity: 1.5 }],
      ["units sent as text", { quantity: "2" }],
      ["more than the 100,000 maximum", { quantity: 100_001 }],
    ])("rejects %s and changes nothing", async (_label, input) => {
      const { id } = await stock({ quantity: 5 });

      await expect(service.purchase(id, input)).rejects.toBeInstanceOf(ValidationError);
      expect(repository.vehicles[0]?.quantity).toBe(5);
    });

    it("reports an unknown vehicle as VEHICLE_NOT_FOUND", async () => {
      await expect(service.purchase("no-such-id", {})).rejects.toMatchObject({ code: "VEHICLE_NOT_FOUND" });
    });

    it("lets an unexpected repository failure through instead of reporting it as a shortage of stock", async () => {
      const { id } = await stock();
      const outage = new Error("connection lost");
      vi.spyOn(repository, "adjustStock").mockRejectedValue(outage);

      await expect(service.purchase(id, {})).rejects.toBe(outage);
    });
  });

  describe("restock", () => {
    it("adds the given number of units", async () => {
      const { id } = await stock({ quantity: 2 });

      expect((await service.restock(id, { quantity: 10 })).quantity).toBe(12);
    });

    it("can bring a sold-out vehicle back", async () => {
      const { id } = await stock({ quantity: 0 });

      expect((await service.restock(id, { quantity: 1 })).quantity).toBe(1);
    });

    it.each([
      ["no quantity", {}],
      ["no input at all", undefined],
      ["zero units", { quantity: 0 }],
      ["a negative number, which would be a disguised purchase", { quantity: -3 }],
      ["a fractional number", { quantity: 2.5 }],
      ["units sent as text", { quantity: "4" }],
      ["more than the 100,000 maximum", { quantity: 100_001 }],
    ])("rejects %s and changes nothing", async (_label, input) => {
      const { id } = await stock({ quantity: 2 });

      await expect(service.restock(id, input)).rejects.toBeInstanceOf(ValidationError);
      expect(repository.vehicles[0]?.quantity).toBe(2);
    });

    it("can fill the stock exactly to the 1,000,000 limit", async () => {
      const { id } = await stock({ quantity: 999_900 });

      expect((await service.restock(id, { quantity: 100 })).quantity).toBe(1_000_000);
    });

    it("refuses units that would take the stock over the limit with STOCK_LIMIT_EXCEEDED, saying how many fit, and changes nothing", async () => {
      const { id } = await stock({ quantity: 999_950 });

      const error = await service.restock(id, { quantity: 100 }).catch((e) => e);

      expect(error).toBeInstanceOf(ConflictError);
      expect(error.code).toBe("STOCK_LIMIT_EXCEEDED");
      expect(error.message).toContain("1000000");
      expect(error.message).toContain("50");
      expect(repository.vehicles[0]?.quantity).toBe(999_950);
    });

    it("lets an unexpected repository failure through instead of reporting it as a full warehouse", async () => {
      const { id } = await stock();
      const outage = new Error("connection lost");
      vi.spyOn(repository, "adjustStock").mockRejectedValue(outage);

      await expect(service.restock(id, { quantity: 1 })).rejects.toBe(outage);
    });

    it("reports an unknown vehicle as VEHICLE_NOT_FOUND", async () => {
      await expect(service.restock("no-such-id", { quantity: 1 })).rejects.toMatchObject({
        code: "VEHICLE_NOT_FOUND",
      });
    });
  });
});
