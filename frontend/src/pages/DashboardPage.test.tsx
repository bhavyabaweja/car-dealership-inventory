import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import type { Vehicle } from "../api/types";
import { SESSION_KEY } from "../auth/session";
import { fakeVehiclesApi, sampleVehicles, storedSession, vehicle } from "../test/helpers";
import { renderApp } from "../test/renderApp";

// Fixed, so these tests do not depend on the machine's locale.
vi.mock("../config", () => ({ config: { currency: "USD", locale: "en-US", apiBaseUrl: "" } }));

/** Opens the dashboard as a signed-in user. */
function openDashboard(vehiclesApi = fakeVehiclesApi(), role: "USER" | "ADMIN" = "USER") {
  return renderApp("/", { stored: storedSession(role), vehiclesApi });
}

/** The card of a vehicle, for queries limited to it. */
const cardOf = async (name: string) => within(await screen.findByRole("article", { name }));

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

  it("signs out, forgets the session, and returns to the landing page", async () => {
    const { storage } = renderApp("/", { stored: storedSession() });

    await userEvent.setup().click(screen.getByRole("button", { name: "Sign out" }));

    expect(screen.getByRole("heading", { level: 1, name: /find your perfect drive/i })).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument(); // the inventory is for signed-in visitors
    expect(storage.items.has(SESSION_KEY)).toBe(false);
    expect(screen.queryByRole("status")).not.toBeInTheDocument(); // signing out is not an expiry
  });
});

