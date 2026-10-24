import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "../test/renderApp";

vi.mock("../config", () => ({ config: { currency: "USD", locale: "en-US", apiBaseUrl: "" } }));

// The landing page's header, from the updated design: a menu button on phones that opens the same links as the main navigation.
// (Which links there are, and that each leads somewhere on the page, is checked in LandingPage.test.)

const user = () => userEvent.setup({ delay: null });
const menuButton = () => screen.getByRole("button", { name: /^(Open|Close) menu$/ });
const mobileNav = () => screen.getByRole("navigation", { name: "Mobile" });

describe("the menu on a phone", () => {
  it("starts closed, with a button that says so and names what it controls", () => {
    renderApp("/");

    expect(menuButton()).toHaveAccessibleName("Open menu");
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();
  });

  it("opens with the same links as the main navigation, and the button then offers to close it", async () => {
    renderApp("/");

    await user().click(menuButton());

    expect(menuButton()).toHaveAccessibleName("Close menu");
    expect(menuButton()).toHaveAttribute("aria-expanded", "true");
    const links = within(mobileNav()).getAllByRole("link").map((link) => link.textContent);
    expect(links).toEqual(["Home", "Browse inventory", "About"]);
    expect(document.getElementById(menuButton().getAttribute("aria-controls")!)).toContainElement(mobileNav());
  });

  it("closes on the button again, on Escape (returning the cursor to the button), and on choosing a link", async () => {
    renderApp("/");

    await user().click(menuButton());
    await user().click(menuButton());
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();

    await user().click(menuButton());
    within(mobileNav()).getAllByRole("link")[0]!.focus(); // the cursor is in the menu
    expect(menuButton()).not.toHaveFocus();
    fireEvent.keyDown(mobileNav(), { key: "Escape" });
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();
    expect(menuButton()).toHaveFocus();

    await user().click(menuButton());
    await user().click(within(mobileNav()).getByRole("link", { name: "Browse inventory" }));
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();
  });

  it("does not leave Escape listening once the menu is closed", async () => {
    renderApp("/");
    await user().click(menuButton());
    await user().click(menuButton());
    (document.activeElement as HTMLElement).blur();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(menuButton()).not.toHaveFocus(); // no stray focus move from a menu that is not open
  });
});
