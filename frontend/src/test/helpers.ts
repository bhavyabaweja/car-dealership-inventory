import { vi } from "vitest";
import type { AuthApi } from "../api/auth";
import type { VehiclesApi } from "../api/vehicles";
import type { Role, User, Vehicle } from "../api/types";

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

/** What the session helpers store for a signed-in user, as JSON. */
export const storedSession = (role: Role = "USER") => JSON.stringify({ token: freshToken(), user: userWithRole(role) });

/** An auth API that records calls and answers with a USER by default; tests change the answers per case. */
export function fakeAuthApi() {
  return {
    login: vi.fn(async (_email: string, _password: string) => ({ token: freshToken(), user: userWithRole("USER") })),
    register: vi.fn(async (_email: string, _password: string) => userWithRole("USER")),
  } satisfies Record<keyof AuthApi, unknown>;
}
/** A vehicle for tests; override only what the test cares about. */
export const vehicle = (overrides: Partial<Vehicle> = {}): Vehicle => ({
  id: "v-camry",
  make: "Toyota",
  model: "Camry",
  category: "Sedan",
  price: "25000.00",
  quantity: 5,
  ...overrides,
});

export const sampleVehicles = (): Vehicle[] => [
  vehicle(),
  vehicle({ id: "v-rav4", model: "RAV4", category: "SUV", price: "32000.50", quantity: 2 }),
  vehicle({ id: "v-civic", make: "Honda", model: "Civic", price: "22000.00", quantity: 0 }),
];

/** A vehicles API that records calls and lists the sample vehicles; tests change the answers per case. */
export function fakeVehiclesApi() {
  return {
    find: vi.fn(async (_filters: unknown, _signal?: AbortSignal) => sampleVehicles()),
    create: vi.fn(async (data: Omit<Vehicle, "id">) => ({ id: "v-new", ...data })),
    update: vi.fn(async (id: string, changes: Partial<Vehicle>) => ({ ...vehicle(), id, ...changes })),
    remove: vi.fn(async (_id: string): Promise<void> => undefined),
    purchase: vi.fn(async (id: string, _quantity?: number) => vehicle({ id, quantity: 4 })),
    restock: vi.fn(async (id: string, quantity: number) => vehicle({ id, quantity })),
  } satisfies Record<keyof VehiclesApi, unknown>;
}