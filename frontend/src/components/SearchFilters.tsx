import { SlidersHorizontal } from "lucide-react";
import { useId, useState } from "react";
import { config } from "../config";
import type { FilterErrors, FilterInputs } from "../lib/filters";
import { Button } from "./Button";
import { TextField } from "./TextField";

interface SearchFiltersProps {
  values: FilterInputs;
  errors: FilterErrors;
  /** How many filters have something typed in them. */
  activeCount: number;
  onChange: (field: keyof FilterInputs, value: string) => void;
  onClear: () => void;
}

/**
 * The search form. Make and model are always in view. Category and the prices fold away on phones,
 * behind a Filters button that shows how many filters are in use, and sit in the grid from tablet width up.
 */
export function SearchFilters({ values, errors, activeCount, onChange, onClear }: SearchFiltersProps) {
  // A link or a reload can bring back a filter in the folded part; start open so what is applied is visible.
  const [open, setOpen] = useState(() => [values.category, values.minPrice, values.maxPrice].some((text) => text.trim() !== ""));
  const extraFieldsId = useId();
  const field = (name: keyof FilterInputs) => ({
    value: values[name],
    onChange: (event: { target: { value: string } }) => onChange(name, event.target.value),
    autoComplete: "off",
  });
  const priceField = (name: "minPrice" | "maxPrice") => ({ ...field(name), inputMode: "decimal" as const, error: errors[name] });

  return (
    <section aria-label="Search and filters" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <TextField label="Make" {...field("make")} />
        <TextField label="Model" {...field("model")} />
        {/* "contents" lets these join the grid above on wider screens; on a phone they fold away. */}
        <div id={extraFieldsId} className={`${open ? "grid gap-3" : "hidden"} sm:contents`}>
          <TextField label="Category" {...field("category")} />
          <TextField label={`Min price (${config.currency})`} {...priceField("minPrice")} />
          <TextField label={`Max price (${config.currency})`} {...priceField("maxPrice")} />
        </div>
      </div>

      {/* On a phone this row always exists, for the Filters button; from tablet width up it appears only to offer Clear. */}
      <div className={`mt-3 flex items-center gap-2 ${activeCount === 0 ? "sm:hidden" : ""}`}>
        <Button
          variant="secondary"
          size="sm"
          className="sm:hidden"
          aria-expanded={open}
          aria-controls={extraFieldsId}
          onClick={() => setOpen((current) => !current)}
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-indigo-600 px-1.5 text-xs leading-5 font-semibold text-white">{activeCount}</span>
          )}
        </Button>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        )}
      </div>
    </section>
  );
}
