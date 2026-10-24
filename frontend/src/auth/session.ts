import type { Role, User } from "../api/types";

export const SESSION_KEY = "car-dealership.session";

export interface Session {
  token: string;
  user: User;
}

/** The part of the Web Storage API used here, so tests can pass a stand-in. */
export type SessionStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const ROLES: readonly Role[] = ["USER", "ADMIN"];

/**
 * When the token expires, in milliseconds, read from its payload without verifying it: only the
 * server can do that, and this is just to avoid showing a signed-in screen for a token it will reject.
 */
export function decodeExpiry(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "="))) as { exp?: unknown };
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
}

function isUser(value: unknown): value is User {
  const user = value as Partial<User> | null;
  return (
    typeof user === "object" &&
    user !== null &&
    typeof user.id === "string" &&
    typeof user.email === "string" &&
    ROLES.includes(user.role as Role)
  );
}

function parseSession(raw: string): Session | null {
  try {
    const value = JSON.parse(raw) as Partial<Session> | null;
    return typeof value?.token === "string" && isUser(value.user) ? { token: value.token, user: value.user } : null;
  } catch {
    return null;
  }
}

/** Storage can throw (blocked site data, some private modes); a session then simply lasts for this visit. */
export function saveSession(storage: SessionStorage, session: Session): void {
  try {
    storage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // not remembered across visits, but signing in still works
  }
}

export function clearSession(storage: SessionStorage): void {
  try {
    storage.removeItem(SESSION_KEY);
  } catch {
    // nothing stored that could be cleared
  }
}

/** The remembered session, or null if there is none, it is corrupt, or its token has expired (it is then removed). */
export function loadSession(storage: SessionStorage, nowMs: number): Session | null {
  let raw: string | null;
  try {
    raw = storage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  const session = parseSession(raw);
  const expiry = session ? decodeExpiry(session.token) : null;
  if (session && expiry !== null && expiry > nowMs) return session;

  clearSession(storage);
  return null;
}
