import { describe, expect, it } from "vitest";
import type { Vehicle } from "../api/types";
import { changedFields, validateRestock, validateVehicleForm, type VehicleFormValues } from "./vehicleForm";

const values = (overrides: Partial<VehicleFormValues> = {}): VehicleFormValues => ({
  make: "Toyota",
  model: "Camry",
  category: "Sedan",
  price: "25000",
  quantity: "5",
  ...overrides,
});

const PRICE_MESSAGE = "Enter an amount like 25000 or 25000.50.";
const QUANTITY_MESSAGE = "Enter a whole number from 0 to 100000.";

describe("validateVehicleForm", () => {
  it("turns a good form into what the server wants: text trimmed, the price as typed, the quantity a number", () => {
    const result = validateVehicleForm(values({ make: "  Toyota ", price: " 25000.5 ", quantity: "5" }), { withQuantity: true });

    expect(result.errors).toEqual({});
    expect(result.data).toEqual({ make: "Toyota", model: "Camry", category: "Sedan", price: "25000.5", quantity: 5 });
  });

  it("leaves the quantity out when the form has no stock field, as when editing", () => {
    const result = validateVehicleForm(values({ quantity: "" }), { withQuantity: false });

    expect(result.errors).toEqual({});
    expect(result.data).toEqual({ make: "Toyota", model: "Camry", category: "Sedan", price: "25000" });
  });

  it("names every problem at once, so nobody fixes one field only to meet the next", () => {
    const { errors, data } = validateVehicleForm(values({ make: "", model: "  ", category: "", price: "", quantity: "" }), {
      withQuantity: true,
    });

    expect(errors).toEqual({
      make: "Enter the make.",
      model: "Enter the model.",
      category: "Enter the category.",
      price: "Enter a price.",
      quantity: QUANTITY_MESSAGE,
    });
    expect(data).toBeUndefined();
  });

  it.each(["make", "model", "category"] as const)("refuses a %s of more than 50 characters, which the server would refuse", (field) => {
    expect(validateVehicleForm(values({ [field]: "x".repeat(51) }), { withQuantity: true }).errors[field]).toBe("Use 50 characters or fewer.");
    expect(validateVehicleForm(values({ [field]: "x".repeat(50) }), { withQuantity: true }).errors[field]).toBeUndefined();
  });

  describe("price", () => {
    it.each([["abc"], ["-5"], ["1e5"], ["1,000"], ["10.999"], ["100000000"], ["$25"], ["."]])("explains %j", (price) => {
      expect(validateVehicleForm(values({ price }), { withQuantity: true }).errors.price).toBe(PRICE_MESSAGE);
    });

    it.each([["0"], ["0.00"], ["0.0"]])("refuses %j: a vehicle is not free", (price) => {
      expect(validateVehicleForm(values({ price }), { withQuantity: true }).errors.price).toBe("The price must be above zero.");
    });

    it.each([["0.01"], ["99999999.99"], ["25000"], ["25000.50"]])("accepts %j", (price) => {
      expect(validateVehicleForm(values({ price }), { withQuantity: true }).errors.price).toBeUndefined();
    });
  });

  describe("quantity", () => {
    it.each([["-1"], ["1.5"], ["abc"], ["1e3"], ["100001"], [""]])("explains %j", (quantity) => {
      expect(validateVehicleForm(values({ quantity }), { withQuantity: true }).errors.quantity).toBe(QUANTITY_MESSAGE);
    });

    it.each([["0", 0], ["100000", 100000], [" 7 ", 7]])("accepts %j as %i", (quantity, expected) => {
      const result = validateVehicleForm(values({ quantity }), { withQuantity: true });

      expect(result.errors.quantity).toBeUndefined();
      expect(result.data?.quantity).toBe(expected);
    });
  });
});

describe("validateRestock", () => {
  it.each([["10", 10], [" 5 ", 5], ["1", 1], ["100000", 100000]])("accepts %j as %i", (text, quantity) => {
    expect(validateRestock(text)).toEqual({ quantity });
  });

  it.each([[""], ["0"], ["-3"], ["2.5"], ["abc"], ["1e2"], ["100001"]])("explains %j, and a negative number cannot pose as a purchase", (text) => {
    expect(validateRestock(text)).toEqual({ error: "Enter a whole number from 1 to 100000." });
  });
});

describe("changedFields", () => {
  const camry: Vehicle = { id: "v1", make: "Toyota", model: "Camry", category: "Sedan", price: "25000.00", quantity: 5 };
  const data = (overrides: Partial<Record<"make" | "model" | "category" | "price", string>> = {}) => ({
    make: "Toyota",
    model: "Camry",
    category: "Sedan",
    price: "25000.00",
    ...overrides,
  });

  it("is empty when nothing was changed", () => {
    expect(changedFields(camry, data())).toEqual({});
  });

  it("holds only what differs", () => {
    expect(changedFields(camry, data({ price: "24999.99" }))).toEqual({ price: "24999.99" });
    expect(changedFields(camry, data({ model: "Corolla", category: "Hybrid" }))).toEqual({ model: "Corolla", category: "Hybrid" });
  });

  it("sees 25000 and 25000.00 as the same price, since the server stores two decimals", () => {
    expect(changedFields(camry, data({ price: "25000" }))).toEqual({});
    expect(changedFields(camry, data({ price: "25000.5" }))).toEqual({ price: "25000.5" });
  });

  it("treats a change of letter case as a change", () => {
    expect(changedFields(camry, data({ make: "TOYOTA" }))).toEqual({ make: "TOYOTA" });
  });
});
