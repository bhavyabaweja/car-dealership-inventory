import { describe, expect, it } from "vitest";
import { vehicleCode } from "./vehicleCode";

// A vehicle's id is a 36-character UUID: too long to read out or to print on a card. The code is its first block, which is
// still the vehicle's own id and not an invention, and is short enough to quote to someone.
describe("vehicleCode", () => {
  it("is the first eight characters of a UUID, upper-cased", () => {
    expect(vehicleCode("3f2a91c4-77b0-4c7e-9a52-0d5e8b6f1a23")).toBe("3F2A91C4");
  });

  it("leaves an id that is already short as it is, upper-cased", () => {
    expect(vehicleCode("v-camry")).toBe("V-CAMRY");
  });

  it("copes with an empty id", () => {
    expect(vehicleCode("")).toBe("");
  });
});
