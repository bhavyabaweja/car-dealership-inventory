import { compare } from "bcryptjs";
import { describe, expect, it } from "vitest";
import { BcryptPasswordHasher } from "./bcrypt-password-hasher";

// Cost 4 is bcrypt's minimum: it keeps the suite fast and is never used outside tests.
const hasher = new BcryptPasswordHasher(4);

describe("BcryptPasswordHasher", () => {
  it("produces a bcrypt hash that verifies against the original password", async () => {
    const hash = await hasher.hash("Sup3rSecret!");

    expect(hash).not.toContain("Sup3rSecret!");
    expect(hash).toMatch(/^\$2[aby]\$04\$/);
    expect(await compare("Sup3rSecret!", hash)).toBe(true);
    expect(await compare("wrong-password", hash)).toBe(false);
  });

  it("salts every hash, so the same password never hashes the same way twice", async () => {
    const [first, second] = await Promise.all([hasher.hash("Sup3rSecret!"), hasher.hash("Sup3rSecret!")]);

    expect(first).not.toBe(second);
  });

  describe("compare", () => {
    it("accepts the original password and rejects any other", async () => {
      const hash = await hasher.hash("Sup3rSecret!");

      expect(await hasher.compare("Sup3rSecret!", hash)).toBe(true);
      expect(await hasher.compare("sup3rsecret!", hash)).toBe(false);
    });

    it("returns false, rather than throwing, when the stored hash is malformed", async () => {
      expect(await hasher.compare("Sup3rSecret!", "not-a-bcrypt-hash")).toBe(false);
    });
  });
});
