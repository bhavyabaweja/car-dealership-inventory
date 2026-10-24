import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ApiProvider } from "../api/ApiProvider";
import { ApiError } from "../api/client";
import type { Vehicle, VehicleFilters } from "../api/types";
import type { VehiclesApi } from "../api/vehicles";
import { AuthProvider } from "../auth/AuthProvider";
import { fakeAuthApi, fakeVehiclesApi, memoryStorage, sampleVehicles, vehicle } from "../test/helpers";
import { useVehicles } from "./useVehicles";

/** A promise a test settles by hand, to control the order in which responses arrive. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup(filters: VehicleFilters = {}, api = fakeVehiclesApi()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider authApi={fakeAuthApi() as never} storage={memoryStorage()}>
      <ApiProvider vehiclesApi={api as unknown as VehiclesApi}>{children}</ApiProvider>
    </AuthProvider>
  );
  const hook = renderHook(({ filters }) => useVehicles(filters), { wrapper, initialProps: { filters } });
  return { api, ...hook };
}

const abortError = () => new DOMException("The operation was aborted.", "AbortError");

describe("useVehicles", () => {
  it("starts out loading and then has the vehicles", async () => {
    const { result } = setup();

    expect(result.current.status).toBe("loading");
    expect(result.current.vehicles).toEqual([]);

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.vehicles).toEqual(sampleVehicles());
    expect(result.current.isFetching).toBe(false);
  });

  it("asks for the given filters and can be cancelled", async () => {
    const { api, result } = setup({ make: "toy", minPrice: "10000" });

    await waitFor(() => expect(result.current.status).toBe("ready"));

    expect(api.find).toHaveBeenCalledWith({ make: "toy", minPrice: "10000" }, expect.any(AbortSignal));
  });

  describe("when loading fails", () => {
    it("says so in plain words, and a retry recovers", async () => {
      const api = fakeVehiclesApi();
      api.find.mockRejectedValueOnce(new ApiError(0, "NETWORK_ERROR", "Could not reach the server. Check your connection and try again."));
      const { result } = setup({}, api);

      await waitFor(() => expect(result.current.status).toBe("error"));
      expect(result.current.error).toBe("Could not reach the server. Check your connection and try again.");
      expect(result.current.vehicles).toEqual([]);

      act(() => result.current.reload());
      expect(result.current.status).toBe("loading");

      await waitFor(() => expect(result.current.status).toBe("ready"));
      expect(result.current.error).toBeUndefined();
      expect(result.current.vehicles).toHaveLength(3);
    });

    it("never exposes a raw error", async () => {
      const api = fakeVehiclesApi();
      api.find.mockRejectedValueOnce(new TypeError("Cannot read properties of undefined"));
      const { result } = setup({}, api);

      await waitFor(() => expect(result.current.status).toBe("error"));

      expect(result.current.error).toBe("Something went wrong. Please try again.");
    });
  });

  describe("when the filters change", () => {
    it("fetches again with the new filters", async () => {
      const { api, result, rerender } = setup({ make: "toy" });
      await waitFor(() => expect(result.current.status).toBe("ready"));

      rerender({ filters: { make: "honda" } });

      await waitFor(() => expect(api.find).toHaveBeenCalledTimes(2));
      expect(api.find).toHaveBeenLastCalledWith({ make: "honda" }, expect.any(AbortSignal));
    });

    it("does not fetch again when the filters are the same, even in a new object", async () => {
      const { api, result, rerender } = setup({ make: "toy", model: "" });
      await waitFor(() => expect(result.current.status).toBe("ready"));

      rerender({ filters: { make: "toy", model: "" } });
      rerender({ filters: { model: "", make: "toy" } });

      expect(api.find).toHaveBeenCalledTimes(1);
    });

    it("keeps showing the previous results, marked as refreshing, instead of flashing a loading state", async () => {
      const api = fakeVehiclesApi();
      const next = deferred<Vehicle[]>();
      const { result, rerender } = setup({}, api);
      await waitFor(() => expect(result.current.status).toBe("ready"));

      api.find.mockReturnValueOnce(next.promise);
      rerender({ filters: { make: "honda" } });

      await waitFor(() => expect(result.current.isFetching).toBe(true));
      expect(result.current.status).toBe("ready");
      expect(result.current.vehicles).toHaveLength(3);

      await act(async () => next.resolve([vehicle({ id: "v-civic", make: "Honda", model: "Civic" })]));

      expect(result.current.vehicles).toHaveLength(1);
      expect(result.current.isFetching).toBe(false);
    });

    it("ignores a slow answer to an old search that arrives after the answer to a newer one", async () => {
      const api = fakeVehiclesApi();
      const slowOld = deferred<Vehicle[]>();
      const fastNew = deferred<Vehicle[]>();
      api.find.mockReturnValueOnce(slowOld.promise).mockReturnValueOnce(fastNew.promise);
      const { result, rerender } = setup({ make: "t" }, api);

      rerender({ filters: { make: "toy" } });
      await act(async () => fastNew.resolve([vehicle({ id: "new" })]));
      expect(result.current.vehicles.map((v) => v.id)).toEqual(["new"]);

      await act(async () => slowOld.resolve([vehicle({ id: "old-1" }), vehicle({ id: "old-2" })]));

      expect(result.current.vehicles.map((v) => v.id)).toEqual(["new"]);
    });

    it("cancels the request it no longer needs", async () => {
      const api = fakeVehiclesApi();
      const { result, rerender } = setup({ make: "t" }, api);
      await waitFor(() => expect(result.current.status).toBe("ready"));
      const firstSignal = api.find.mock.calls[0]![1]!;

      rerender({ filters: { make: "toy" } });

      expect(firstSignal.aborted).toBe(true);
    });

    it("does not show an error for a cancelled request, not even while its replacement is still loading", async () => {
      const api = fakeVehiclesApi();
      const replacement = deferred<Vehicle[]>();
      api.find
        .mockImplementationOnce((_filters, signal) => new Promise((_resolve, reject) => signal?.addEventListener("abort", () => reject(abortError()))))
        .mockReturnValueOnce(replacement.promise);
      const { result, rerender } = setup({ make: "t" }, api);

      rerender({ filters: { make: "toy" } });
      await act(async () => {}); // let the cancelled request's rejection reach the hook

      expect(result.current.status).not.toBe("error"); // checked now, not after the replacement hides it
      expect(result.current.error).toBeUndefined();

      await act(async () => replacement.resolve([vehicle()]));
      expect(result.current.status).toBe("ready");
    });
  });

  it("cancels its request when the screen goes away", async () => {
    const api = fakeVehiclesApi();
    const pending = deferred<Vehicle[]>();
    api.find.mockReturnValueOnce(pending.promise);
    const { unmount } = setup({}, api);
    const signal = api.find.mock.calls[0]![1]!;

    unmount();

    expect(signal.aborted).toBe(true);
  });

  it("swaps one vehicle for its updated version without asking the server again", async () => {
    const { api, result } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));

    act(() => result.current.replace(vehicle({ quantity: 4 })));

    expect(result.current.vehicles.find((v) => v.id === "v-camry")?.quantity).toBe(4);
    expect(result.current.vehicles).toHaveLength(3);
    expect(api.find).toHaveBeenCalledTimes(1);
  });

  it("fetches again when asked to reload", async () => {
    const { api, result } = setup();
    await waitFor(() => expect(result.current.status).toBe("ready"));

    act(() => result.current.reload());

    await waitFor(() => expect(api.find).toHaveBeenCalledTimes(2));
  });
});
