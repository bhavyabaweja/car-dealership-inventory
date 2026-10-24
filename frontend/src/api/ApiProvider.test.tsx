import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../auth/AuthProvider";
import { SESSION_KEY } from "../auth/session";
import { fakeAuthApi, freshToken, memoryStorage, NOW, storedSession } from "../test/helpers";
import { ApiProvider, useVehiclesApi } from "./ApiProvider";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function setup({ signedIn = true, respond = () => json(200, []) as Response } = {}) {
  const fetchImpl = vi.fn<typeof fetch>(async () => respond());
  const authApi = fakeAuthApi();
  const storage = memoryStorage(signedIn ? { [SESSION_KEY]: storedSession() } : {});
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider authApi={authApi as never} storage={storage} now={() => NOW}>
      <ApiProvider fetchImpl={fetchImpl}>{children}</ApiProvider>
    </AuthProvider>
  );
  const hook = renderHook(() => ({ api: useVehiclesApi(), auth: useAuth() }), { wrapper });
  const authorization = () => new Headers(fetchImpl.mock.lastCall?.[1]?.headers).get("Authorization");
  return { ...hook, fetchImpl, authApi, authorization };
}

describe("ApiProvider", () => {
  it("sends the signed-in user's token with every vehicle request", async () => {
    const { result, authorization, fetchImpl } = setup();
    const storedToken = JSON.parse(storedSession()).token as string; // the helper builds the same token each time

    await result.current.api.find({});

    expect(String(fetchImpl.mock.lastCall?.[0])).toBe("/api/vehicles");
    expect(authorization()).toBe(`Bearer ${storedToken}`);
  });

  it("uses the token of a login that happens later, not the one from when it was created", async () => {
    const { result, authorization, authApi } = setup({ signedIn: false });
    const token = freshToken();
    authApi.login.mockResolvedValue({ token, user: { id: "u", email: "jane@example.com", role: "USER" } });

    await act(() => result.current.auth.login("jane@example.com", "Sup3rSecret!"));
    await result.current.api.find({});

    expect(authorization()).toBe(`Bearer ${token}`);
  });

  it("signs the user out, and says why, when the server rejects the token", async () => {
    const { result } = setup({ respond: () => json(401, { error: { code: "TOKEN_EXPIRED", message: "Token expired" } }) });

    await act(async () => {
      await expect(result.current.api.find({})).rejects.toMatchObject({ status: 401, code: "TOKEN_EXPIRED" });
    });

    expect(result.current.auth.user).toBeNull();
    expect(result.current.auth.sessionExpired).toBe(true);
  });

  it("keeps the same API object between renders, so hooks that depend on it do not refetch", () => {
    const { result, rerender } = setup();
    const first = result.current.api;

    rerender();

    expect(result.current.api).toBe(first);
  });

  it("explains itself when used outside an ApiProvider", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useVehiclesApi())).toThrow(/ApiProvider/);

    quiet.mockRestore();
  });
});
