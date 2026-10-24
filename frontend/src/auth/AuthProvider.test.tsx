import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { AuthApi } from "../api/auth";
import { ApiError } from "../api/client";
import { brokenStorage, expiredToken, freshToken, memoryStorage, NOW, userWithRole } from "../test/helpers";
import { AuthProvider, useAuth } from "./AuthProvider";
import { SESSION_KEY } from "./session";

/** An auth API that records calls and answers with what the test says. */
function fakeAuthApi(overrides: Partial<Record<keyof AuthApi, ReturnType<typeof vi.fn>>> = {}) {
  const api = {
    login: vi.fn(async () => ({ token: freshToken(), user: userWithRole("USER") })),
    register: vi.fn(async () => userWithRole("USER")),
    ...overrides,
  };
  return api;
}

function setup({
  storage = memoryStorage(),
  authApi = fakeAuthApi(),
}: { storage?: ReturnType<typeof memoryStorage> | typeof brokenStorage; authApi?: ReturnType<typeof fakeAuthApi> } = {}) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider authApi={authApi as unknown as AuthApi} storage={storage} now={() => NOW}>
      {children}
    </AuthProvider>
  );
  return { ...renderHook(() => useAuth(), { wrapper }), storage, authApi };
}

const storedSession = (role: "USER" | "ADMIN" = "USER") =>
  JSON.stringify({ token: freshToken(), user: userWithRole(role) });

describe("AuthProvider", () => {
  describe("starting up", () => {
    it("starts signed out when nothing is stored", () => {
      const { result } = setup();

      expect(result.current.user).toBeNull();
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.getToken()).toBeNull();
    });

    it("restores a stored session without calling the API", () => {
      const { result, authApi } = setup({ storage: memoryStorage({ [SESSION_KEY]: storedSession("ADMIN") }) });

      expect(result.current.user).toEqual(userWithRole("ADMIN"));
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.getToken()).toBeTruthy();
      expect(authApi.login).not.toHaveBeenCalled();
    });

    it("does not restore a session whose token has expired", () => {
      const stored = JSON.stringify({ token: expiredToken(), user: userWithRole() });
      const { result, storage } = setup({ storage: memoryStorage({ [SESSION_KEY]: stored }) });

      expect(result.current.user).toBeNull();
      expect(storage.items.has(SESSION_KEY)).toBe(false);
    });

    it("works when storage is unavailable", () => {
      const { result } = setup({ storage: brokenStorage });

      expect(result.current.user).toBeNull();
    });
  });

  describe("login", () => {
    it("signs in with the server's answer and remembers the session", async () => {
      const { result, authApi, storage } = setup();
      const token = freshToken();
      authApi.login.mockResolvedValue({ token, user: userWithRole("ADMIN") });

      await act(() => result.current.login("admin@example.com", "Sup3rSecret!"));

      expect(authApi.login).toHaveBeenCalledWith("admin@example.com", "Sup3rSecret!");
      expect(result.current.user).toEqual(userWithRole("ADMIN"));
      expect(result.current.isAdmin).toBe(true);
      expect(JSON.parse(storage.items.get(SESSION_KEY)!)).toEqual({ token, user: userWithRole("ADMIN") });
    });

    it("makes the new token available to API calls at once, before React has re-rendered", async () => {
      const { result, authApi } = setup();
      const token = freshToken();
      authApi.login.mockResolvedValue({ token, user: userWithRole() });

      let tokenRightAfterLogin: string | null = null;
      await act(async () => {
        await result.current.login("jane@example.com", "Sup3rSecret!");
        tokenRightAfterLogin = result.current.getToken();
      });

      expect(tokenRightAfterLogin).toBe(token);
    });

    it("is not an admin when the server says USER", async () => {
      const { result } = setup();

      await act(() => result.current.login("jane@example.com", "Sup3rSecret!"));

      expect(result.current.isAdmin).toBe(false);
    });

    it("passes a failed login on to the caller and stays signed out", async () => {
      const failure = new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
      const { result, authApi, storage } = setup();
      authApi.login.mockRejectedValue(failure);

      await expect(act(() => result.current.login("jane@example.com", "wrong"))).rejects.toBe(failure);

      expect(result.current.user).toBeNull();
      expect(storage.items.has(SESSION_KEY)).toBe(false);
    });
  });

  describe("register", () => {
    it("creates the account and then signs in with the same credentials", async () => {
      const { result, authApi } = setup();

      await act(() => result.current.register("jane@example.com", "Sup3rSecret!"));

      expect(authApi.register).toHaveBeenCalledWith("jane@example.com", "Sup3rSecret!");
      expect(authApi.login).toHaveBeenCalledWith("jane@example.com", "Sup3rSecret!");
      expect(result.current.user).toEqual(userWithRole("USER"));
    });

    it("does not try to sign in when the account could not be created", async () => {
      const failure = new ApiError(409, "EMAIL_TAKEN", "A user with this email already exists");
      const { result, authApi } = setup();
      authApi.register.mockRejectedValue(failure);

      await expect(act(() => result.current.register("jane@example.com", "Sup3rSecret!"))).rejects.toBe(failure);

      expect(authApi.login).not.toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });
  });

  describe("logout", () => {
    it("forgets the session everywhere", async () => {
      const { result, storage } = setup({ storage: memoryStorage({ [SESSION_KEY]: storedSession() }) });

      act(() => result.current.logout());

      expect(result.current.user).toBeNull();
      expect(result.current.getToken()).toBeNull();
      expect(storage.items.has(SESSION_KEY)).toBe(false);
    });

    it("is not reported as an expired session", () => {
      const { result } = setup({ storage: memoryStorage({ [SESSION_KEY]: storedSession() }) });

      act(() => result.current.logout());

      expect(result.current.sessionExpired).toBe(false);
    });
  });

  describe("expireSession, called when the server rejects the token", () => {
    it("signs the user out and says why", () => {
      const { result, storage } = setup({ storage: memoryStorage({ [SESSION_KEY]: storedSession() }) });

      act(() => result.current.expireSession());

      expect(result.current.user).toBeNull();
      expect(result.current.sessionExpired).toBe(true);
      expect(storage.items.has(SESSION_KEY)).toBe(false);
    });

    it("says nothing when nobody is signed in, as when a late response arrives after logging out", () => {
      const { result } = setup();

      act(() => result.current.expireSession());

      expect(result.current.sessionExpired).toBe(false);
    });

    it("stops mentioning it after the next successful login", async () => {
      const { result } = setup({ storage: memoryStorage({ [SESSION_KEY]: storedSession() }) });
      act(() => result.current.expireSession());

      await act(() => result.current.login("jane@example.com", "Sup3rSecret!"));

      expect(result.current.sessionExpired).toBe(false);
    });
  });
});

describe("useAuth", () => {
  it("explains itself when used outside an AuthProvider", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);

    quiet.mockRestore();
  });
});
