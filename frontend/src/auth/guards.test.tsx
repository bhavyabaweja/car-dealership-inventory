import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { AuthApi } from "../api/auth";
import { freshToken, memoryStorage, NOW, userWithRole } from "../test/helpers";
import { AuthProvider } from "./AuthProvider";
import { GuestOnly } from "./guards";
import { SESSION_KEY } from "./session";

/** Shows where a redirect came from, so tests can check the person is sent back there after signing in. */
function LoginPage() {
  const location = useLocation();
  return <p>login page (from: {String((location.state as { from?: string } | null)?.from ?? "nowhere")})</p>;
}

function Dashboard() {
  const { search } = useLocation();
  return <p>dashboard {search}</p>;
}

function renderApp(path: string, { signedIn, state }: { signedIn: boolean; state?: unknown }) {
  const storage = memoryStorage(
    signedIn ? { [SESSION_KEY]: JSON.stringify({ token: freshToken(), user: userWithRole() }) } : {},
  );
  const authApi = { login: vi.fn(), register: vi.fn() } as unknown as AuthApi;
  return render(
    <AuthProvider authApi={authApi} storage={storage} now={() => NOW}>
      <MemoryRouter initialEntries={[{ pathname: new URL(path, "http://localhost").pathname, search: new URL(path, "http://localhost").search, state }]}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

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

  describe("after signing in, returns the person to the page they were headed for", () => {
    it("including its query", () => {
      renderApp("/login", { signedIn: true, state: { from: "/?make=toyota" } });

      expect(screen.getByText("dashboard ?make=toyota")).toBeInTheDocument();
    });

    it.each([
      ["another site", "https://evil.example/phish"],
      ["a protocol-relative address", "//evil.example"],
      ["a slash then a backslash, which browsers read like two slashes", "/\\evil.example"],
      ["a script", "javascript:alert(1)"],
      ["something that is not a path", "dashboard"],
      ["something that is not text", 42],
    ])("but never to %s", (_label, from) => {
      renderApp("/login", { signedIn: true, state: { from } });

      expect(screen.getByText("dashboard")).toBeInTheDocument();
    });
  });
});
