import { describe, expect, it } from "vitest";
import { countActive, emptyFilters, type FilterInputs, filtersFromParams, paramsFromFilters, toFilters } from "./filters";

const inputs = (overrides: Partial<FilterInputs> = {}): FilterInputs => ({ ...emptyFilters, ...overrides });

const PRICE_MESSAGE = "Enter an amount like 25000 or 25000.50.";

describe("toFilters", () => {
  it("has nothing to filter by when the form is empty", () => {
    expect(toFilters(inputs())).toEqual({ filters: {}, errors: {} });
  });

  it("sends what was typed, trimmed, and leaves out what is blank", () => {
    const { filters } = toFilters(inputs({ make: "  toyota ", model: "   ", category: "SUV" }));

    expect(filters).toEqual({ make: "toyota", category: "SUV" });
  });

  describe("prices", () => {
    it.each([["25000"], ["25000.5"], ["25000.50"], ["0"], ["0.99"], ["99999999.99"], [" 100 "]])("accepts %j", (text) => {
      const { filters, errors } = toFilters(inputs({ minPrice: text }));

      expect(errors).toEqual({});
      expect(filters.minPrice).toBe(text.trim());
    });

    it.each([["abc"], ["-5"], ["1e5"], ["1,000"], ["10.999"], ["100000000"], ["."], ["12."], ["$25"]])(
      "explains %j next to the field and does not send it",
      (text) => {
        const { filters, errors } = toFilters(inputs({ maxPrice: text }));

        expect(errors).toEqual({ maxPrice: PRICE_MESSAGE });
        expect(filters).toEqual({});
      },
    );

    it("still sends a valid price when the other one is not valid", () => {
      const { filters, errors } = toFilters(inputs({ minPrice: "10000", maxPrice: "lots" }));

      expect(filters).toEqual({ minPrice: "10000" });
      expect(errors).toEqual({ maxPrice: PRICE_MESSAGE });
    });

    it("accepts a range whose ends are equal", () => {
      expect(toFilters(inputs({ minPrice: "5000", maxPrice: "5000.00" })).errors).toEqual({});
    });

    it("compares the range as amounts, not as text, and rejects a maximum below the minimum without sending either price", () => {
      const { filters, errors } = toFilters(inputs({ make: "toyota", minPrice: "9000", maxPrice: "10000" }));
      expect(errors).toEqual({}); // as text "9000" > "10000", but as amounts it is fine
      expect(filters).toEqual({ make: "toyota", minPrice: "9000", maxPrice: "10000" });

      const backwards = toFilters(inputs({ make: "toyota", minPrice: "30000", maxPrice: "20000" }));
      expect(backwards.errors).toEqual({ maxPrice: "The maximum can't be lower than the minimum." });
      expect(backwards.filters).toEqual({ make: "toyota" }); // text filters still apply
    });
  });
});

describe("countActive", () => {
  it("counts the filters that have something in them, not blanks", () => {
    expect(countActive(inputs())).toBe(0);
    expect(countActive(inputs({ make: "toy", model: "  ", maxPrice: "30000" }))).toBe(2);
  });

  it("counts a filter that is wrong too, since the person typed it", () => {
    expect(countActive(inputs({ minPrice: "abc" }))).toBe(1);
  });
});

describe("the filters in the address bar", () => {
  it("writes only the filters that have a value, trimmed, so a plain page has a plain address", () => {
    expect(paramsFromFilters(inputs()).toString()).toBe("");
    expect(paramsFromFilters(inputs({ make: " toyota ", model: "", minPrice: "10000" })).toString()).toBe("make=toyota&minPrice=10000");
  });

  it("encodes characters that need it", () => {
    expect(paramsFromFilters(inputs({ make: "Mercedes Benz" })).toString()).toBe("make=Mercedes+Benz");
  });

  it("reads them back, whatever else is in the address", () => {
    const read = filtersFromParams(new URLSearchParams("make=toyota&minPrice=10000&utm_source=mail&unknown=1"));

    expect(read).toEqual(inputs({ make: "toyota", minPrice: "10000" }));
  });

  it("uses the first value when a parameter is repeated, and nothing when it is absent", () => {
    expect(filtersFromParams(new URLSearchParams("make=toyota&make=honda")).make).toBe("toyota");
    expect(filtersFromParams(new URLSearchParams("")).make).toBe("");
  });

  it("round-trips", () => {
    const original = inputs({ make: "Land Rover", category: "SUV", maxPrice: "99999999.99" });

    expect(filtersFromParams(paramsFromFilters(original))).toEqual(original);
  });
});
