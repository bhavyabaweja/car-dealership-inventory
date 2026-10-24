import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import type { Vehicle } from "../api/types";
import { fakeVehiclesApi, sampleVehicles, storedSession, vehicle } from "../test/helpers";
import { renderApp } from "../test/renderApp";

vi.mock("../config", () => ({ config: { currency: "USD", locale: "en-US", apiBaseUrl: "" } }));

// The updated design asks before it buys: Purchase opens a "Confirm purchase" summary, and only "Confirm order" places the order.

const user = () => userEvent.setup({ delay: null });
const openDashboard = (api = fakeVehiclesApi()) => ({ api, ...renderApp("/", { stored: storedSession("USER"), vehiclesApi: api }) });
const cardOf = async (name: string) => within(await screen.findByRole("article", { name }));
const dialog = () => within(screen.getByRole("dialog", { name: "Confirm purchase" }));
const pressEscape = () => fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
const openPurchase = async (name = "Toyota Camry") => {
  await user().click((await cardOf(name)).getByRole("button", { name: `Purchase ${name}` }));
};

describe("asking before buying", () => {
  it("opens a summary of the order instead of buying at once", async () => {
    const { api } = openDashboard();

    await openPurchase();

    expect(api.purchase).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Confirm purchase" })).toBeInTheDocument();
  });

  it("shows which vehicle, its code, how many are in stock and what it costs", async () => {
    openDashboard();

    await openPurchase();

    expect(dialog().getByText("Toyota Camry")).toBeInTheDocument();
    expect(dialog().getByText("V-CAMRY")).toBeInTheDocument(); // the vehicle's own id, shortened
    expect(dialog().getByText("5 in stock")).toBeInTheDocument();
    expect(dialog().getByText("$25,000.00")).toBeInTheDocument();
  });

  it("starts on Cancel, so a stray Enter cannot place an order", async () => {
    openDashboard();

    await openPurchase();

    expect(dialog().getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("does nothing on Cancel or Escape, and returns the cursor to the Purchase button it came from", async () => {
    const { api } = openDashboard();
    const purchase = (await cardOf("Toyota Camry")).getByRole("button", { name: "Purchase Toyota Camry" });

    await user().click(purchase);
    await user().click(dialog().getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(purchase).toHaveFocus();

    await user().click(purchase);
    pressEscape();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(api.purchase).not.toHaveBeenCalled();
    expect((await cardOf("Toyota Camry")).getByText("5 in stock")).toBeInTheDocument();
  });

  it("is not offered for a vehicle that is sold out", async () => {
    openDashboard();

    const sold = (await cardOf("Honda Civic")).getByRole("button", { name: /^Purchase Honda Civic/ });

    expect(sold).toBeDisabled();
    await user().click(sold);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("placing the order", () => {
  it("buys one unit of that vehicle through the existing endpoint, closes, shows the new stock and confirms", async () => {
    const { api } = openDashboard();
    await openPurchase();

    await user().click(dialog().getByRole("button", { name: "Confirm order" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(api.purchase).toHaveBeenCalledTimes(1);
    expect(api.purchase).toHaveBeenCalledWith("v-camry");
    expect((await cardOf("Toyota Camry")).getByText("4 in stock")).toBeInTheDocument();
    expect(await screen.findByText("Purchased Toyota Camry.")).toBeInTheDocument();
  });

  it("buys the vehicle that was chosen, not just the first in the list", async () => {
    const { api } = openDashboard();
    api.purchase.mockResolvedValue(vehicle({ id: "v-rav4", model: "RAV4", category: "SUV", price: "32000.50", quantity: 1 }));
    await openPurchase("Toyota RAV4");
    expect(dialog().getByText("Toyota RAV4")).toBeInTheDocument();

    await user().click(dialog().getByRole("button", { name: "Confirm order" }));

    await waitFor(() => expect(api.purchase).toHaveBeenCalledWith("v-rav4"));
    expect(api.purchase).toHaveBeenCalledTimes(1);
    expect((await cardOf("Toyota RAV4")).getByText("Only 1 left")).toBeInTheDocument();
    expect((await cardOf("Toyota Camry")).getByText("5 in stock")).toBeInTheDocument();
  });

  it("shows that it is working, cannot be sent twice and cannot be dismissed meanwhile", async () => {
    const { api } = openDashboard();
    let finish!: (v: Vehicle) => void;
    api.purchase.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    await openPurchase();

    await user().click(dialog().getByRole("button", { name: "Confirm order" }));

    const busy = await dialog().findByRole("button", { name: "Buying…" });
    expect(busy).toBeDisabled();
    expect(dialog().getByRole("button", { name: "Cancel" })).toBeDisabled();
    pressEscape();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(api.purchase).toHaveBeenCalledTimes(1);

    finish(vehicle({ quantity: 4 }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("closes the dialog and explains, then refreshes, when someone else got there first", async () => {
    const api = fakeVehiclesApi();
    api.find.mockResolvedValueOnce(sampleVehicles()).mockResolvedValueOnce([vehicle({ quantity: 0 }), ...sampleVehicles().slice(1)]);
    api.purchase.mockRejectedValue(new ApiError(409, "INSUFFICIENT_STOCK", "Only 0 left in stock"));
    openDashboard(api);
    await openPurchase();

    await user().click(dialog().getByRole("button", { name: "Confirm order" }));

    expect(await screen.findByText("Toyota Camry: Only 0 left in stock")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await (await cardOf("Toyota Camry")).findByText("Sold out")).toBeInTheDocument();
  });

  it("keeps the dialog open with the reason when the connection fails, and a second try can succeed", async () => {
    const api = fakeVehiclesApi();
    api.purchase.mockRejectedValueOnce(new ApiError(0, "NETWORK_ERROR", "Could not reach the server. Check your connection and try again."));
    openDashboard(api);
    await openPurchase();

    await user().click(dialog().getByRole("button", { name: "Confirm order" }));
    expect(await dialog().findByRole("alert")).toHaveTextContent("Could not reach the server");

    await user().click(dialog().getByRole("button", { name: "Confirm order" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(api.purchase).toHaveBeenCalledTimes(2);
    expect((await cardOf("Toyota Camry")).getByText("4 in stock")).toBeInTheDocument();
  });

  it("does not show the last attempt's error when the dialog is opened again", async () => {
    const api = fakeVehiclesApi();
    api.purchase.mockRejectedValueOnce(new ApiError(0, "NETWORK_ERROR", "Could not reach the server."));
    openDashboard(api);
    await openPurchase();
    await user().click(dialog().getByRole("button", { name: "Confirm order" }));
    await dialog().findByRole("alert");

    await user().click(dialog().getByRole("button", { name: "Cancel" }));
    await openPurchase();

    expect(dialog().queryByRole("alert")).not.toBeInTheDocument();
  });
});
