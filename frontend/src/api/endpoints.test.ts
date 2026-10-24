import { describe, expect, it, vi } from "vitest";
import { createAuthApi } from "./auth";
import type { ApiClient } from "./client";
import { createVehiclesApi } from "./vehicles";

/** A client that records calls instead of making them. */
function fakeClient() {
  const request = vi.fn(async () => ({}) as never);
  return { client: { request } as unknown as ApiClient, request };
}

describe("auth API", () => {
  it("logs in by posting the credentials", async () => {
    const { client, request } = fakeClient();

    await createAuthApi(client).login("jane@example.com", "Sup3rSecret!");

    expect(request).toHaveBeenCalledWith("POST", "/auth/login", { body: { email: "jane@example.com", password: "Sup3rSecret!" } });
  });

  it("registers by posting the credentials", async () => {
    const { client, request } = fakeClient();

    await createAuthApi(client).register("jane@example.com", "Sup3rSecret!");

    expect(request).toHaveBeenCalledWith("POST", "/auth/register", { body: { email: "jane@example.com", password: "Sup3rSecret!" } });
  });
});

describe("vehicles API", () => {
  describe("find", () => {
    it("lists everything when there are no filters", async () => {
      const { client, request } = fakeClient();

      await createVehiclesApi(client).find({});

      expect(request).toHaveBeenCalledWith("GET", "/vehicles", expect.objectContaining({ query: undefined }));
    });

    it("lists everything when every filter is blank, as an empty form leaves them", async () => {
      const { client, request } = fakeClient();

      await createVehiclesApi(client).find({ make: "", model: "   ", minPrice: "" });

      expect(request).toHaveBeenCalledWith("GET", "/vehicles", expect.objectContaining({ query: undefined }));
    });

    it("searches with only the filters that have a value", async () => {
      const { client, request } = fakeClient();

      await createVehiclesApi(client).find({ make: "toy", model: "  ", category: "SUV", minPrice: "10000", maxPrice: "" });

      expect(request).toHaveBeenCalledWith(
        "GET",
        "/vehicles/search",
        expect.objectContaining({ query: { make: "toy", category: "SUV", minPrice: "10000" } }),
      );
    });

    it("passes the abort signal on so the dashboard can cancel a superseded search", async () => {
      const { client, request } = fakeClient();
      const controller = new AbortController();

      await createVehiclesApi(client).find({ make: "toy" }, controller.signal);

      expect(request).toHaveBeenCalledWith("GET", "/vehicles/search", expect.objectContaining({ signal: controller.signal }));
    });
  });

  it("creates a vehicle with the price as the string it was given", async () => {
    const { client, request } = fakeClient();
    const vehicle = { make: "Ford", model: "F-150", category: "Truck", price: "45999.99", quantity: 2 };

    await createVehiclesApi(client).create(vehicle);

    expect(request).toHaveBeenCalledWith("POST", "/vehicles", { body: vehicle });
  });

  it("updates only what is passed", async () => {
    const { client, request } = fakeClient();

    await createVehiclesApi(client).update("abc", { price: "24999.99" });

    expect(request).toHaveBeenCalledWith("PUT", "/vehicles/abc", { body: { price: "24999.99" } });
  });

  it("deletes by id", async () => {
    const { client, request } = fakeClient();

    await createVehiclesApi(client).remove("abc");

    expect(request).toHaveBeenCalledWith("DELETE", "/vehicles/abc");
  });

  it("encodes an id so it cannot change the path", async () => {
    const { client, request } = fakeClient();

    await createVehiclesApi(client).remove("a/b?c");

    expect(request).toHaveBeenCalledWith("DELETE", "/vehicles/a%2Fb%3Fc");
  });

  it("purchases one unit with no body, or the requested number", async () => {
    const { client, request } = fakeClient();
    const vehicles = createVehiclesApi(client);

    await vehicles.purchase("abc");
    expect(request).toHaveBeenLastCalledWith("POST", "/vehicles/abc/purchase");

    await vehicles.purchase("abc", 3);
    expect(request).toHaveBeenLastCalledWith("POST", "/vehicles/abc/purchase", { body: { quantity: 3 } });
  });

  it("restocks by the given number of units", async () => {
    const { client, request } = fakeClient();

    await createVehiclesApi(client).restock("abc", 10);

    expect(request).toHaveBeenCalledWith("POST", "/vehicles/abc/restock", { body: { quantity: 10 } });
  });
});
