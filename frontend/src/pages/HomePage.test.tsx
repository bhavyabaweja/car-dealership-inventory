import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { storedSession } from "../test/helpers";
import { renderApp } from "../test/renderApp";

vi.mock("../config", () => ({ config: { currency: "USD", locale: "en-US", apiBaseUrl: "" } }));

// Two looks share the app: the landing page a visitor sees is the updated Stitch design, and the inventory a signed-in user sees is
// the first one (a deeper navy, the first design's blues). The signed-in look is switched on by a class on the page's root element,
// which re-points the colour tokens, so that dialogs and notifications, which sit outside the page's own tree, follow it too.

const root = () => document.documentElement;

describe("the signed-in look", () => {
  it("is switched on while the inventory is shown", async () => {
    renderApp("/", { stored: storedSession("USER") });

    await screen.findAllByRole("article");

    expect(root()).toHaveClass("theme-inventory");
  });

  it("is not on the landing page, which keeps the updated design", () => {
    renderApp("/");

    expect(screen.getByRole("heading", { level: 1, name: /find your perfect drive/i })).toBeInTheDocument();
    expect(root()).not.toHaveClass("theme-inventory");
  });

  it("goes when the person signs out, and is there again when they sign back in", async () => {
    const { auth } = renderApp("/", { stored: storedSession("USER") });
    await screen.findAllByRole("article");

    await userEvent.setup().click(screen.getByRole("button", { name: "Sign out" }));
    expect(root()).not.toHaveClass("theme-inventory");

    await act(() => auth.current!.login("jane@example.com", "Sup3rSecret!"));
    await screen.findAllByRole("article");
    expect(root()).toHaveClass("theme-inventory");
  });

  it("is not left behind when the app goes away", async () => {
    const { unmount } = renderApp("/", { stored: storedSession("USER") });
    await screen.findAllByRole("article");

    unmount();

    expect(root()).not.toHaveClass("theme-inventory");
  });
});
