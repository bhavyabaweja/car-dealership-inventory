import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { fakeVehiclesApi, sampleVehicles, storedSession } from "../test/helpers";
import { renderApp } from "../test/renderApp";

vi.mock("../config", () => ({ config: { currency: "USD", locale: "en-US", apiBaseUrl: "" } }));

// What the sample has: Toyota Camry (sedan, 5), Toyota RAV4 (SUV, 2), Honda Civic (sedan, sold out).

const user = () => userEvent.setup({ delay: null });
const openDashboard = (api = fakeVehiclesApi()) => renderApp("/", { stored: storedSession("USER"), vehiclesApi: api });

const section = () => screen.getByRole("region", { name: "Browse by category" });
const categoryCard = (name: string | RegExp) => within(section()).getByRole("button", { name });
const heading = () => screen.getByRole("heading", { level: 2, name: "Available inventory" });
const shown = () => screen.getAllByRole("article").map((card) => within(card).getByRole("heading").textContent);
const tab = (name: string) => within(screen.getByRole("group", { name: "Filter by category" })).getByRole("button", { name });

describe("the Browse by category section", () => {
  it("has a card for each category the vehicles have, the biggest first, saying how many are available now", async () => {
    openDashboard();
    await screen.findAllByRole("article");

    const names = within(section()).getAllByRole("button").map((button) => button.getAttribute("aria-label"));

    // Sedan has two vehicles but only one is in stock: "available" means buyable.
    expect(names).toEqual(["Sedan 1 available", "SUV 1 available"]);
  });

  it("says 0 available for a category whose vehicles are all sold out, rather than leaving it out", async () => {
    const api = fakeVehiclesApi();
    api.find.mockResolvedValue([sampleVehicles()[2]!]);
    openDashboard(api);
    await screen.findAllByRole("article");

    expect(categoryCard("Sedan 0 available")).toBeInTheDocument();
  });

  it("shows that category's vehicles when a card is chosen, marks it chosen, and moves to the inventory", async () => {
    openDashboard();
    await screen.findAllByRole("article");

    await user().click(categoryCard("SUV 1 available"));

    expect(shown()).toEqual(["Toyota RAV4"]);
    expect(categoryCard("SUV 1 available")).toHaveAttribute("aria-pressed", "true");
    expect(categoryCard("Sedan 1 available")).toHaveAttribute("aria-pressed", "false");
    expect(tab("SUV 1")).toHaveAttribute("aria-pressed", "true"); // the tabs in the inventory agree
    expect(heading()).toHaveFocus();
  });

  it("goes back to everything when the chosen card is chosen again", async () => {
    openDashboard();
    await screen.findAllByRole("article");
    await user().click(categoryCard("SUV 1 available"));

    await user().click(categoryCard("SUV 1 available"));

    expect(shown()).toHaveLength(3);
    expect(categoryCard("SUV 1 available")).toHaveAttribute("aria-pressed", "false");
  });

  it("follows the search, offering only categories the results have", async () => {
    const api = fakeVehiclesApi();
    api.find.mockImplementation(async (filters: unknown) =>
      (filters as { make?: string }).make === "Honda" ? [sampleVehicles()[2]!] : sampleVehicles(),
    );
    openDashboard(api);
    await screen.findAllByRole("article");

    await user().type(screen.getByLabelText("Make"), "Honda");

    await waitFor(() => expect(within(section()).getAllByRole("button")).toHaveLength(1));
    expect(categoryCard("Sedan 0 available")).toBeInTheDocument();
  });

  it("is not there when there are no vehicles to browse", async () => {
    const api = fakeVehiclesApi();
    api.find.mockResolvedValue([]);
    openDashboard(api);

    await screen.findByText("No vehicles available yet.");

    expect(screen.queryByRole("region", { name: "Browse by category" })).not.toBeInTheDocument();
  });
});

describe("the footer's inventory links", () => {
  it("list the categories and show one on choosing it, like the cards", async () => {
    openDashboard();
    await screen.findAllByRole("article");
    const footer = within(screen.getByRole("contentinfo"));

    expect(footer.getAllByRole("button", { name: /^(Sedan|SUV)$/ })).toHaveLength(2);
    await user().click(footer.getByRole("button", { name: "SUV" }));

    expect(shown()).toEqual(["Toyota RAV4"]);
    expect(heading()).toHaveFocus();
  });
});

describe("the search console's Search vehicles button", () => {
  it("takes the person to the results: it is there, and so is Enter in a field, with no page reload", async () => {
    openDashboard();
    await screen.findAllByRole("article");

    await user().type(screen.getByLabelText("Make"), "toy{Enter}");
    expect(heading()).toHaveFocus();

    (document.activeElement as HTMLElement).blur();
    await user().click(screen.getByRole("button", { name: "Search vehicles" }));
    expect(heading()).toHaveFocus();
  });

  it("cancels the browser's own form submission, which would reload the page and lose the session's place", async () => {
    openDashboard();
    await screen.findAllByRole("article");

    const notCancelled = fireEvent.submit(screen.getByRole("search"));

    expect(notCancelled).toBe(false); // preventDefault was called
  });
});
