import type { VehicleFilters } from "../api/types";

/** What is typed in the search form, exactly as typed: strings, possibly blank or wrong. */
export interface FilterInputs {
  make: string;
  model: string;
  category: string;
  minPrice: string;
  maxPrice: string;
}

export const emptyFilters: FilterInputs = { make: "", model: "", category: "", minPrice: "", maxPrice: "" };

const KEYS = Object.keys(emptyFilters) as (keyof FilterInputs)[];
const TEXT_KEYS = ["make", "model", "category"] as const;
const PRICE_KEYS = ["minPrice", "maxPrice"] as const;

/** The server's own rule for an amount: up to eight whole digits, at most two decimals, no sign or exponent. */
const AMOUNT = /^(0|[1-9]\d{0,7})(\.\d{1,2})?$/;
const AMOUNT_MESSAGE = "Enter an amount like 25000 or 25000.50.";
const RANGE_MESSAGE = "The maximum can't be lower than the minimum.";

export type FilterErrors = Partial<Record<(typeof PRICE_KEYS)[number], string>>;

/**
 * Turns the form into the filters to send, and the problems to show. Anything wrong is explained
 * beside its field and left out of the search, so the server never has to say no.
 */
export function toFilters(inputs: FilterInputs): { filters: VehicleFilters; errors: FilterErrors } {
  const filters: VehicleFilters = {};
  const errors: FilterErrors = {};

  for (const key of TEXT_KEYS) {
    const text = inputs[key].trim();
    if (text) filters[key] = text;
  }

  for (const key of PRICE_KEYS) {
    const text = inputs[key].trim();
    if (!text) continue;
    if (AMOUNT.test(text)) filters[key] = text;
    else errors[key] = AMOUNT_MESSAGE;
  }

  // Amounts, not text: as text "9000" is greater than "10000".
  if (filters.minPrice !== undefined && filters.maxPrice !== undefined && Number(filters.minPrice) > Number(filters.maxPrice)) {
    errors.maxPrice = RANGE_MESSAGE;
    delete filters.minPrice;
    delete filters.maxPrice;
  }

  return { filters, errors };
}

/** How many filters have something typed in them, wrong ones included. */
export function countActive(inputs: FilterInputs): number {
  return KEYS.filter((key) => inputs[key].trim() !== "").length;
}

/** The filters as address-bar parameters. A page without filters gets no parameters at all. */
export function paramsFromFilters(inputs: FilterInputs): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of KEYS) {
    const text = inputs[key].trim();
    if (text) params.set(key, text);
  }
  return params;
}

/** The filters from the address bar; anything else in it is ignored. */
export function filtersFromParams(params: URLSearchParams): FilterInputs {
  return Object.fromEntries(KEYS.map((key) => [key, params.get(key) ?? ""])) as unknown as FilterInputs;
}
