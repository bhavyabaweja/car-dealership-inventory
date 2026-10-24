import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { vehicle } from "../test/helpers";
import { VehicleCard } from "./VehicleCard";

// A different currency and locale from the dashboard tests: the card must follow the configuration.
vi.mock("../config", () => ({ config: { currency: "EUR", locale: "de-DE", apiBaseUrl: "" } }));

describe("VehicleCard", () => {
  it("shows the price in the configured currency, not in dollars", () => {
    render(<VehicleCard vehicle={vehicle({ price: "25000.00" })} onPurchase={() => {}} purchasing={false} />);

    expect(screen.getByText(/25\.000,00\s€/)).toBeInTheDocument();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
  });
});
