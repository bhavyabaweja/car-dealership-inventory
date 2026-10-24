import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import type { Vehicle, VehicleFilters } from "../api/types";
import { fakeVehiclesApi, sampleVehicles, storedSession, vehicle } from "../test/helpers";
import { renderApp } from "../test/renderApp";

vi.mock("../config", () => ({ config: { currency: "USD", locale: "en-US", apiBaseUrl: "" } }));
// Without the wait, every keystroke searches at once, which keeps these tests instant and exact.
// The wait itself is tested on its own (useDebouncedValue) and once with real timing (DashboardSearchDebounce).
vi.mock("../hooks/useDebouncedValue", () => ({ useDebouncedValue: <T,>(value: T) => value }));

const toyotas = [vehicle(), vehicle({ id: "v-rav4", model: "RAV4", category: "SUV", price: "32000.50", quantity: 2 })];

function openDashboard({ url = "/", api = fakeVehiclesApi() } = {}) {
  return { api, ...renderApp(url, { stored: storedSession(), vehiclesApi: api }) };
}

const filtersOf = (call: unknown[] | undefined) => call?.[0] as VehicleFilters;
const lastSearch = (api: ReturnType<typeof fakeVehiclesApi>) => filtersOf(api.find.mock.lastCall);
// No pause between keystrokes: the dashboard re-renders on each one, and a pause adds seconds without testing anything.
const type = (label: string | RegExp, text: string) => userEvent.setup({ delay: null }).type(screen.getByLabelText(label), text);

