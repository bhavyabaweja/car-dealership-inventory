import { describe, expect, it } from "vitest";
import { validateEmail, validatePassword } from "./validation";

describe("validateEmail", () => {
  it.each([["jane@example.com"], ["a.b+tag@sub.example.co.uk"], ["  jane@example.com  "]])("accepts %j", (email) => {
    expect(validateEmail(email)).toBeUndefined();
  });

  it("asks for an address when there is none", () => {
    expect(validateEmail("")).toBe("Enter your email address.");
    expect(validateEmail("   ")).toBe("Enter your email address.");
  });

  it.each([["jane"], ["jane@"], ["@example.com"], ["jane@example"], ["jane example@x.com"], ["jane@@example.com"]])(
    "rejects %j as not an email address",
    (email) => {
      expect(validateEmail(email)).toBe("Enter a valid email address.");
    },
  );
});

describe("validatePassword", () => {
  it.each([["12345678"], ["Sup3rSecret!"], ["a".repeat(72)], ["        "]])("accepts %j, as the server does", (password) => {
    expect(validatePassword(password)).toBeUndefined();
  });

  it("asks for a password when there is none", () => {
    expect(validatePassword("")).toBe("Enter a password.");
  });

  it("asks for at least 8 characters", () => {
    expect(validatePassword("1234567")).toBe("Use at least 8 characters.");
  });

  it("refuses more than 72 bytes, which the server would reject, counting accented and emoji characters as the several bytes they are", () => {
    expect(validatePassword("a".repeat(73))).toBe("That password is too long (72 bytes at most).");
    expect(validatePassword("é".repeat(37))).toBe("That password is too long (72 bytes at most)."); // 74 bytes, 37 characters
    expect(validatePassword("é".repeat(36))).toBeUndefined(); // exactly 72 bytes
  });
});
