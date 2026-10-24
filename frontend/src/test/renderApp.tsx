import { render } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import type { AuthApi } from "../api/auth";
import type { VehiclesApi } from "../api/vehicles";
import { AppProviders } from "../AppProviders";
import { AppRoutes } from "../App";
import { useAuth } from "../auth/AuthProvider";
import { SESSION_KEY } from "../auth/session";
import { fakeAuthApi, fakeVehiclesApi, memoryStorage, NOW } from "./helpers";

/** Shows the current location so tests can check where a redirect ended up. */
function LocationProbe() {
  const { pathname, search } = useLocation();
  // A plain element: <output> has the ARIA role "status", which would confuse tests that look for real status messages.
  return <div data-testid="location">{pathname + search}</div>;
}

interface RenderOptions {
  /** The session already in storage, as JSON: the person starts out signed in. */
  stored?: string;
  /** Router state, as a redirect leaves it. */
  state?: unknown;
  authApi?: ReturnType<typeof fakeAuthApi>;
  vehiclesApi?: ReturnType<typeof fakeVehiclesApi>;
}

/** Renders the real routes with the real providers; only the network is faked. */
export function renderApp(
  url = "/",
  { stored, state, authApi = fakeAuthApi(), vehiclesApi = fakeVehiclesApi() }: RenderOptions = {},
) {
  const storage = memoryStorage(stored === undefined ? {} : { [SESSION_KEY]: stored });
  const auth: { current: ReturnType<typeof useAuth> | undefined } = { current: undefined };

  function CaptureAuth() {
    auth.current = useAuth();
    return null;
  }

  const { pathname, search } = new URL(url, "http://localhost");
  const { unmount } = render(
    <AppProviders
      authApi={authApi as unknown as AuthApi}
      vehiclesApi={vehiclesApi as unknown as VehiclesApi}
      storage={storage}
      now={() => NOW}
    >
      <MemoryRouter initialEntries={[{ pathname, search, state }]}>
        <CaptureAuth />
        <LocationProbe />
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  );

  return { authApi, vehiclesApi, storage, auth, unmount };
}
