import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { fakeVehiclesApi, sampleVehicles, storedSession, vehicle } from "../test/helpers";
import { renderApp } from "../test/renderApp";

vi.mock("../config", () => ({ config: { currency: "USD", locale: "en-US", apiBaseUrl: "" } }));

// What the sample has: Toyota Camry (sedan, 5, $25,000.00), Toyota RAV4 (SUV, 2, $32,000.50), Honda Civic (sedan, sold out, $22,000.00).

const user = () => userEvent.setup({ delay: null });
const openDashboard = (api = fakeVehiclesApi(), role: "USER" | "ADMIN" = "USER") =>
  renderApp("/", { stored: storedSession(role), vehiclesApi: api });

/** The names of the vehicles on screen, in order. */
const shown = () => screen.getAllByRole("article").map((card) => within(card).getByRole("heading").textContent);
const categories = () => screen.getByRole("group", { name: "Category" });
const tab = (name: string | RegExp) => within(categories()).getByRole("button", { name });
const stockSwitch = () => screen.getByRole("switch", { name: "In stock only" });
const chooseSort = (label: string) => user().selectOptions(screen.getByRole("combobox", { name: "Sort by" }), label);

describe("category tabs", () => {
  it("offer All and each category the loaded vehicles have, with how many, the biggest first", async () => {
    openDashboard();
    await screen.findAllByRole("article");

    expect(within(categories()).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "All inventory3",
      "Sedan2",
      "SUV1",
    ]);
    expect(tab("All inventory 3")).toHaveAttribute("aria-pressed", "true");
    expect(tab("Sedan 2")).toHaveAttribute("aria-pressed", "false");
  });

  it("narrow the list to one category, say which is chosen, and say how many are shown", async () => {
    openDashboard();
    await screen.findAllByRole("article");

    await user().click(tab("SUV 1"));

    expect(shown()).toEqual(["Toyota RAV4"]);
    expect(tab("SUV 1")).toHaveAttribute("aria-pressed", "true");
    expect(tab("All inventory 3")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("1 vehicle")).toBeInTheDocument();
  });

  it("go back to everything on All", async () => {
    openDashboard();
    await screen.findAllByRole("article");
    await user().click(tab("SUV 1"));

    await user().click(tab("All inventory 3"));

    expect(shown()).toEqual(["Toyota Camry", "Toyota RAV4", "Honda Civic"]);
  });

  it("are rebuilt from each new search, so they never offer a category the results do not have", async () => {
    const api = fakeVehiclesApi();
    api.find.mockImplementation(async (filters: unknown) =>
      (filters as { make?: string }).make === "Honda" ? [sampleVehicles()[2]!] : sampleVehicles(),
    );
    openDashboard(api);
    await screen.findAllByRole("article");

    await user().type(screen.getByLabelText("Make"), "Honda");

    await waitFor(() => expect(shown()).toEqual(["Honda Civic"]));
    expect(within(categories()).getAllByRole("button").map((button) => button.textContent)).toEqual(["All inventory1", "Sedan1"]);
  });

  it("fall back to All when the chosen category disappears, as when its last vehicle is deleted", async () => {
    const api = fakeVehiclesApi();
    openDashboard(api, "ADMIN");
    await screen.findAllByRole("article");
    await user().click(tab("SUV 1"));

    await user().click(screen.getByRole("button", { name: "Delete Toyota RAV4" }));
    await user().click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete vehicle" }));

    await waitFor(() => expect(shown()).toEqual(["Toyota Camry", "Honda Civic"]));
    expect(within(categories()).queryByRole("button", { name: /^SUV/ })).not.toBeInTheDocument();
    expect(tab("All inventory 2")).toHaveAttribute("aria-pressed", "true");
  });

  it("are absent when there is nothing to choose between", async () => {
    const api = fakeVehiclesApi();
    api.find.mockResolvedValue([]);
    openDashboard(api);

    await screen.findByText("No vehicles available yet.");

    expect(screen.queryByRole("group", { name: "Category" })).not.toBeInTheDocument();
  });
});

