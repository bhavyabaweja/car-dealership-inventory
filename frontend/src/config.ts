export const DEFAULT_CURRENCY = "USD";

export interface AppConfig {
  /** ISO 4217 code used to show prices. */
  currency: string;
  /** Locale for number formatting; undefined means the browser's own. */
  locale: string | undefined;
  /** Where the API lives, without a trailing slash; empty means the same origin (the dev proxy). */
  apiBaseUrl: string;
}

type Env = Partial<Record<"VITE_CURRENCY" | "VITE_LOCALE" | "VITE_API_URL", string>>;

/** An empty or blank value counts as unset, as an empty line in a .env file produces. */
function setting(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function readCurrency(value: string | undefined, warn: (message: string) => void): string {
  if (value === undefined) return DEFAULT_CURRENCY;
  const code = value.toUpperCase();
  if (Intl.supportedValuesOf("currency").includes(code)) return code;
  warn(`VITE_CURRENCY "${value}" is not a known ISO 4217 currency code; showing prices in ${DEFAULT_CURRENCY}.`);
  return DEFAULT_CURRENCY;
}

function readLocale(value: string | undefined, warn: (message: string) => void): string | undefined {
  if (value === undefined) return undefined;
  try {
    return Intl.getCanonicalLocales(value)[0];
  } catch {
    warn(`VITE_LOCALE "${value}" is not a valid locale; using the browser's locale.`);
    return undefined;
  }
}

/** A misconfigured value falls back to a safe default with a warning, so the app still starts. */
export function readConfig(env: Env, warn: (message: string) => void = console.warn): AppConfig {
  return {
    currency: readCurrency(setting(env.VITE_CURRENCY), warn),
    locale: readLocale(setting(env.VITE_LOCALE), warn),
    apiBaseUrl: (setting(env.VITE_API_URL) ?? "").replace(/\/+$/, ""),
  };
}

export const config = readConfig(import.meta.env);
