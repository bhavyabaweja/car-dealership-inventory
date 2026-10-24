import { render } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import type { AuthApi } from "../api/auth";
import { AppRoutes } from "../App";
import { AuthProvider, useAuth } from "../auth/AuthProvider";
import { SESSION_KEY } from "../auth/session";
import { fakeAuthApi, memoryStorage, NOW } from "./helpers";

/** Shows the current location so tests can check where a redirect ended up. */
function LocationProbe() {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{pathname + search}</output>;
}

/**
 * Renders the real routes with the real providers; only the network is faked.
 * `stored` is the session already in storage (signed in); `state` is router state, as a redirect leaves it.
 */
export function renderApp(
  url = "/",
  { stored, state, authApi = fakeAuthApi() }: { stored?: string; state?: unknown; authApi?: ReturnType<typeof fakeAuthApi> } = {},
) {
  const storage = memoryStorage(stored === undefined ? {} : { [SESSION_KEY]: stored });
  const auth: { current: ReturnType<typeof useAuth> | undefined } = { current: undefined };

  function CaptureAuth() {
    auth.current = useAuth();
    return null;
  }

  const { pathname, search } = new URL(url, "http://localhost");
  render(
    <AuthProvider authApi={authApi as unknown as AuthApi} storage={storage} now={() => NOW}>
      <MemoryRouter initialEntries={[{ pathname, search, state }]}>
        <CaptureAuth />
        <LocationProbe />
        <AppRoutes />
      </MemoryRouter>
    </AuthProvider>,
  );

  return { authApi, storage, auth };
}
