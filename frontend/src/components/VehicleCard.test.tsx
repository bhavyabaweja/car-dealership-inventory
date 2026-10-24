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

  describe("the Purchase button", () => {
    it("is there when the card is given a way to purchase", () => {
      const onPurchase = vi.fn();
      render(<VehicleCard vehicle={vehicle()} onPurchase={onPurchase} purchasing={false} />);

      expect(screen.getByRole("button", { name: /^Purchase / })).toBeEnabled();
    });

    it("follows what it is given, not who is looking: with both ways in hand the card shows both", () => {
      render(
        <VehicleCard
          vehicle={vehicle()}
          onPurchase={() => {}}
          purchasing={false}
          admin={{ onEdit: () => {}, onRestock: () => {}, onDelete: () => {} }}
        />,
      );

      expect(screen.getByRole("button", { name: /^Purchase / })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Edit / })).toBeInTheDocument();
    });

    it("is left out when the card is given no way to purchase, as for an administrator", () => {
      render(
        <VehicleCard
          vehicle={vehicle()}
          purchasing={false}
          admin={{ onEdit: () => {}, onRestock: () => {}, onDelete: () => {} }}
        />,
      );

      expect(screen.queryByRole("button", { name: /^Purchase / })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Edit / })).toBeInTheDocument(); // the management buttons are not affected
    });
  });
});
