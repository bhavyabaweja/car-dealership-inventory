import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { fakeVehiclesApi, storedSession } from "../test/helpers";
import { renderApp } from "../test/renderApp";

vi.mock("../config", () => ({ config: { currency: "USD", locale: "en-US", apiBaseUrl: "" } }));

// The updated design's navigation: Home, Browse Inventory, Categories, About, with a menu button on phones.
// Every link must lead somewhere that exists on the page.

const user = () => userEvent.setup({ delay: null });
const openDashboard = (api = fakeVehiclesApi()) => renderApp("/", { stored: storedSession("USER"), vehiclesApi: api });
const mainNav = () => within(screen.getByRole("navigation", { name: "Main" }));
const menuButton = () => screen.getByRole("button", { name: /^(Open|Close) menu$/ });

describe("the main navigation", () => {
  it("has the four links of the design, each leading to a part of the page that exists", async () => {
    openDashboard();
    await screen.findAllByRole("article");

    const links = mainNav().getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual(["Home", "Browse inventory", "Categories", "About"]);
    for (const link of links) {
      const target = link.getAttribute("href")!;
      expect(target).toMatch(/^#/);
      expect(document.getElementById(target.slice(1)), `${link.textContent} -> ${target}`).not.toBeNull();
    }
  });

  it("leaves out Categories when there are no categories to go to, rather than linking to nothing", async () => {
    const api = fakeVehiclesApi();
    api.find.mockResolvedValue([]);
    openDashboard(api);
    await screen.findByText("No vehicles available yet.");

    expect(mainNav().queryByRole("link", { name: "Categories" })).not.toBeInTheDocument();
    expect(mainNav().getByRole("link", { name: "Browse inventory" })).toBeInTheDocument();
  });
});

describe("the menu on a phone", () => {
  it("starts closed, with a button that says so and names what it controls", async () => {
    openDashboard();
    await screen.findAllByRole("article");

    expect(menuButton()).toHaveAccessibleName("Open menu");
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();
  });

  it("opens with the same four links, and the button then offers to close it", async () => {
    openDashboard();
    await screen.findAllByRole("article");

    await user().click(menuButton());

    expect(menuButton()).toHaveAccessibleName("Close menu");
    expect(menuButton()).toHaveAttribute("aria-expanded", "true");
    const menu = within(screen.getByRole("navigation", { name: "Mobile" }));
    expect(menu.getAllByRole("link").map((link) => link.textContent)).toEqual(["Home", "Browse inventory", "Categories", "About"]);
    expect(document.getElementById(menuButton().getAttribute("aria-controls")!)).toContainElement(screen.getByRole("navigation", { name: "Mobile" }));
  });

  it("closes on the button again, on Escape (returning the cursor to the button), and on choosing a link", async () => {
    openDashboard();
    await screen.findAllByRole("article");

    await user().click(menuButton());
    await user().click(menuButton());
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();

    await user().click(menuButton());
    fireEvent.keyDown(screen.getByRole("navigation", { name: "Mobile" }), { key: "Escape" });
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();
    expect(menuButton()).toHaveFocus();

    await user().click(menuButton());
    await user().click(within(screen.getByRole("navigation", { name: "Mobile" })).getByRole("link", { name: "Browse inventory" }));
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();
  });

  it("does not leave Escape listening once the menu is closed", async () => {
    openDashboard();
    await screen.findAllByRole("article");
    await user().click(menuButton());
    await user().click(menuButton());
    (document.activeElement as HTMLElement).blur();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(menuButton()).not.toHaveFocus(); // no stray focus move from a menu that is not open
  });
});
