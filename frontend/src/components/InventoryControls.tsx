import { ChevronDown } from "lucide-react";
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

// The design's quick pills: the chosen one is solid cyan, the others sit on a card with a hairline border.
const pillClasses = (active: boolean) =>
  "inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container " +
  (active
    ? "bg-primary-container text-on-primary-container"
    : "border border-white/8 bg-surface-container text-slate-300 hover:text-white");

const countClasses = (active: boolean) =>
  `rounded-full px-1.5 py-0.5 text-[10px] leading-none font-bold ${active ? "bg-background/15" : "bg-white/8"}`;

/** Category pills with counts, an "In stock only" switch and a sort menu: a view over the vehicles already loaded. */
export function InventoryControls({ tabs, total, view, onChange }: InventoryControlsProps) {
  const set = (changes: Partial<InventoryView>) => onChange({ ...view, ...changes });

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
      {/* Scrolls sideways when the pills outgrow the row; the scrollbar itself is hidden, the pills are still reachable by touch, trackpad and Tab. */}
      <div
        role="group"
        aria-label="Filter by category"
        className="-mx-1 flex min-w-0 items-center gap-1.5 overflow-x-auto px-1 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button type="button" aria-pressed={view.category === null} onClick={() => set({ category: null })} className={pillClasses(view.category === null)}>
          <span>All inventory</span>{" "}
          <span className={countClasses(view.category === null)}>{total}</span>
        </button>
        {tabs.map((tab) => {
          const active = view.category === tab.key;
          return (
            <button key={tab.key} type="button" aria-pressed={active} onClick={() => set({ category: tab.key })} className={pillClasses(active)}>
              <span>{tab.label}</span>{" "}
              <span className={countClasses(active)}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-5 lg:justify-end">
        <label className="flex cursor-pointer items-center gap-2.5 text-xs whitespace-nowrap text-slate-300 select-none">
          <span>In-stock only</span>
          <input
            type="checkbox"
            role="switch"
            checked={view.inStockOnly}
            onChange={(event) => set({ inStockOnly: event.target.checked })}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="relative h-5 w-9 rounded-full bg-slate-700 transition-colors peer-checked:bg-primary-container peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-container after:absolute after:top-[3px] after:left-[3px] after:size-3.5 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:after:translate-x-4 motion-reduce:after:transition-none"
          />
        </label>

        <div className="relative">
          <select
            aria-label="Sort by"
            value={view.sort}
            onChange={(event) => set({ sort: event.target.value as SortKey })}
            className="h-10 cursor-pointer appearance-none rounded-lg border border-white/8 bg-surface-container py-0 pr-9 pl-3 text-xs font-medium text-slate-200 focus:border-primary-container focus:outline-none focus-visible:outline-2 focus-visible:outline-primary-container"
          >
            {SORT_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-outline" />
        </div>
      </div>
    </div>
  );
}
