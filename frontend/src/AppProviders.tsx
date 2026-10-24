import type { ReactNode } from "react";
import { ApiProvider } from "./api/ApiProvider";
import type { AuthApi } from "./api/auth";
import type { VehiclesApi } from "./api/vehicles";
import { AuthProvider } from "./auth/AuthProvider";
import type { SessionStorage } from "./auth/session";
import { ToastProvider } from "./components/Toasts";

interface AppProvidersProps {
  children: ReactNode;
  /** Everything below is for tests, which replace the network and storage. */
  authApi?: AuthApi;
  vehiclesApi?: VehiclesApi;
  storage?: SessionStorage;
  now?: () => number;
}

/** Everything the screens depend on, in the order they depend on each other: session, API, toasts. */
export function AppProviders({ children, authApi, vehiclesApi, storage, now }: AppProvidersProps) {
  return (
    <AuthProvider authApi={authApi} storage={storage} now={now}>
      <ApiProvider vehiclesApi={vehiclesApi}>
        <ToastProvider>{children}</ToastProvider>
      </ApiProvider>
    </AuthProvider>
  );
}
