import { Car, CarFront, Gem, Truck, Zap } from "lucide-react";
import type { CategoryTab } from "../lib/inventoryView";
import { type IllustrationKind, illustrationFor } from "../lib/vehicleIllustration";

const ICONS: Record<IllustrationKind, typeof Car> = { suv: CarFront, sedan: Car, hatchback: Car, truck: Truck, coupe: Gem, generic: Zap };

/** A line of the design's own wording for each kind of vehicle. They describe the kind, never the stock. */
const TAGLINES: Record<IllustrationKind, string> = {
  suv: "Commanding presence & dynamic capability",
  sedan: "Refined aerodynamics & executive poise",
  coupe: "Bespoke grand tourers & flagship motors",
  hatchback: "Nimble urban agility and modern form",
  truck: "Hard-working capability & carrying power",
  generic: "Every vehicle in this category",
};

interface CategoryCardsProps {
  /** One per category, with `count` meaning how many are in stock. */
  categories: CategoryTab[];
  chosen: string | null;
  onChoose: (key: string) => void;
}

/** The "Browse by Category" section: a card for each category the vehicles really have. */
export function CategoryCards({ categories, chosen, onChoose }: CategoryCardsProps) {
  return (
    <section id="categories" aria-labelledby="categories-title" className="mx-auto max-w-7xl scroll-mt-28 px-4 pt-24 pb-12 md:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wider text-primary-container uppercase">Shop by type</p>
          <h2 id="categories-title" className="font-display text-3xl font-bold text-white sm:text-4xl">
            Browse by category
          </h2>
        </div>
        <p className="max-w-xs text-xs text-outline md:text-right">Counts show the vehicles in stock right now.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((category, index) => {
          const kind = illustrationFor(category.label).kind;
          const Icon = ICONS[kind];
          const active = chosen === category.key;
          return (
            <button
              key={category.key}
              type="button"
              aria-pressed={active}
              aria-label={`${category.label} ${category.count} available`}
              onClick={() => onChoose(category.key)}
              className={
                "group flex min-w-0 cursor-pointer flex-col justify-between rounded-xl border p-5 text-left transition-all duration-200 " +
                "hover:-translate-y-0.5 hover:border-primary-container/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container " +
                "motion-reduce:transition-none motion-reduce:hover:translate-y-0 " +
                (active ? "border-primary-container/60 bg-surface-container-high" : "border-white/7 bg-surface-container") +
                (categories.length % 2 === 1 && index === categories.length - 1 ? " col-span-2 sm:col-span-1" : "")
              }
            >
              <span className="mb-4 flex items-center justify-between gap-2">
                <Icon className="size-6 text-outline transition-colors group-hover:text-primary-container" aria-hidden="true" />
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                  {category.count} available
                </span>
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display text-lg font-bold text-white transition-colors group-hover:text-primary-container">
                  {category.label}
                </span>
                <span className="mt-1 block text-xs text-outline">{TAGLINES[kind]}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
