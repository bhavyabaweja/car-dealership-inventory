import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { VehicleFilters } from "../api/types";
import { fakeVehiclesApi, storedSession } from "../test/helpers";
import { renderApp } from "../test/renderApp";

vi.mock("../config", () => ({ config: { currency: "USD", locale: "en-US", apiBaseUrl: "" } }));

// Unlike DashboardSearch.test, nothing here replaces the wait: this is the real timing.
describe("searching while typing", () => {
  it("waits for a pause, then searches once for what was typed, instead of once per keystroke", async () => {
    const api = fakeVehiclesApi();
    renderApp("/", { stored: storedSession(), vehiclesApi: api });
    await screen.findAllByRole("article");

    await userEvent.setup().type(screen.getByLabelText("Make"), "toy");
    expect(api.find).toHaveBeenCalledTimes(1); // still only the first load: no search yet

    await waitFor(() => expect(api.find).toHaveBeenCalledTimes(2));
    expect(api.find.mock.calls.map((call) => call[0] as VehicleFilters)).toEqual([{}, { make: "toy" }]); // never "t" or "to"
  });
});
