import { describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient } from "./client";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** A client wired to a fake fetch; `respond` decides what the "server" answers. */
function setup({ token = null as string | null, respond = () => json(200, {}) as () => Response | Promise<Response> } = {}) {
  const fetchImpl = vi.fn<typeof fetch>(async () => respond());
  const onUnauthorized = vi.fn();
  const client = createApiClient({ baseUrl: "", getToken: () => token, onUnauthorized, fetchImpl });
  const lastCall = () => {
    const [url, init] = fetchImpl.mock.calls.at(-1)!;
    return { url: String(url), init: init as RequestInit, headers: new Headers(init?.headers) };
  };
  return { client, fetchImpl, onUnauthorized, lastCall };
}

describe("request building", () => {
  it("calls /api plus the path on the configured base URL", async () => {
    const withBase = vi.fn<typeof fetch>(async () => json(200, {}));
    const client = createApiClient({ baseUrl: "https://api.example.com", getToken: () => null, onUnauthorized: vi.fn(), fetchImpl: withBase });

    await client.request("GET", "/vehicles");

    expect(String(withBase.mock.calls[0]?.[0])).toBe("https://api.example.com/api/vehicles");
  });

  it("appends query parameters, encoded, and skips blank or missing ones", async () => {
    const { client, lastCall } = setup();

    await client.request("GET", "/vehicles/search", { query: { make: "Mercedes Benz", model: "", category: undefined, minPrice: "9.50" } });

    expect(lastCall().url).toBe("/api/vehicles/search?make=Mercedes+Benz&minPrice=9.50");
  });

  it("adds no query string when every parameter is blank", async () => {
    const { client, lastCall } = setup();

    await client.request("GET", "/vehicles", { query: { make: "" } });

    expect(lastCall().url).toBe("/api/vehicles");
  });

  it("sends a JSON body with its content type, and none without a body", async () => {
    const { client, lastCall } = setup();

    await client.request("POST", "/vehicles", { body: { make: "Ford", price: "100.00" } });
    expect(lastCall().init.method).toBe("POST");
    expect(lastCall().init.body).toBe('{"make":"Ford","price":"100.00"}');
    expect(lastCall().headers.get("Content-Type")).toBe("application/json");

    await client.request("GET", "/vehicles");
    expect(lastCall().init.body).toBeUndefined();
    expect(lastCall().headers.has("Content-Type")).toBe(false);
  });

  it("sends the bearer token when there is one, and no Authorization header when there is not", async () => {
    const signedIn = setup({ token: "abc.def.ghi" });
    await signedIn.client.request("GET", "/vehicles");
    expect(signedIn.lastCall().headers.get("Authorization")).toBe("Bearer abc.def.ghi");

    const signedOut = setup({ token: null });
    await signedOut.client.request("POST", "/auth/login");
    expect(signedOut.lastCall().headers.has("Authorization")).toBe(false);
  });

  it("reads the token at the time of each request, so a new login is used straight away", async () => {
    let token: string | null = "first";
    const fetchImpl = vi.fn<typeof fetch>(async () => json(200, {}));
    const client = createApiClient({ baseUrl: "", getToken: () => token, onUnauthorized: vi.fn(), fetchImpl });

    await client.request("GET", "/vehicles");
    token = "second";
    await client.request("GET", "/vehicles");

    expect(new Headers(fetchImpl.mock.calls[1]?.[1]?.headers).get("Authorization")).toBe("Bearer second");
  });

  it("passes the abort signal on, so a superseded search can be cancelled", async () => {
    const { client, lastCall } = setup();
    const controller = new AbortController();

    await client.request("GET", "/vehicles", { signal: controller.signal });

    expect(lastCall().init.signal).toBe(controller.signal);
  });
});

