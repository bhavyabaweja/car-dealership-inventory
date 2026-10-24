import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { emptyFilters } from "../lib/filters";
import { SearchFilters } from "./SearchFilters";

// Euro, not dollars: the price labels must follow the configuration.
vi.mock("../config", () => ({ config: { currency: "EUR", locale: "de-DE", apiBaseUrl: "" } }));

function setup(props: Partial<React.ComponentProps<typeof SearchFilters>> = {}) {
  const onChange = vi.fn();
  const onClear = vi.fn();
  render(<SearchFilters values={emptyFilters} errors={{}} activeCount={0} onChange={onChange} onClear={onClear} {...props} />);
  return { onChange, onClear };
}

describe("SearchFilters", () => {
  it("has a labelled field for every filter, naming the configured currency on the prices", () => {
    setup();

    for (const label of ["Make", "Model", "Category", "Min price (EUR)", "Max price (EUR)"]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.queryByLabelText(/USD/)).not.toBeInTheDocument();
  });

  it("brings up a numeric keypad for prices and keeps the browser from suggesting old entries", () => {
    setup();

    expect(screen.getByLabelText("Min price (EUR)")).toHaveAttribute("inputmode", "decimal");
    expect(screen.getByLabelText("Max price (EUR)")).toHaveAttribute("inputmode", "decimal");
    expect(screen.getByLabelText("Make")).toHaveAttribute("autocomplete", "off");
  });

  it("shows the values it is given", () => {
    setup({ values: { ...emptyFilters, make: "Toyota", maxPrice: "30000" } });

    expect(screen.getByLabelText("Make")).toHaveValue("Toyota");
    expect(screen.getByLabelText("Max price (EUR)")).toHaveValue("30000");
  });

  it("reports which field changed and what it now says", async () => {
    const { onChange } = setup();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Category"), "s");
    await user.type(screen.getByLabelText("Min price (EUR)"), "5");

    expect(onChange).toHaveBeenCalledWith("category", "s");
    expect(onChange).toHaveBeenCalledWith("minPrice", "5");
  });

  it("explains a price problem beside its field, linked for screen readers", () => {
    setup({ errors: { maxPrice: "The maximum can't be lower than the minimum." } });

    const field = screen.getByLabelText("Max price (EUR)");
    expect(field).toBeInvalid();
    expect(document.getElementById(field.getAttribute("aria-describedby")!)).toHaveTextContent("The maximum can't be lower than the minimum.");
    expect(screen.getByLabelText("Min price (EUR)")).toBeValid();
  });

  describe("clearing", () => {
    it("offers to clear the filters only when there are some, and does so", async () => {
      const first = render(<SearchFilters values={emptyFilters} errors={{}} activeCount={0} onChange={() => {}} onClear={() => {}} />);
      expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
      first.unmount();

      const { onClear } = setup({ activeCount: 2 });
      await userEvent.setup().click(screen.getByRole("button", { name: "Clear filters" }));

      expect(onClear).toHaveBeenCalledOnce();
    });
  });

  describe("the Filters button, for small screens where the extra fields fold away", () => {
    it("opens and closes the extra fields, and says which state it is in", async () => {
      setup();
      const toggle = screen.getByRole("button", { name: /^Filters/ });
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      const panel = document.getElementById(toggle.getAttribute("aria-controls")!)!;
      expect(within(panel).getByLabelText("Category")).toBeInTheDocument();
      expect(within(panel).getByLabelText("Max price (EUR)")).toBeInTheDocument();

      await userEvent.setup().click(toggle);

      expect(toggle).toHaveAttribute("aria-expanded", "true");
    });

    it("shows how many filters are in use, so a closed panel does not hide that a search is narrowed", () => {
      setup({ activeCount: 3 });

      expect(within(screen.getByRole("button", { name: /^Filters/ })).getByText("3")).toBeInTheDocument();
    });

    it("shows no count when nothing is filtered", () => {
      setup({ activeCount: 0 });

      expect(screen.getByRole("button", { name: /^Filters/ })).toHaveTextContent(/^Filters$/);
    });
  });
});