describe("the in-stock switch", () => {
  it("starts off, and when turned on leaves out what is sold out", async () => {
    openDashboard();
    await screen.findAllByRole("article");
    expect(stockSwitch()).not.toBeChecked();

    await user().click(stockSwitch());

    expect(stockSwitch()).toBeChecked();
    expect(shown()).toEqual(["Toyota Camry", "Toyota RAV4"]);
    expect(screen.getByText("2 vehicles")).toBeInTheDocument();
  });

  it("makes the tab counts count only what is in stock, and brings the sold-out vehicles back when turned off", async () => {
    openDashboard();
    await screen.findAllByRole("article");

    await user().click(stockSwitch());
    expect(tab("Sedan 1")).toBeInTheDocument();
    expect(tab("All inventory 2")).toBeInTheDocument();

    await user().click(stockSwitch());
    expect(shown()).toHaveLength(3);
    expect(tab("Sedan 2")).toBeInTheDocument();
  });

  it("works together with a category", async () => {
    openDashboard();
    await screen.findAllByRole("article");

    await user().click(tab("Sedan 2"));
    await user().click(stockSwitch());

    expect(shown()).toEqual(["Toyota Camry"]);
  });
});

describe("sorting", () => {
  it("offers the default order and three others", async () => {
    openDashboard();
    await screen.findAllByRole("article");

    const options = within(screen.getByRole("combobox", { name: "Sort by" })).getAllByRole("option");

    expect(options.map((option) => option.textContent)).toEqual([
      "Default order",
      "Price: low to high",
      "Price: high to low",
      "Most in stock",
    ]);
    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveValue("default");
  });

  it("orders by price either way, and goes back to the server's order on Default", async () => {
    openDashboard();
    await screen.findAllByRole("article");

    await chooseSort("Price: low to high");
    expect(shown()).toEqual(["Honda Civic", "Toyota Camry", "Toyota RAV4"]);

    await chooseSort("Price: high to low");
    expect(shown()).toEqual(["Toyota RAV4", "Toyota Camry", "Honda Civic"]);

    await chooseSort("Default order");
    expect(shown()).toEqual(["Toyota Camry", "Toyota RAV4", "Honda Civic"]);
  });

  it("orders by stock, most first", async () => {
    openDashboard();
    await screen.findAllByRole("article");

    await chooseSort("Most in stock");

    expect(shown()).toEqual(["Toyota Camry", "Toyota RAV4", "Honda Civic"]);
  });

  it("applies within a category and survives a purchase that changes a card", async () => {
    const api = fakeVehiclesApi();
    api.purchase.mockResolvedValue(vehicle({ id: "v-rav4", model: "RAV4", category: "SUV", price: "32000.50", quantity: 1 }));
    openDashboard(api);
    await screen.findAllByRole("article");
    await chooseSort("Price: high to low");

    await user().click(screen.getByRole("button", { name: "Purchase Toyota RAV4" }));

    await screen.findByText("Purchased Toyota RAV4.");
    expect(shown()).toEqual(["Toyota RAV4", "Toyota Camry", "Honda Civic"]);
    expect(screen.getByText("Only 1 left")).toBeInTheDocument();
  });
});

describe("a view that hides every vehicle", () => {
  it("says so, apart from a search that found nothing, and offers to show everything again", async () => {
    const api = fakeVehiclesApi();
    api.find.mockResolvedValue([vehicle({ id: "v-civic", make: "Honda", model: "Civic", quantity: 0 })]);
    openDashboard(api);
    await screen.findAllByRole("article");

    await user().click(stockSwitch());

    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(screen.getByText("No vehicles in this view.")).toBeInTheDocument();
    expect(screen.queryByText("No vehicles match your search.")).not.toBeInTheDocument();

    await user().click(screen.getByRole("button", { name: "Show everything" }));

    expect(shown()).toEqual(["Honda Civic"]);
    expect(stockSwitch()).not.toBeChecked();
    expect(tab("All inventory 1")).toHaveAttribute("aria-pressed", "true");
  });
});
