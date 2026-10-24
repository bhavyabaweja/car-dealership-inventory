import { Search, SlidersHorizontal } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { config } from "../../config";
import type { FilterErrors, FilterInputs } from "../../lib/filters";
import { Button } from "../Button";
import { TextField } from "../TextField";

interface LandingSearchProps {
  values: FilterInputs;
  errors: FilterErrors;
  /** How many filters have something typed in them. */
  activeCount: number;
  onChange: (field: keyof FilterInputs, value: string) => void;
  onClear: () => void;
  /** The form was submitted: a visitor has no inventory to search yet, so this asks them for an account. */
  onSearch: () => void;
}

const labelClasses = "text-[11px] font-semibold tracking-wider text-on-surface-variant uppercase";
// The console's fields sit on glass, so they take the card colour rather than the dialogs' darker well.
const fieldClasses = "bg-surface-container! h-[42px] text-sm";

/**
 * The search console of the landing page, as a form. Make and model are always in view. Category and the prices fold away
 * on phones, behind a Filters button that shows how many filters are in use, and sit in the grid from tablet width up.
 */
export function LandingSearch({ values, errors, activeCount, onChange, onClear, onSearch }: LandingSearchProps) {
  // A link can bring back a filter in the folded part; start open so what is typed is visible.
  const [open, setOpen] = useState(() => [values.category, values.minPrice, values.maxPrice].some((text) => text.trim() !== ""));
  const extraFieldsId = useId();
  const field = (name: keyof FilterInputs) => ({
    value: values[name],
    onChange: (event: { target: { value: string } }) => onChange(name, event.target.value),
    autoComplete: "off",
    labelClassName: labelClasses,
    className: fieldClasses,
  });
  const priceField = (name: "minPrice" | "maxPrice") => ({ ...field(name), inputMode: "decimal" as const, error: errors[name] });

  function handleSubmit(event: FormEvent) {
    event.preventDefault(); // the browser would reload the page
    onSearch();
  }

  return (
    <form
      role="search"
      aria-label="Search and filters"
      onSubmit={handleSubmit}
      className="rounded-2xl bg-surface-container/75 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)] ring-1 ring-white/8 backdrop-blur-xl md:p-6"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-start">
        <TextField label="Make" {...field("make")} />
        <TextField label="Model" placeholder="e.g. Camry, Model S" {...field("model")} />
        {/* "contents" lets these join the grid above on wider screens; on a phone they fold away. */}
        <div id={extraFieldsId} className={`${open ? "grid gap-3" : "hidden"} sm:contents`}>
          <TextField label="Category" {...field("category")} />
          <TextField label={`Min price (${config.currency})`} {...priceField("minPrice")} />
          <TextField label={`Max price (${config.currency})`} {...priceField("maxPrice")} />
        </div>
        <div className="flex flex-col justify-end lg:self-end">
          <Button type="submit" className="h-[42px] w-full bg-gradient-to-r from-secondary-container to-primary-container hover:brightness-110">
            <Search className="size-[18px]" aria-hidden="true" />
            Search vehicles
          </Button>
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
            <span className="rounded-full bg-primary-container px-1.5 text-xs leading-5 font-bold text-on-primary-container">{activeCount}</span>
          )}
        </Button>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        )}
      </div>
    </form>
  );
}
