import { describe, expect, it } from "vitest";
import { formatPrice } from "./money";

/** Intl puts a no-break space between the amount and some currency signs; compare with a plain space. */
const plain = (text: string) => text.replace(/\s/g, " ");

describe("formatPrice", () => {
  it.each([
    ["25000.00", "$25,000.00"],
    ["19999.90", "$19,999.90"],
    ["0.10", "$0.10"],
    ["99999999.99", "$99,999,999.99"],
  ])("shows the exact price string %s as %s", (amount, expected) => {
    expect(formatPrice(amount, { currency: "USD", locale: "en-US" })).toBe(expected);
  });

  it("never goes through a float: digits a float cannot hold survive intact", () => {
    // A double holds about 15-16 significant digits; this value needs 19. Real prices are far smaller,
    // so this proves the property rather than a practical case.
    expect(formatPrice("12345678901234567.89", { currency: "USD", locale: "en-US" })).toBe("$12,345,678,901,234,567.89");
  });

  describe("follows the configured currency and locale", () => {
    it.each([
      ["EUR", "de-DE", "25.000,00 €"],
      ["GBP", "en-GB", "£25,000.00"],
      ["INR", "en-IN", "₹25,000.00"],
      ["CAD", "en-CA", "$25,000.00"],
    ])("%s in %s", (currency, locale, expected) => {
      expect(plain(formatPrice("25000.00", { currency, locale }))).toBe(expected);
    });

    it("uses the grouping of the locale, such as lakhs in India", () => {
      expect(formatPrice("2500000.00", { currency: "INR", locale: "en-IN" })).toBe("₹25,00,000.00");
    });

    it("drops the decimals for a currency that has none", () => {
      expect(formatPrice("25000.00", { currency: "JPY", locale: "en-US" })).toBe("¥25,000");
    });

    it("never assumes dollars: no other currency shows a $ sign unless it really is one", () => {
      expect(formatPrice("25000.00", { currency: "EUR", locale: "en-US" })).not.toContain("$");
    });
  });

  it("shows something sensible instead of NaN when the value is not a price", () => {
    expect(formatPrice("not a price", { currency: "USD", locale: "en-US" })).toBe("not a price");
    expect(formatPrice("", { currency: "USD", locale: "en-US" })).toBe("");
  });
});
