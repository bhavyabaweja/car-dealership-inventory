import { config } from "../config";

export interface MoneyFormat {
  currency: string;
  locale: string | undefined;
}

/** What the API sends for a price: plain digits with an optional fractional part, never a float. */
const PRICE = /^\d+(\.\d+)?$/;

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