describe("routing", () => {
  it("shows a signed-out visitor the landing page rather than the dashboard", () => {
    renderApp("/");

    expect(screen.getByRole("heading", { level: 1, name: /find your perfect drive/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Welcome back" })).not.toBeInTheDocument();
  });

  it.each([["/no/such/page"], ["/vehicles/123"]])("sends %s to the home page", (path) => {
    renderApp(path, { stored: storedSession() });

    expect(screen.getByRole("heading", { name: "Available inventory" })).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
  });
});

describe("the vehicle list", () => {
  it("says it is loading, then shows the vehicles", async () => {
    let finish!: (vehicles: Vehicle[]) => void;
    const api = fakeVehiclesApi();
    api.find.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    openDashboard(api);

    expect(screen.getByRole("status")).toHaveTextContent("Loading vehicles…");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();

    finish(sampleVehicles());

    expect(await screen.findAllByRole("article")).toHaveLength(3);
    expect(screen.queryByText("Loading vehicles…")).not.toBeInTheDocument();
  });

  it("shows each vehicle's make and model, category, price in the configured currency, and stock", async () => {
    openDashboard();

    const camry = await cardOf("Toyota Camry");
    expect(camry.getByRole("heading", { name: "Toyota Camry" })).toBeInTheDocument();
    expect(camry.getByText("Sedan")).toBeInTheDocument();
    expect(camry.getByText("$25,000.00")).toBeInTheDocument();
    expect(camry.getByText("5 in stock")).toBeInTheDocument();

    expect((await cardOf("Toyota RAV4")).getByText("$32,000.50")).toBeInTheDocument();
  });

  it("warns when stock is low and says plainly when a vehicle is sold out", async () => {
    openDashboard();

    expect((await cardOf("Toyota RAV4")).getByText("Only 2 left")).toBeInTheDocument();
    expect((await cardOf("Honda Civic")).getByText("Sold out")).toBeInTheDocument();
  });

  it("keeps the order the server gave", async () => {
    openDashboard();

    const names = (await screen.findAllByRole("article")).map((card) => within(card).getByRole("heading").textContent);

    expect(names).toEqual(["Toyota Camry", "Toyota RAV4", "Honda Civic"]);
  });

  it("counts the vehicles, in the singular too", async () => {
    const api = fakeVehiclesApi();
    api.find.mockResolvedValue([vehicle()]);
    openDashboard(api);

    expect(await screen.findByText("1 vehicle")).toBeInTheDocument();
  });

  it("tells a visitor when there is nothing to show yet", async () => {
    const api = fakeVehiclesApi();
    api.find.mockResolvedValue([]);
    openDashboard(api);

    expect(await screen.findByText("No vehicles available yet.")).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  describe("when loading fails", () => {
    it("explains in plain words and offers to try again, which works", async () => {
      const api = fakeVehiclesApi();
      api.find.mockRejectedValueOnce(new ApiError(0, "NETWORK_ERROR", "Could not reach the server. Check your connection and try again."));
      openDashboard(api);

      expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the server");
      expect(screen.queryByRole("article")).not.toBeInTheDocument();

      await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));

      expect(await screen.findAllByRole("article")).toHaveLength(3);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});

describe("buying a vehicle", () => {
  /** Presses Purchase on the card and confirms the order in the dialog that opens. */
  const buy = async (name: string) => {
    const card = await cardOf(name);
    const user = userEvent.setup();
    await user.click(card.getByRole("button", { name: `Purchase ${name}` }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm order" }));
    return card;
  };

  it("is possible for a vehicle in stock, and not for a sold-out one", async () => {
    openDashboard();

    expect((await cardOf("Toyota Camry")).getByRole("button", { name: "Purchase Toyota Camry" })).toBeEnabled();
    const soldOut = (await cardOf("Honda Civic")).getByRole("button", { name: "Purchase Honda Civic, out of stock" });
    expect(soldOut).toBeDisabled();
    expect(soldOut).toHaveTextContent("Out of stock"); // the visible words say so, and the name contains them
  });

  it("takes one unit and shows the new stock the server reports, with a confirmation", async () => {
    const { vehiclesApi } = openDashboard();

    const camry = await buy("Toyota Camry");

    expect(vehiclesApi.purchase).toHaveBeenCalledWith("v-camry");
    expect(await camry.findByText("4 in stock")).toBeInTheDocument();
    expect(await screen.findByText("Purchased Toyota Camry.")).toBeInTheDocument();
    expect((await cardOf("Toyota RAV4")).getByText("Only 2 left")).toBeInTheDocument(); // the others are untouched
  });

  it("can be done again straight after", async () => {
    const { vehiclesApi } = openDashboard();
    vehiclesApi.purchase.mockResolvedValueOnce(vehicle({ quantity: 4 })).mockResolvedValueOnce(vehicle({ quantity: 3 }));

    const camry = await buy("Toyota Camry");
    await camry.findByText("4 in stock");
    await buy("Toyota Camry");

    expect(await camry.findByText("Only 3 left")).toBeInTheDocument();
    expect(vehiclesApi.purchase).toHaveBeenCalledTimes(2);
  });

  it("sells the last unit, after which the vehicle shows as sold out and cannot be bought", async () => {
    const api = fakeVehiclesApi();
    api.find.mockResolvedValue([vehicle({ quantity: 1 })]);
    api.purchase.mockResolvedValue(vehicle({ quantity: 0 }));
    openDashboard(api);

    const camry = await buy("Toyota Camry");

    expect(await camry.findByText("Sold out")).toBeInTheDocument();
    expect(camry.getByRole("button", { name: /^Purchase Toyota Camry/ })).toBeDisabled();
  });

  it("shows that it is working on that vehicle only, and cannot be sent twice", async () => {
    const api = fakeVehiclesApi();
    let finish!: (v: Vehicle) => void;
    api.purchase.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    openDashboard(api);

    const camry = await buy("Toyota Camry");

    const busy = camry.getByRole("button", { name: "Purchase Toyota Camry" });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(busy).toHaveTextContent("Buying…");
    expect((await cardOf("Toyota RAV4")).getByRole("button", { name: "Purchase Toyota RAV4" })).toBeEnabled();

    await userEvent.setup().click(busy);
    expect(api.purchase).toHaveBeenCalledTimes(1);

    finish(vehicle({ quantity: 4 }));
    expect(await camry.findByText("4 in stock")).toBeInTheDocument();
  });

  describe("when it does not work out", () => {
    it("explains that someone else got there first, and refreshes to the stock that is really left", async () => {
      const api = fakeVehiclesApi();
      api.find.mockResolvedValueOnce(sampleVehicles()).mockResolvedValueOnce([vehicle({ quantity: 0 }), ...sampleVehicles().slice(1)]);
      api.purchase.mockRejectedValue(new ApiError(409, "INSUFFICIENT_STOCK", "Only 0 left in stock"));
      openDashboard(api);

      const camry = await buy("Toyota Camry");

      expect(await screen.findByText("Toyota Camry: Only 0 left in stock")).toBeInTheDocument();
      expect(await camry.findByText("Sold out")).toBeInTheDocument();
      expect(api.find).toHaveBeenCalledTimes(2);
    });

    it("explains that the vehicle is gone, and refreshes the list", async () => {
      const api = fakeVehiclesApi();
      api.find.mockResolvedValueOnce(sampleVehicles()).mockResolvedValueOnce(sampleVehicles().slice(1));
      api.purchase.mockRejectedValue(new ApiError(404, "VEHICLE_NOT_FOUND", "Vehicle not found"));
      openDashboard(api);

      await buy("Toyota Camry");

      expect(await screen.findByText("Toyota Camry: Vehicle not found")).toBeInTheDocument();
      expect(screen.queryByRole("article", { name: "Toyota Camry" })).not.toBeInTheDocument();
    });

    it("tells the person about a connection problem in the order dialog, which stays open for another try, and leaves the vehicle as it was", async () => {
      const api = fakeVehiclesApi();
      api.purchase.mockRejectedValue(new ApiError(0, "NETWORK_ERROR", "Could not reach the server. Check your connection and try again."));
      openDashboard(api);

      const camry = await buy("Toyota Camry");

      expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent("Could not reach the server");
      expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm order" })).toBeEnabled();
      expect(camry.getByText("5 in stock")).toBeInTheDocument();
      expect(camry.getByRole("button", { name: "Purchase Toyota Camry" })).toBeEnabled();
      expect(api.find).toHaveBeenCalledTimes(1); // nothing to refresh: the stock did not change
    });

    it("never shows a raw error", async () => {
      const api = fakeVehiclesApi();
      api.purchase.mockRejectedValue(new TypeError("Cannot read properties of undefined"));
      openDashboard(api);

      await buy("Toyota Camry");

      expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent("Something went wrong. Please try again.");
      expect(screen.queryByText(/Cannot read properties/)).not.toBeInTheDocument();
    });
  });
});
