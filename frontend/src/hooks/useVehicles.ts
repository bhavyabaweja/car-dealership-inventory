import { useCallback, useEffect, useMemo, useState } from "react";
import { useVehiclesApi } from "../api/ApiProvider";
import type { Vehicle, VehicleFilters } from "../api/types";
import { messageFor } from "../lib/errors";

const FILTER_KEYS = ["make", "model", "category", "minPrice", "maxPrice"] as const;

/**
 * Filters as a string, so two filter objects with the same values count as the same search whatever
 * their identity or key order. Callers build a new object on every render; they must not cause a fetch.
 */
const keyOf = (filters: VehicleFilters): string => JSON.stringify(FILTER_KEYS.map((name) => filters[name] ?? ""));

/** The filters a key stands for: only the ones that have a value. */
function filtersOf(key: string): VehicleFilters {
  const values = JSON.parse(key) as string[];
  return Object.fromEntries(FILTER_KEYS.flatMap((name, index) => (values[index] ? [[name, values[index]]] : [])));
}

interface Loaded {
  status: "loading" | "ready" | "error";
  vehicles: Vehicle[];
  error?: string;
}

/**
 * The vehicles matching the filters, kept up to date as the filters change.
 *
 * Results stay on screen, with `isFetching` set, while a new search runs, so the list does not flash.
 * A search that is no longer wanted is cancelled, and if its answer arrives anyway it is ignored,
 * so a slow response to an old search can never overwrite the answer to a newer one.
 */
export function useVehicles(filters: VehicleFilters) {
  const api = useVehiclesApi();
  const key = keyOf(filters);
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading", vehicles: [] });
  const [isFetching, setIsFetching] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsFetching(true);
    // Retrying after a failure starts from a clean loading state rather than showing the old error.
    setLoaded((current) => (current.status === "error" ? { status: "loading", vehicles: [] } : current));

    api.find(filtersOf(key), controller.signal).then(
      (vehicles) => {
        if (controller.signal.aborted) return; // an old search answering late
        setLoaded({ status: "ready", vehicles });
        setIsFetching(false);
      },
      (failure) => {
        if (controller.signal.aborted) return; // cancelled on purpose: not a failure
        setLoaded({ status: "error", vehicles: [], error: messageFor(failure) });
        setIsFetching(false);
      },
    );

    return () => controller.abort();
  }, [api, key, attempt]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);

  /** Puts a vehicle's newer version in place, such as after a purchase, without asking the server again. */
  const replace = useCallback((vehicle: Vehicle) => {
    setLoaded((current) => ({
      ...current,
      vehicles: current.vehicles.map((existing) => (existing.id === vehicle.id ? vehicle : existing)),
    }));
  }, []);

  return useMemo(
    () => ({ ...loaded, isFetching, reload, replace }),
    [loaded, isFetching, reload, replace],
  );
}
