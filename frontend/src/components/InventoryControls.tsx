import type { CategoryTab, InventoryView, SortKey } from "../lib/inventoryView";

const SORT_OPTIONS: ReadonlyArray<[SortKey, string]> = [
  ["default", "Default order"],
  ["price-asc", "Price: low to high"],
  ["price-desc", "Price: high to low"],
  ["name", "Name (A to Z)"],
];

interface InventoryControlsProps {
  tabs: CategoryTab[];
  /** How many vehicles the tabs together cover (the "All" tab's count). */
  total: number;
  view: InventoryView;
  onChange: (view: InventoryView) => void;
}

const tabClasses = (active: boolean) =>
  "inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container " +
  (active
    ? "bg-secondary-container/25 text-primary-container shadow-sm"
    : "bg-surface-container text-on-surface-variant hover:text-on-surface");

const countClasses = (active: boolean) =>
  `rounded-full px-1.5 py-0.5 text-[11px] leading-none ${active ? "bg-primary-container/20" : "bg-surface-container-high"}`;

/** Category tabs with counts, an "In stock only" switch and a sort menu: a view over the vehicles already loaded. */
export function InventoryControls({ tabs, total, view, onChange }: InventoryControlsProps) {
  const set = (changes: Partial<InventoryView>) => onChange({ ...view, ...changes });

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
      {/* Scrolls sideways when the tabs outgrow the row; the scrollbar itself is hidden, the tabs are still reachable by touch, trackpad and Tab. */}
      <div
        role="group"
        aria-label="Browse by category"
        className="-mx-1 flex min-w-0 items-center gap-2 overflow-x-auto px-1 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button type="button" aria-pressed={view.category === null} onClick={() => set({ category: null })} className={tabClasses(view.category === null)}>
          <span>All inventory</span>{" "}
          <span className={countClasses(view.category === null)}>{total}</span>
        </button>
        {tabs.map((tab) => {
          const active = view.category === tab.key;
          return (
            <button key={tab.key} type="button" aria-pressed={active} onClick={() => set({ category: tab.key })} className={tabClasses(active)}>
              <span>{tab.label}</span>{" "}
              <span className={countClasses(active)}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-5 lg:justify-end">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm whitespace-nowrap text-on-surface-variant select-none">
          <span>In stock only</span>
          <input
            type="checkbox"
            role="switch"
            checked={view.inStockOnly}
            onChange={(event) => set({ inStockOnly: event.target.checked })}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="relative h-6 w-11 rounded-full bg-surface-container-highest transition-colors peer-checked:bg-primary-container peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-container after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:content-[''] peer-checked:after:translate-x-5 motion-reduce:after:transition-none"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-on-surface-variant">
          <span className="hidden sm:inline">Sort by</span>
          <select
            aria-label="Sort by"
            value={view.sort}
            onChange={(event) => set({ sort: event.target.value as SortKey })}
            className="h-10 rounded-lg bg-surface-container-low px-3 text-sm font-semibold text-on-surface ring-1 ring-white/10 focus:outline-2 focus:outline-primary-container"
          >
            {SORT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
