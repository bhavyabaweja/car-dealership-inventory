import { config } from "../config";

export interface MoneyFormat {
  currency: string;
  locale: string | undefined;
}

/** What the API sends for a price: plain digits with an optional fractional part, never a float. */
const PRICE = /^\d+(\.\d+)?$/;

/** The server's own rule for an amount a person may enter: up to eight whole digits, at most two decimals, no sign or exponent. */
const AMOUNT = /^(0|[1-9]\d{0,7})(\.\d{1,2})?$/;
export const AMOUNT_MESSAGE = "Enter an amount like 25000 or 25000.50.";

/** Whether `text` (already trimmed) is an amount the server would accept. */
export function isAmount(text: string): boolean {
  return AMOUNT.test(text);
}

// Building a formatter is far slower than using one, and a list shows many prices.
const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor({ currency, locale }: MoneyFormat): Intl.NumberFormat {
  const key = `${locale ?? ""}|${currency}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { style: "currency", currency });
    formatters.set(key, formatter);
  }
  return formatter;
}

/**
 * Formats an exact price string for display in the configured currency. The string goes to Intl
 * as it is, never through a float, so no cent can be lost. Anything that is not a price is
 * returned unchanged rather than shown as "NaN".
 */
export function formatPrice(amount: string, format: MoneyFormat = config): string {
  if (!PRICE.test(amount)) return amount;
  return formatterFor(format).format(amount as `${number}`);
}
