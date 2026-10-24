import { describe, expect, it } from "vitest";
import { type IllustrationKind, illustrationFor } from "./vehicleIllustration";

// The vehicles in the database carry no photographs, so a card shows an illustration of the kind of car its
// category names. These are drawings, never pictures of the actual vehicle, and the mapping must say so honestly:
// anything it cannot place gets a neutral car, not a guess.
describe("illustrationFor", () => {
  it.each<[string, IllustrationKind]>([
    ["SUV", "suv"],
    ["suv", "suv"],
    ["Compact SUV", "suv"],
    ["Crossover", "suv"],
    ["Sport Utility", "suv"],
    ["Sedan", "sedan"],
    ["Saloon", "sedan"],
    ["Executive sedan", "sedan"],
    ["Hatchback", "hatchback"],
    ["Hot hatch", "hatchback"],
    ["Truck", "truck"],
    ["Pickup", "truck"],
    ["Pick-up truck", "truck"],
    ["Pick-up", "truck"],
    ["Coupe", "coupe"],
    ["Sports", "coupe"],
    ["Convertible", "coupe"],
    ["Luxury", "coupe"],
    ["Luxury & Performance", "coupe"],
  ])("draws %j as a %s", (category, kind) => {
    expect(illustrationFor(category).kind).toBe(kind);
  });

  it("ignores case and surrounding spaces", () => {
    expect(illustrationFor("  hAtChBaCk ").kind).toBe("hatchback");
  });

  it("lets the most specific word win when a category names two bodies", () => {
    expect(illustrationFor("Luxury SUV").kind).toBe("suv");
    expect(illustrationFor("Sports sedan").kind).toBe("sedan");
    expect(illustrationFor("Electric pickup").kind).toBe("truck");
  });

  it("draws a limousine as a sedan, whatever else the category says", () => {
    expect(illustrationFor("Ultra-luxury armoured limousine").kind).toBe("sedan");
  });

  it.each([[""], ["   "], ["Electric"], ["Hybrid"], ["Van"], ["Test"]])(
    "draws %j as a plain car, because it names no body style it knows",
    (category) => {
      expect(illustrationFor(category).kind).toBe("generic");
    },
  );

  it("gives every kind its own image, each a local SVG (a file, or inlined by the build when small)", () => {
    const kinds: IllustrationKind[] = ["suv", "sedan", "hatchback", "truck", "coupe", "generic"];

    const sources = kinds.map((kind) => {
      const category = { suv: "SUV", sedan: "Sedan", hatchback: "Hatchback", truck: "Truck", coupe: "Coupe", generic: "" }[kind];
      return illustrationFor(category).src;
    });

    expect(new Set(sources).size).toBe(kinds.length);
    for (const source of sources) expect(source).toMatch(/\.svg(\?|$)|^data:image\/svg\+xml/);
    for (const source of sources) expect(source).not.toMatch(/^https?:/); // nothing fetched from another site
  });
});
