import type { ApiClient } from "./client";
import type { NewVehicle, Vehicle, VehicleChanges, VehicleFilters } from "./types";

/** Only the filters that have something in them; undefined when there are none. */
function filledIn(filters: VehicleFilters): Record<string, string> | undefined {
  const entries = Object.entries(filters).filter(([, value]) => value !== undefined && value.trim() !== "");
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

const vehiclePath = (id: string) => `/vehicles/${encodeURIComponent(id)}`;

export function createVehiclesApi(client: ApiClient) {
  return {
    /** Lists everything when no filter is filled in, otherwise searches. */
    find(filters: VehicleFilters, signal?: AbortSignal) {
      const query = filledIn(filters);
      return client.request<Vehicle[]>("GET", query ? "/vehicles/search" : "/vehicles", { query, signal });
    },

    create: (vehicle: NewVehicle) => client.request<Vehicle>("POST", "/vehicles", { body: vehicle }),

    update: (id: string, changes: VehicleChanges) => client.request<Vehicle>("PUT", vehiclePath(id), { body: changes }),

    remove: (id: string) => client.request<void>("DELETE", vehiclePath(id)),

    /** Buys one unit, or `quantity` units. */
    purchase: (id: string, quantity?: number) =>
      quantity === undefined
        ? client.request<Vehicle>("POST", `${vehiclePath(id)}/purchase`)
        : client.request<Vehicle>("POST", `${vehiclePath(id)}/purchase`, { body: { quantity } }),

    restock: (id: string, quantity: number) =>
      client.request<Vehicle>("POST", `${vehiclePath(id)}/restock`, { body: { quantity } }),
  };
}

export type VehiclesApi = ReturnType<typeof createVehiclesApi>;