describe("responses", () => {
  it("returns the parsed JSON body", async () => {
    const { client } = setup({ respond: () => json(200, [{ id: "1", price: "25000.00" }]) });

    expect(await client.request("GET", "/vehicles")).toEqual([{ id: "1", price: "25000.00" }]);
  });

  it("returns undefined for 204 No Content", async () => {
    const { client } = setup({ respond: () => new Response(null, { status: 204 }) });

    expect(await client.request("DELETE", "/vehicles/1")).toBeUndefined();
  });

  it("keeps prices as the exact strings the server sent", async () => {
    const { client } = setup({ respond: () => new Response('{"price":"19999.90"}', { status: 200 }) });

    expect(await client.request<{ price: string }>("GET", "/x")).toEqual({ price: "19999.90" });
  });

  it("reports a 200 whose body is not JSON as an invalid response", async () => {
    const { client } = setup({ respond: () => new Response("<html>oops</html>", { status: 200 }) });

    await expect(client.request("GET", "/vehicles")).rejects.toMatchObject({ status: 200, code: "INVALID_RESPONSE" });
  });
});

describe("errors", () => {
  it("turns the server's error body into an ApiError with its status, code, message and field details", async () => {
    const body = {
      error: {
        code: "VALIDATION_ERROR",
        message: "The request data is invalid",
        details: [{ field: "price", message: "Must be greater than zero" }],
      },
    };
    const { client } = setup({ respond: () => json(400, body) });

    const error = await client.request("POST", "/vehicles", { body: {} }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "The request data is invalid",
      details: [{ field: "price", message: "Must be greater than zero" }],
    });
  });

  it("gives an error without details an empty details list, so callers never check for undefined", async () => {
    const { client } = setup({ respond: () => json(409, { error: { code: "INSUFFICIENT_STOCK", message: "Only 0 left in stock" } }) });

    const error = await client.request("POST", "/vehicles/1/purchase").catch((e) => e);

    expect(error.details).toEqual([]);
  });

  it("describes an unreachable server in plain words, with status 0", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw new TypeError("Failed to fetch");
    });
    const client = createApiClient({ baseUrl: "", getToken: () => null, onUnauthorized: vi.fn(), fetchImpl });

    const error = await client.request("GET", "/vehicles").catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, code: "NETWORK_ERROR" });
    expect(error.message).toMatch(/could not reach the server/i);
  });

  it.each([
    [502, "SERVER_ERROR", /server/i],
    [404, "REQUEST_FAILED", /request/i],
  ])("describes a %s answer that is not JSON, such as a proxy's error page, as %s", async (status, code, message) => {
    const { client } = setup({ respond: () => new Response("<html>Bad Gateway</html>", { status }) });

    const error = await client.request("GET", "/vehicles").catch((e) => e);

    expect(error).toMatchObject({ status, code });
    expect(error.message).toMatch(message);
    expect(error.message).not.toContain("<html>");
  });

  it("lets a cancelled request through unchanged, so callers can tell it from a failure", async () => {
    const abort = new DOMException("The operation was aborted.", "AbortError");
    const fetchImpl = vi.fn<typeof fetch>(async () => {
      throw abort;
    });
    const client = createApiClient({ baseUrl: "", getToken: () => null, onUnauthorized: vi.fn(), fetchImpl });

    await expect(client.request("GET", "/vehicles")).rejects.toBe(abort);
  });
});

describe("expired or rejected sessions", () => {
  it("signs the user out when a request that carried a token gets a 401", async () => {
    const { client, onUnauthorized } = setup({
      token: "stale",
      respond: () => json(401, { error: { code: "TOKEN_EXPIRED", message: "Token expired" } }),
    });

    const error = await client.request("GET", "/vehicles").catch((e) => e);

    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(error).toMatchObject({ status: 401, code: "TOKEN_EXPIRED" }); // the caller still sees the failure
  });

  it("does not sign anyone out for a 401 on a request without a token, such as a wrong password", async () => {
    const { client, onUnauthorized } = setup({
      token: null,
      respond: () => json(401, { error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } }),
    });

    await expect(client.request("POST", "/auth/login", { body: {} })).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });

    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it.each([[403], [404], [409], [500]])("does not sign the user out for a %s", async (status) => {
    const { client, onUnauthorized } = setup({ token: "valid", respond: () => json(status, { error: { code: "X", message: "x" } }) });

    await client.request("GET", "/vehicles").catch(() => undefined);

    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
