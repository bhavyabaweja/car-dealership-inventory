import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useAuth } from "../auth/AuthProvider";
import { createApiClient } from "./client";
import { createVehiclesApi, type VehiclesApi } from "./vehicles";

const ApiContext = createContext<VehiclesApi | null>(null);

interface ApiProviderProps {
  children: ReactNode;
  /** Replaces the real API, for tests. */
  vehiclesApi?: VehiclesApi;
  /** Replaces the network, for tests of the wiring itself. */
  fetchImpl?: typeof fetch;
}

/**
 * Gives the app its vehicles API. Its client takes the token from the signed-in session on every
 * request and, when the server rejects that token, ends the session: this is where the two meet.
 */
export function ApiProvider({ children, vehiclesApi, fetchImpl }: ApiProviderProps) {
  const { getToken, expireSession } = useAuth();

  // getToken and expireSession never change, so this is built once and stays the same object,
  // which lets hooks list it as a dependency without refetching.
  const api = useMemo(
    () => vehiclesApi ?? createVehiclesApi(createApiClient({ getToken, onUnauthorized: expireSession, fetchImpl })),
    [vehiclesApi, getToken, expireSession, fetchImpl],
  );

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

export function useVehiclesApi(): VehiclesApi {
  const api = useContext(ApiContext);
  if (!api) throw new Error("useVehiclesApi must be used inside an ApiProvider");
  return api;
}
