import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SESSION_KEY } from "../auth/session";
import { storedSession } from "../test/helpers";
import { renderApp } from "../test/renderApp";

describe("the header of the signed-in app", () => {
  it("shows who is signed in", () => {
    renderApp("/", { stored: storedSession("USER") });

    const header = screen.getByRole("banner");
    expect(within(header).getByText("user@example.com")).toBeInTheDocument();
    expect(within(header).queryByText("Admin")).not.toBeInTheDocument();
  });

  it("marks an administrator", () => {
    renderApp("/", { stored: storedSession("ADMIN") });

    expect(within(screen.getByRole("banner")).getByText("Admin")).toBeInTheDocument();
  });

  it("signs out, forgets the session, and returns to the login page", async () => {
    const { storage } = renderApp("/", { stored: storedSession() });

    await userEvent.setup().click(screen.getByRole("button", { name: "Sign out" }));

    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(storage.items.has(SESSION_KEY)).toBe(false);
    expect(screen.queryByRole("status")).not.toBeInTheDocument(); // signing out is not an expiry
  });
});

describe("routing", () => {
  it("sends a signed-out visitor from the dashboard to the login page", () => {
    renderApp("/");

    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
  });

  it.each([["/no/such/page"], ["/vehicles/123"]])("sends %s to the home page", (path) => {
    renderApp(path, { stored: storedSession() });

    expect(screen.getByRole("heading", { name: "Vehicles" })).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
  });
});
