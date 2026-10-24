import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { AuthApi } from "../api/auth";
import { freshToken, memoryStorage, NOW, userWithRole } from "../test/helpers";
import { AuthProvider } from "./AuthProvider";
import { GuestOnly, RequireAuth } from "./guards";
import { SESSION_KEY } from "./session";

/** Shows where a redirect came from, so tests can check the person is sent back there after signing in. */
function LoginPage() {
  const location = useLocation();
  return <p>login page (from: {String((location.state as { from?: string } | null)?.from ?? "nowhere")})</p>;
}

function renderApp(path: string, { signedIn }: { signedIn: boolean }) {
  const storage = memoryStorage(
    signedIn ? { [SESSION_KEY]: JSON.stringify({ token: freshToken(), user: userWithRole() }) } : {},
  );
  const authApi = { login: vi.fn(), register: vi.fn() } as unknown as AuthApi;
  return render(
    <AuthProvider authApi={authApi} storage={storage} now={() => NOW}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<RequireAuth><p>dashboard</p></RequireAuth>} />
          <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("RequireAuth", () => {
  it("shows the page to a signed-in user", () => {
    renderApp("/", { signedIn: true });

    expect(screen.getByText("dashboard")).toBeInTheDocument();
  });

  it("sends a signed-out visitor to the login page, remembering where they were headed", () => {
    renderApp("/?make=toyota", { signedIn: false });

    expect(screen.queryByText("dashboard")).not.toBeInTheDocument();
    expect(screen.getByText("login page (from: /?make=toyota)")).toBeInTheDocument();
  });
});

describe("GuestOnly", () => {
  it("shows the login page to a signed-out visitor", () => {
    renderApp("/login", { signedIn: false });

    expect(screen.getByText(/login page/)).toBeInTheDocument();
  });

  it("sends a signed-in user who opens the login page straight to the dashboard", () => {
    renderApp("/login", { signedIn: true });

    expect(screen.queryByText(/login page/)).not.toBeInTheDocument();
    expect(screen.getByText("dashboard")).toBeInTheDocument();
  });
});
