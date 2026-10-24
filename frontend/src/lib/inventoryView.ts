import type { Vehicle } from "../api/types";

/**
 * How the vehicles already on screen are narrowed and ordered. This is a view of the loaded results,
 * apart from the search, which asks the server.
 */
export type SortKey = "default" | "price-asc" | "price-desc" | "stock-desc";

export interface InventoryView {
  /** A category key (see categoryTabs), or null for all of them. */
  category: string | null;
  inStockOnly: boolean;
  sort: SortKey;
}

export const defaultView: InventoryView = { category: null, inStockOnly: false, sort: "default" };

export interface CategoryTab {
  /** What identifies the category: its name without case or surrounding spaces. */
  key: string;
  /** The name as first written, for showing. */
  label: string;
  count: number;
}

const keyOf = (category: string) => category.trim().toLowerCase();

/**
 * One tab per category, the biggest first and alphabetical among equals. Spellings that differ only in
 * case or spacing are one category. With `inStockOnly`, counts leave out what is sold out; a category that
 * then has none is still listed, so the tabs do not jump about when the switch is flipped.
 */
export function categoryTabs(vehicles: readonly Vehicle[], inStockOnly: boolean): CategoryTab[] {
  const groups = new Map<string, { label: string; total: number; inStock: number }>();
  for (const { category, quantity } of vehicles) {
    const key = keyOf(category);
    const group = groups.get(key) ?? { label: category.trim(), total: 0, inStock: 0 };
    group.total += 1;
    if (quantity > 0) group.inStock += 1;
    groups.set(key, group);
  }

  return [...groups]
    .sort(([, a], [, b]) => b.total - a.total || a.label.localeCompare(b.label))
    .map(([key, group]) => ({ key, label: group.label, count: inStockOnly ? group.inStock : group.total }));
}

/** The vehicles to show: narrowed, then sorted. A new list; the given one is left alone, and ties keep their order. */
export function applyView(vehicles: readonly Vehicle[], { category, inStockOnly, sort }: InventoryView): Vehicle[] {
  const kept = vehicles.filter(
    (vehicle) => (category === null || keyOf(vehicle.category) === category) && (!inStockOnly || vehicle.quantity > 0),
  );

  switch (sort) {
    case "price-asc":
      return kept.sort((a, b) => Number(a.price) - Number(b.price));
    case "price-desc":
      return kept.sort((a, b) => Number(b.price) - Number(a.price));
    case "stock-desc":
      return kept.sort((a, b) => b.quantity - a.quantity);
    default:
      return kept;
  }
}