describe("searching the vehicles", () => {
  it("shows the search fields above the list", async () => {
    openDashboard();
    await screen.findAllByRole("article");

    for (const label of ["Make", "Model", "Category", "Min price (USD)", "Max price (USD)"]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it("searches as the person types and shows what matched", async () => {
    const api = fakeVehiclesApi();
    api.find.mockImplementation(async (filters) => ((filters as VehicleFilters).make === "toy" ? toyotas : sampleVehicles()));
    openDashboard({ api });
    expect(await screen.findAllByRole("article")).toHaveLength(3);

    await type("Make", "toy");

    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(2));
    expect(screen.getByText("2 vehicles")).toBeInTheDocument();
    expect(lastSearch(api)).toEqual({ make: "toy" });
  });

  it("combines every filter, with the prices as the text typed", async () => {
    const { api } = openDashboard();
    await screen.findAllByRole("article");

    await type("Make", "Toyota");
    await type("Model", "Camry");
    await type("Category", "Sedan");
    await type("Min price (USD)", "20000");
    await type("Max price (USD)", "30000.50");

    await waitFor(() =>
      expect(lastSearch(api)).toEqual({ make: "Toyota", model: "Camry", category: "Sedan", minPrice: "20000", maxPrice: "30000.50" }),
    );
  });

  it("does not search again for spaces alone", async () => {
    const { api } = openDashboard();
    await screen.findAllByRole("article");

    await type("Make", "   ");

    expect(api.find).toHaveBeenCalledTimes(1);
  });

  describe("prices", () => {
    it("explains a price that is not an amount, and does not send it", async () => {
      const { api } = openDashboard();
      await screen.findAllByRole("article");

      await type("Min price (USD)", "abc");

      expect(await screen.findByText("Enter an amount like 25000 or 25000.50.")).toBeInTheDocument();
      expect(screen.getByLabelText("Min price (USD)")).toBeInvalid();
      expect(api.find.mock.calls.map(filtersOf).some((filters) => "minPrice" in filters)).toBe(false);
    });

    it("searches once the price is corrected, and the explanation goes away", async () => {
      const { api } = openDashboard();
      await screen.findAllByRole("article");
      const user = userEvent.setup();
      await user.type(screen.getByLabelText("Min price (USD)"), "abc");
      await screen.findByText("Enter an amount like 25000 or 25000.50.");

      await user.clear(screen.getByLabelText("Min price (USD)"));
      await user.type(screen.getByLabelText("Min price (USD)"), "10000");

      await waitFor(() => expect(lastSearch(api)).toEqual({ minPrice: "10000" }));
      expect(screen.queryByText("Enter an amount like 25000 or 25000.50.")).not.toBeInTheDocument();
    });

    it("says so when the maximum is below the minimum, and still applies the text filters", async () => {
      const { api } = openDashboard();
      await screen.findAllByRole("article");

      await type("Make", "toy");
      await type("Min price (USD)", "30000");
      await type("Max price (USD)", "20000");

      expect(await screen.findByText("The maximum can't be lower than the minimum.")).toBeInTheDocument();
      expect(lastSearch(api)).toEqual({ make: "toy" });
    });
  });

  describe("clearing the search", () => {
    it("offers to clear only while something is filtered, and shows everything again", async () => {
      const api = fakeVehiclesApi();
      api.find.mockImplementation(async (filters) => ((filters as VehicleFilters).make === "toy" ? toyotas : sampleVehicles()));
      openDashboard({ api });
      await screen.findAllByRole("article");
      expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();

      await type("Make", "toy");
      await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(2));
      await userEvent.setup().click(screen.getByRole("button", { name: "Clear filters" }));

      expect(screen.getByLabelText("Make")).toHaveValue("");
      await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(3));
      expect(lastSearch(api)).toEqual({});
      expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
    });

    it("tells the person nothing matched, as distinct from there being no vehicles at all, and offers everything back", async () => {
      const api = fakeVehiclesApi();
      api.find.mockImplementation(async (filters) => ((filters as VehicleFilters).make === "ferrari" ? [] : sampleVehicles()));
      openDashboard({ api });
      await screen.findAllByRole("article");

      await type("Make", "ferrari");

      expect(await screen.findByText("No vehicles match your search.")).toBeInTheDocument();
      expect(screen.queryByText("No vehicles available yet.")).not.toBeInTheDocument();

      await userEvent.setup().click(screen.getByRole("button", { name: "Show all vehicles" }));

      expect(await screen.findAllByRole("article")).toHaveLength(3);
      expect(screen.getByLabelText("Make")).toHaveValue("");
    });
  });

  describe("the address bar", () => {
    it("restores a search from it: the fields are filled in and the search is made", async () => {
      const { api } = openDashboard({ url: "/?make=toyota&maxPrice=30000" });

      await screen.findAllByRole("article");

      expect(screen.getByLabelText("Make")).toHaveValue("toyota");
      expect(screen.getByLabelText("Max price (USD)")).toHaveValue("30000");
      expect(filtersOf(api.find.mock.calls[0])).toEqual({ make: "toyota", maxPrice: "30000" });
    });

    it("records the search as the person types, and returns to a plain address when it is cleared", async () => {
      openDashboard();
      await screen.findAllByRole("article");

      await type("Make", "toy");
      await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/?make=toy"));

      await userEvent.setup().click(screen.getByRole("button", { name: "Clear filters" }));
      await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/));
    });
  });

  it("keeps the previous results on screen, dimmed and marked busy, while the next search runs", async () => {
    const api = fakeVehiclesApi();
    let finish!: (vehicles: Vehicle[]) => void;
    openDashboard({ api });
    await screen.findAllByRole("article");
    api.find.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));

    await type("Make", "h");

    const list = screen.getByRole("list", { name: "Vehicles" });
    await waitFor(() => expect(list).toHaveAttribute("aria-busy", "true"));
    expect(screen.getAllByRole("article")).toHaveLength(3);

    finish([vehicle({ id: "v-civic", make: "Honda", model: "Civic" })]);
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(1));
    expect(screen.getByRole("list", { name: "Vehicles" })).toHaveAttribute("aria-busy", "false");
  });

  it("keeps the search fields when a search fails, and Try again repeats that search", async () => {
    const api = fakeVehiclesApi();
    openDashboard({ api });
    await screen.findAllByRole("article");
    api.find.mockRejectedValueOnce(new ApiError(0, "NETWORK_ERROR", "Could not reach the server. Check your connection and try again."));

    await type("Make", "x");

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the server");
    expect(screen.getByLabelText("Make")).toHaveValue("x"); // still there to be changed
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(lastSearch(api)).toEqual({ make: "x" });
  });

  it("lets the person buy from the search results", async () => {
    const api = fakeVehiclesApi();
    api.find.mockImplementation(async (filters) => ((filters as VehicleFilters).make === "toy" ? toyotas : sampleVehicles()));
    openDashboard({ api });
    await screen.findAllByRole("article");
    await type("Make", "toy");
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(2));

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Purchase Toyota Camry" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm order" }));

    expect(await within(screen.getByRole("article", { name: "Toyota Camry" })).findByText("4 in stock")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(2);
  });

  it("shows on the Filters button how many filters are in use", async () => {
    openDashboard();
    await screen.findAllByRole("article");

    await type("Make", "toy");
    await type("Max price (USD)", "30000");

    expect(within(screen.getByRole("button", { name: /^Filters/ })).getByText("2")).toBeInTheDocument();
  });
});
