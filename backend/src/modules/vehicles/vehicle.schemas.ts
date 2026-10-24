import { z } from "zod";

const MAX_TEXT_LENGTH = 50;
/** Largest number of units in one stock operation, and the largest initial stock. */
const MAX_QUANTITY = 100_000;

const text = z
  .string()
  .trim()
  .min(1, "Required")
  .max(MAX_TEXT_LENGTH, `Must be at most ${MAX_TEXT_LENGTH} characters`);

// Money is validated and kept as a decimal string, never converted to a float.
// Up to 8 whole digits and 2 decimals fits the DECIMAL(10,2) column; extra decimals are
// refused instead of being rounded silently.
const MONEY_PATTERN = /^(0|[1-9]\d{0,7})(\.\d{1,2})?$/;
const MONEY_MESSAGE = "Must be an amount with at most 2 decimals, such as 25000.50";

function toTwoDecimals(amount: string): string {
  const [whole, fraction = ""] = amount.split(".");
  return `${whole}.${fraction.padEnd(2, "0")}`;
}

/** Clients may send an amount as text or as a number; both become the same exact string. */
const moneyAsText = z.union([z.string(), z.number()]).transform((value) => String(value).trim());

const price = moneyAsText
  .pipe(z.string().regex(MONEY_PATTERN, MONEY_MESSAGE))
  .refine((amount) => Number(amount) > 0, "Must be greater than zero")
  .transform(toTwoDecimals);

/** A price filter; blank, as an empty search form sends it, means "no limit". */
const priceFilter = moneyAsText
  .optional()
  .transform((amount) => amount ?? "")
  .pipe(z.union([z.literal(""), z.string().regex(MONEY_PATTERN, MONEY_MESSAGE)]))
  .transform((amount) => (amount === "" ? undefined : toTwoDecimals(amount)));

/** A text filter; blank means "no filter". */
const textFilter = z
  .string()
  .trim()
  .max(MAX_TEXT_LENGTH, `Must be at most ${MAX_TEXT_LENGTH} characters`)
  .optional()
  .transform((value) => value || undefined);

const wholeNumber = z.number().int("Must be a whole number");
const unitsToMove = wholeNumber.min(1, "Must be at least 1").max(MAX_QUANTITY, `Must be at most ${MAX_QUANTITY}`);

export const createVehicleSchema = z.object({
  make: text,
  model: text,
  category: text,
  price,
  quantity: wholeNumber.min(0, "Cannot be negative").max(MAX_QUANTITY, `Must be at most ${MAX_QUANTITY}`).default(0),
});

/**
 * Stock is not editable here: it changes only through purchase and restock, which are atomic.
 * A quantity is refused, not ignored, so a client never believes an edit that was half thrown away.
 */
export const updateVehicleSchema = z
  .object({
    make: text.optional(),
    model: text.optional(),
    category: text.optional(),
    price: price.optional(),
    quantity: z.never({ error: "Stock cannot be edited here; use POST /api/vehicles/:id/restock to add units" }).optional(),
  })
  .refine((changes) => Object.keys(changes).length > 0, {
    message: "Provide at least one of make, model, category or price",
  });

export const searchVehiclesSchema = z
  .object({
    make: textFilter,
    model: textFilter,
    category: textFilter,
    minPrice: priceFilter,
    maxPrice: priceFilter,
  })
  .refine(
    ({ minPrice, maxPrice }) => minPrice === undefined || maxPrice === undefined || Number(minPrice) <= Number(maxPrice),
    { path: ["minPrice"], message: "Cannot be greater than maxPrice" },
  );

export const purchaseSchema = z.object({ quantity: unitsToMove.default(1) });

export const restockSchema = z.object({ quantity: unitsToMove });
