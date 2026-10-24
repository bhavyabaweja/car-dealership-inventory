import type { Role, User } from "../api/types";

/** A fixed "now" for tests, in milliseconds. */
export const NOW = Date.UTC(2026, 9, 24, 12, 0, 0);

const base64url = (value: object) => btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** A token shaped like the backend's (header.payload.signature) with the given payload; the signature is fake. */
export function makeToken(payload: Record<string, unknown> = {}): string {
  return `${base64url({ alg: "HS256", typ: "JWT" })}.${base64url(payload)}.c2lnbmF0dXJl`;
}

/** A token that is valid for an hour after NOW. */
export const freshToken = () => makeToken({ sub: "user-1", role: "USER", exp: NOW / 1000 + 3600 });

/** A token that expired a minute before NOW. */
export const expiredToken = () => makeToken({ sub: "user-1", role: "USER", exp: NOW / 1000 - 60 });

export const userWithRole = (role: Role = "USER"): User => ({ id: "user-1", email: `${role.toLowerCase()}@example.com`, role });

/** localStorage stand-in whose contents a test controls and can inspect. */
export function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

/** Storage that refuses every call, as browsers do in some private modes or when site data is blocked. */
export const brokenStorage = {
  getItem: () => {
    throw new DOMException("denied", "SecurityError");
  },
  setItem: () => {
    throw new DOMException("denied", "SecurityError");
  },
  removeItem: () => {
    throw new DOMException("denied", "SecurityError");
  },
};
