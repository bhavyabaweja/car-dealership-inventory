import type { Vehicle, VehicleChanges } from "../api/types";
import { AMOUNT_MESSAGE, isAmount } from "./money";

// These mirror the server's rules so a person learns what is wrong before a round trip. The server still
// checks everything, and its own answer is shown if it ever disagrees.

/** What is typed in the add and edit form, exactly as typed. */
export interface VehicleFormValues {
  make: string;
  model: string;
  category: string;
  price: string;
  quantity: string;
}

export type VehicleFormErrors = Partial<Record<keyof VehicleFormValues, string>>;

/** The form as the server wants it. `quantity` is only there when the form has a stock field. */
export interface VehicleFormData {
  make: string;
  model: string;
  category: string;
  price: string;
  quantity?: number;
}

const MAX_TEXT_LENGTH = 50;
const MAX_QUANTITY = 100_000;
const WHOLE_NUMBER = /^\d+$/;

function textError(name: string, value: string): string | undefined {
  const text = value.trim();
  if (text === "") return `Enter the ${name}.`;
  if (text.length > MAX_TEXT_LENGTH) return `Use ${MAX_TEXT_LENGTH} characters or fewer.`;
  return undefined;
}

function priceError(value: string): string | undefined {
  const text = value.trim();
  if (text === "") return "Enter a price.";
  if (!isAmount(text)) return AMOUNT_MESSAGE;
  if (Number(text) <= 0) return "The price must be above zero.";
  return undefined;
}

/** A whole number from `min` to MAX_QUANTITY, or undefined if the text is not one. */
function wholeNumber(value: string, min: number): number | undefined {
  const text = value.trim();
  if (!WHOLE_NUMBER.test(text)) return undefined;
  const number = Number(text);
  return number >= min && number <= MAX_QUANTITY ? number : undefined;
}

/** Checks the whole form and reports every problem at once. `data` exists only when there are none. */
export function validateVehicleForm(
  values: VehicleFormValues,
  { withQuantity }: { withQuantity: boolean },
): { errors: VehicleFormErrors; data?: VehicleFormData } {
  const errors: VehicleFormErrors = {};
  const set = (field: keyof VehicleFormValues, message: string | undefined) => {
    if (message) errors[field] = message;
  };

  set("make", textError("make", values.make));
  set("model", textError("model", values.model));
  set("category", textError("category", values.category));
  set("price", priceError(values.price));

  const quantity = withQuantity ? wholeNumber(values.quantity, 0) : undefined;
  if (withQuantity && quantity === undefined) errors.quantity = `Enter a whole number from 0 to ${MAX_QUANTITY}.`;

  if (Object.keys(errors).length > 0) return { errors };
  return {
    errors,
    data: {
      make: values.make.trim(),
      model: values.model.trim(),
      category: values.category.trim(),
      price: values.price.trim(),
      ...(quantity !== undefined && { quantity }),
    },
  };
}

/** Units to add to the stock: a positive whole number, so a negative one cannot pose as a purchase. */
export function validateRestock(value: string): { quantity: number } | { error: string } {
  const quantity = wholeNumber(value, 1);
  return quantity === undefined ? { error: `Enter a whole number from 1 to ${MAX_QUANTITY}.` } : { quantity };
}

/** Only the fields that differ from the vehicle, so saving without a change can skip the request. */
export function changedFields(vehicle: Vehicle, data: Pick<VehicleFormData, "make" | "model" | "category" | "price">): VehicleChanges {
  const changes: VehicleChanges = {};
  for (const field of ["make", "model", "category"] as const) {
    if (data[field] !== vehicle[field]) changes[field] = data[field];
  }
  // 25000 and 25000.00 are the same price: the server keeps two decimals.
  if (Number(data.price) !== Number(vehicle.price)) changes.price = data.price;
  return changes;
}
