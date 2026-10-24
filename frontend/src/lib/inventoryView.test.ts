import { describe, expect, it } from "vitest";
import { vehicle } from "../test/helpers";
import { applyView, categoryTabs, defaultView, type InventoryView } from "./inventoryView";

const camry = vehicle({ id: "camry", model: "Camry", category: "Sedan", price: "25000.00", quantity: 5 });
const civic = vehicle({ id: "civic", make: "Honda", model: "Civic", category: "Sedan", price: "22000.00", quantity: 0 });
const rav4 = vehicle({ id: "rav4", model: "RAV4", category: "SUV", price: "32000.50", quantity: 2 });
const f150 = vehicle({ id: "f150", make: "Ford", model: "F-150", category: "Truck", price: "9999.99", quantity: 7 });
const all = [camry, civic, rav4, f150];

const ids = (vehicles: { id: string }[]) => vehicles.map((v) => v.id);
const view = (changes: Partial<InventoryView>): InventoryView => ({ ...defaultView, ...changes });

describe("categoryTabs", () => {
  it("counts the vehicles in each category, most first, ties in alphabetical order", () => {
    expect(categoryTabs(all, false)).toEqual([
      { key: "sedan", label: "Sedan", count: 2 },
      { key: "suv", label: "SUV", count: 1 },
      { key: "truck", label: "Truck", count: 1 },
    ]);
  });

  it("puts a bigger category before one that comes earlier in the alphabet", () => {
    const tabs = categoryTabs(
      [vehicle({ id: "a", category: "Sedan" }), vehicle({ id: "b", category: "Truck" }), vehicle({ id: "c", category: "Truck" })],
      false,
    );

    expect(tabs.map((tab) => tab.label)).toEqual(["Truck", "Sedan"]);
  });

  it("treats spellings that differ only in case or spacing as one category, keeping the first spelling seen", () => {
    const tabs = categoryTabs(
      [vehicle({ id: "a", category: "Sedan" }), vehicle({ id: "b", category: " sedan " }), vehicle({ id: "c", category: "SEDAN" })],
      false,
    );

    expect(tabs).toEqual([{ key: "sedan", label: "Sedan", count: 3 }]);
  });

  it("counts only what is in stock when asked to, but still lists a category that has none", () => {
    expect(categoryTabs(all, true)).toEqual([
      { key: "sedan", label: "Sedan", count: 1 },
      { key: "suv", label: "SUV", count: 1 },
      { key: "truck", label: "Truck", count: 1 },
    ]);
    expect(categoryTabs([civic], true)).toEqual([{ key: "sedan", label: "Sedan", count: 0 }]);
  });

  it("has nothing to list for no vehicles", () => {
    expect(categoryTabs([], false)).toEqual([]);
  });
});

describe("applyView", () => {
  it("shows everything, in the order given, by default", () => {
    expect(ids(applyView(all, defaultView))).toEqual(["camry", "civic", "rav4", "f150"]);
  });

  it("narrows to one category, whatever the spelling of it", () => {
    expect(ids(applyView(all, view({ category: "sedan" })))).toEqual(["camry", "civic"]);
    expect(ids(applyView([vehicle({ id: "x", category: " SUV " })], view({ category: "suv" })))).toEqual(["x"]);
  });

  it("can leave out what is sold out", () => {
    expect(ids(applyView(all, view({ inStockOnly: true })))).toEqual(["camry", "rav4", "f150"]);
  });

  it("combines a category with the stock filter", () => {
    expect(ids(applyView(all, view({ category: "sedan", inStockOnly: true })))).toEqual(["camry"]);
  });

  it("sorts by price, compared as numbers: 9999.99 is below 22000.00 although '9' sorts after '2' as text", () => {
    expect(ids(applyView(all, view({ sort: "price-asc" })))).toEqual(["f150", "civic", "camry", "rav4"]);
    expect(ids(applyView(all, view({ sort: "price-desc" })))).toEqual(["rav4", "camry", "civic", "f150"]);
  });

  it("sorts by name, make then model, ignoring case, keeping the given order among equals", () => {
    const named = [
      vehicle({ id: "a", make: "toyota", model: "Camry" }),
      vehicle({ id: "b", make: "Audi", model: "e-tron GT" }),
      vehicle({ id: "c", make: "Audi", model: "A4" }),
      vehicle({ id: "d", make: "Toyota", model: "camry" }),
    ];

    expect(ids(applyView(named, view({ sort: "name" })))).toEqual(["c", "b", "a", "d"]);
  });

  it("puts Model 3 before Model 10 when sorting by name: the numbers count as numbers", () => {
    const models = [vehicle({ id: "ten", model: "Model 10" }), vehicle({ id: "three", model: "Model 3" })];

    expect(ids(applyView(models, view({ sort: "name" })))).toEqual(["three", "ten"]);
  });

  it("sorts accented names beside their plain spelling, not after Z", () => {
    const cars = [vehicle({ id: "z", make: "Zagato" }), vehicle({ id: "e", make: "Ébène" }), vehicle({ id: "f", make: "Fiat" })];

    expect(ids(applyView(cars, view({ sort: "name" })))).toEqual(["e", "f", "z"]);
  });

  it("keeps the given order among equal prices", () => {
    const tied = [vehicle({ id: "a", price: "100.00" }), vehicle({ id: "b", price: "100.00" }), vehicle({ id: "c", price: "50.00" })];

    expect(ids(applyView(tied, view({ sort: "price-asc" })))).toEqual(["c", "a", "b"]);
    expect(ids(applyView(tied, view({ sort: "price-desc" })))).toEqual(["a", "b", "c"]);
  });

  it("never changes the list it is given", () => {
    const given = [...all];

    applyView(given, view({ sort: "price-desc", inStockOnly: true }));

    expect(ids(given)).toEqual(["camry", "civic", "rav4", "f150"]);
  });

  it("shows nothing for a category that is not there", () => {
    expect(applyView(all, view({ category: "van" }))).toEqual([]);
  });
});
