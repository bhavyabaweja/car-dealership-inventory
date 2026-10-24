import { describe, expect, it, vi } from "vitest";
import { readConfig } from "./config";

describe("readConfig", () => {
  it("uses safe defaults when nothing is set: USD, the browser's locale, and relative API URLs", () => {
    const warn = vi.fn();

    expect(readConfig({}, warn)).toEqual({ currency: "USD", locale: undefined, apiBaseUrl: "" });
    expect(warn).not.toHaveBeenCalled();
  });

  it("treats empty values as unset, as an empty line in a .env file produces", () => {
    const warn = vi.fn();

    expect(readConfig({ VITE_CURRENCY: "", VITE_LOCALE: "  ", VITE_API_URL: "" }, warn)).toEqual({
      currency: "USD",
      locale: undefined,
      apiBaseUrl: "",
    });
    expect(warn).not.toHaveBeenCalled();
  });

  describe("currency", () => {
    it.each([
      ["EUR", "EUR"],
      ["inr", "INR"],
      ["  gbp ", "GBP"],
      ["JPY", "JPY"],
    ])("accepts %j as %s", (given, expected) => {
      expect(readConfig({ VITE_CURRENCY: given }, vi.fn()).currency).toBe(expected);
    });

    it.each([["dollars"], ["US"], ["12$"], ["ZZZ"]])(
      "falls back to USD and warns, naming the setting, for %j",
      (given) => {
        const warn = vi.fn();

        expect(readConfig({ VITE_CURRENCY: given }, warn).currency).toBe("USD");
        expect(warn).toHaveBeenCalledOnce();
        expect(warn.mock.calls[0]?.[0]).toContain("VITE_CURRENCY");
      },
    );
  });

  describe("locale", () => {
    it("accepts a valid locale and returns it in canonical form", () => {
      expect(readConfig({ VITE_LOCALE: "de-DE" }, vi.fn()).locale).toBe("de-DE");
      expect(readConfig({ VITE_LOCALE: "en-us" }, vi.fn()).locale).toBe("en-US");
    });

    it("falls back to the browser's locale and warns for an invalid one", () => {
      const warn = vi.fn();

      expect(readConfig({ VITE_LOCALE: "not a locale!" }, warn).locale).toBeUndefined();
      expect(warn.mock.calls[0]?.[0]).toContain("VITE_LOCALE");
    });
  });

  describe("API URL", () => {
    it("drops a trailing slash so paths can be appended safely", () => {
      expect(readConfig({ VITE_API_URL: "https://api.example.com/" }, vi.fn()).apiBaseUrl).toBe("https://api.example.com");
      expect(readConfig({ VITE_API_URL: "https://api.example.com" }, vi.fn()).apiBaseUrl).toBe("https://api.example.com");
    });

    it("accepts an http or https address, such as the hosted API or a local one", () => {
      const warn = vi.fn();

      expect(readConfig({ VITE_API_URL: "https://car-api.onrender.com" }, warn).apiBaseUrl).toBe("https://car-api.onrender.com");
      expect(readConfig({ VITE_API_URL: "http://localhost:3000" }, warn).apiBaseUrl).toBe("http://localhost:3000");
      expect(warn).not.toHaveBeenCalled();
    });

    // Without a scheme the browser reads "car-api.onrender.com/api/..." as a path on the page's own site, so every call would
    // quietly go to the wrong place. Say so, rather than leave a person to work it out from 404s.
    it.each([["car-api.onrender.com"], ["//car-api.onrender.com"], ["ftp://car-api.onrender.com"]])(
      "warns about %s, which is not an http(s) address, and uses the page's own origin instead",
      (value) => {
        const warn = vi.fn();

        expect(readConfig({ VITE_API_URL: value }, warn).apiBaseUrl).toBe("");
        expect(warn.mock.calls[0]?.[0]).toContain("VITE_API_URL");
      },
    );
  });
});
