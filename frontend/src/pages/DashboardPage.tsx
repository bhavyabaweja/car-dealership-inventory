import { CloudOff, Plus, RefreshCw, SearchX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useVehiclesApi } from "../api/ApiProvider";
import { ApiError } from "../api/client";
import type { Vehicle } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { AppHeader } from "../components/AppHeader";
import { Button } from "../components/Button";
import { CategoryCards } from "../components/CategoryCards";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { FeaturesStrip, FinalCta } from "../components/FeaturesStrip";
import { HeroSection } from "../components/HeroSection";
import { InventoryControls } from "../components/InventoryControls";
import { PurchaseDialog } from "../components/PurchaseDialog";
import { RestockDialog } from "../components/RestockDialog";
import { SearchFilters } from "../components/SearchFilters";
import { SiteFooter } from "../components/SiteFooter";
import { useToast } from "../components/Toasts";
import { VehicleCard, VehicleCardSkeleton } from "../components/VehicleCard";
import { VehicleFormDialog } from "../components/VehicleFormDialog";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useVehicles } from "../hooks/useVehicles";
import { messageFor } from "../lib/errors";
import { applyView, categoryTabs, defaultView, type InventoryView } from "../lib/inventoryView";
import { countActive, emptyFilters, type FilterInputs, filtersFromParams, paramsFromFilters, toFilters } from "../lib/filters";

/** Failures after which the list on screen is out of date and worth refreshing. */
const STALE_LIST_CODES = new Set(["INSUFFICIENT_STOCK", "VEHICLE_NOT_FOUND"]);

/** How long typing must pause before the search is made. */
const SEARCH_PAUSE_MS = 300;

// Four across only where there is room for an administrator's three buttons on a card (see VehicleCard).
// The design's grid: one column, two from tablet width, three from laptop width.
const grid = "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3";

/** The loading-failed, no-results and nothing-here-yet panels share one look. */
const statePanel = "flex flex-col items-center justify-center rounded-2xl border border-white/7 bg-surface-container px-4 py-20 text-center";

/** The dialog that is open, if any, with the vehicle it is about. */
type Panel =
  | { kind: "add" }
  | { kind: "edit"; vehicle: Vehicle }
  | { kind: "restock"; vehicle: Vehicle }
  | { kind: "delete"; vehicle: Vehicle }
  | { kind: "purchase"; vehicle: Vehicle };

const nameOf = (vehicle: Vehicle) => `${vehicle.make} ${vehicle.model}`;

export function DashboardPage() {
  useDocumentTitle("Vehicles");
  const api = useVehiclesApi();
  const toast = useToast();
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const [purchasing, setPurchasing] = useState<ReadonlySet<string>>(new Set());
  const [panel, setPanel] = useState<Panel | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const [purchaseError, setPurchaseError] = useState<string>();

  // What is typed, as typed. The search follows it once typing pauses, and the address bar follows the search.
  const [inputs, setInputs] = useState<FilterInputs>(() => filtersFromParams(params));
  const settled = useDebouncedValue(inputs, SEARCH_PAUSE_MS);
  const { filters, errors } = useMemo(() => toFilters(settled), [settled]);
  const { status, vehicles, error, isFetching, reload, replace, remove } = useVehicles(filters);

  useEffect(() => {
    const next = paramsFromFilters(settled);
    // replace: filter-by-filter edits would otherwise fill the Back button with near-identical pages.
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [settled]); // eslint-disable-line react-hooks/exhaustive-deps -- only a settled search writes to the address

  const searching = countActive(settled) > 0;
  const clearFilters = () => setInputs(emptyFilters);

  // A view over what the search returned. A chosen category that is no longer there (its last vehicle was
  // deleted, or a new search has none of it) quietly means "all", so the list never looks mysteriously empty.
  const [view, setView] = useState<InventoryView>(defaultView);
  const tabs = useMemo(() => categoryTabs(vehicles, view.inStockOnly), [vehicles, view.inStockOnly]);
  const category = tabs.some((tab) => tab.key === view.category) ? view.category : null;
  const visible = useMemo(() => applyView(vehicles, { ...view, category }), [vehicles, view, category]);

  // What is in stock per category, for the Browse by category cards and the footer's links.
  const available = useMemo(() => categoryTabs(vehicles, true), [vehicles]);
  const showCategories = status === "ready" && available.length > 0;
  const suggestions = useMemo(
    () => ({ makes: [...new Set(vehicles.map((vehicle) => vehicle.make.trim()))].sort((a, b) => a.localeCompare(b)), categories: available.map((tab) => tab.label) }),
    [vehicles, available],
  );

  /** Takes the person to the results: the heading of the inventory, where the cursor goes, brought into view. */
  function showInventory() {
    document.getElementById("inventory-title")?.focus({ preventScroll: true });
    const reduceMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("inventory")?.scrollIntoView?.({ behavior: reduceMotion ? "auto" : "smooth" });
  }

  /** Chooses a category from a card or a footer link. Choosing the chosen card again goes back to everything. */
  function chooseCategory(key: string, { toggle }: { toggle: boolean }) {
    setView((current) => ({ ...current, category: toggle && current.category === key ? null : key }));
    showInventory();
  }

  function setBusy(id: string, busy: boolean) {
    setPurchasing((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  /** Purchase on a card opens the order summary; nothing is bought until it is confirmed there. */
  function startPurchase(vehicle: Vehicle) {
    if (vehicle.quantity === 0) return;
    setPurchaseError(undefined);
    setPanel({ kind: "purchase", vehicle });
  }

  async function confirmPurchase(vehicle: Vehicle) {
    if (purchasing.has(vehicle.id)) return;

    const name = nameOf(vehicle);
    setPurchaseError(undefined);
    setBusy(vehicle.id, true);
    try {
      // The server answers with the vehicle as it now is, so the card shows the real stock, not a guess.
      replace(await api.purchase(vehicle.id));
      closePanel();
      toast.success(`Purchased ${name}.`);
    } catch (failure) {
      if (failure instanceof ApiError && STALE_LIST_CODES.has(failure.code)) {
        // Someone else bought it first, or it was removed: what is on screen is stale, so say so and refresh it.
        closePanel();
        toast.error(`${name}: ${messageFor(failure)}`);
        reload();
      } else {
        setPurchaseError(messageFor(failure)); // in the dialog, where the person is looking, ready for another try
      }
    } finally {
      setBusy(vehicle.id, false);
    }
  }

  function closePanel() {
    setPanel(null);
    setDeleteError(undefined);
    setPurchaseError(undefined);
  }

  /**
   * The vehicle was removed while a dialog about it was open: say so and show what is really there.
   * It leaves the screen together with the dialog, so focus can move on to the page heading in the same step.
   */
  function vehicleGone(vehicle: Vehicle) {
    closePanel();
    remove(vehicle.id);
    toast.error(`${nameOf(vehicle)}: Vehicle not found`);
    reload();
  }

  async function confirmDelete(vehicle: Vehicle) {
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await api.remove(vehicle.id);
      // The server has confirmed, so the list needs no second trip to know the vehicle is gone.
      closePanel();
      remove(vehicle.id);
      toast.success(`Deleted ${nameOf(vehicle)}.`);
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === "VEHICLE_NOT_FOUND") {
        // Someone else already deleted it, which is what was wanted anyway.
        closePanel();
        remove(vehicle.id);
        toast.success(`${nameOf(vehicle)} was already removed.`);
        reload();
      } else {
        setDeleteError(messageFor(failure));
      }
    } finally {
      setDeleting(false);
    }
  }

  const adminActions = isAdmin
    ? {
        onEdit: (vehicle: Vehicle) => setPanel({ kind: "edit", vehicle }),
        onRestock: (vehicle: Vehicle) => setPanel({ kind: "restock", vehicle }),
        onDelete: (vehicle: Vehicle) => setPanel({ kind: "delete", vehicle }),
      }
    : undefined;

  return (
    <div id="top">
      <AppHeader hasCategories={showCategories} />
      <main>
        <HeroSection hasCategories={showCategories} />

        {/* The search console floats over the foot of the hero, as in the design. */}
        <section aria-label="Search" className="relative z-20 mx-auto -mt-14 max-w-7xl px-4 md:px-8">
          <SearchFilters
            values={inputs}
            errors={errors}
            activeCount={countActive(inputs)}
            onChange={(field, value) => setInputs((current) => ({ ...current, [field]: value }))}
            onClear={clearFilters}
            onSearch={showInventory}
            suggestions={suggestions}
          />
        </section>

        {showCategories && (
          <CategoryCards categories={available} chosen={category} onChoose={(key) => chooseCategory(key, { toggle: true })} />
        )}

        <section id="inventory" aria-labelledby="inventory-title" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-12 md:px-8">
          <div className="mb-6 flex flex-col gap-4 border-b border-white/8 pb-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                {/* Where focus lands when a dialog's own opener is gone (see Dialog). */}
                <h2
                  id="inventory-title"
                  tabIndex={-1}
                  data-focus-fallback
                  className="font-display text-2xl font-bold text-white focus:outline-none sm:text-3xl"
                >
                  Available inventory
                </h2>
                <p aria-live="polite" className="mt-1 min-h-5 text-sm text-outline">
                  {status === "ready" && visible.length > 0 && (
                    <>
                      Showing <span>{`${visible.length} ${visible.length === 1 ? "vehicle" : "vehicles"}`}</span>
                    </>
                  )}
                </p>
              </div>
              {isAdmin && (
                <Button onClick={() => setPanel({ kind: "add" })}>
                  <Plus className="size-4" aria-hidden="true" />
                  Add vehicle
                </Button>
              )}
            </div>

            {status === "ready" && vehicles.length > 0 && (
              <InventoryControls tabs={tabs} total={tabs.reduce((sum, tab) => sum + tab.count, 0)} view={{ ...view, category }} onChange={setView} />
            )}
          </div>

          {status === "loading" && (
            <div role="status">
              <span className="sr-only">Loading vehicles…</span>
              <div className={grid}>
                {[0, 1, 2, 3, 4, 5].map((slot) => (
                  <VehicleCardSkeleton key={slot} />
                ))}
              </div>
            </div>
          )}

          {status === "error" && (
            <div role="alert" className={`${statePanel} border-rose-500/20`}>
              <span className="mb-4 grid size-16 place-items-center rounded-2xl border border-rose-500/30 bg-rose-950/40 text-rose-400">
                <CloudOff className="size-8" aria-hidden="true" />
              </span>
              <p className="mb-2 font-display text-2xl font-bold text-white">We couldn't load the vehicles</p>
              <p className="mb-6 max-w-md text-sm text-outline">{error}</p>
              <Button onClick={reload} className="bg-secondary-container! text-white! hover:bg-blue-600!">
                <RefreshCw className="size-[18px]" aria-hidden="true" />
                Try again
              </Button>
            </div>
          )}

          {status === "ready" && vehicles.length === 0 && (
            <div className={statePanel}>
              <span className="mb-4 grid size-16 place-items-center rounded-2xl border border-white/8 bg-surface-container-high text-primary-container">
                <SearchX className="size-8" aria-hidden="true" />
              </span>
              {searching ? (
                <>
                  <p className="mb-2 font-display text-2xl font-bold text-white">No vehicles match your search.</p>
                  <p className="mb-6 max-w-md text-sm text-outline">Try different words or a wider price range, or clear what you have searched for.</p>
                  <Button onClick={clearFilters}>Show all vehicles</Button>
                </>
              ) : (
                <>
                  <p className="mb-2 font-display text-2xl font-bold text-white">No vehicles available yet.</p>
                  <p className="max-w-md text-sm text-outline">Check back soon.</p>
                </>
              )}
            </div>
          )}

          {status === "ready" && vehicles.length > 0 && visible.length === 0 && (
            <div className={statePanel}>
              <span className="mb-4 grid size-16 place-items-center rounded-2xl border border-white/8 bg-surface-container-high text-primary-container">
                <SearchX className="size-8" aria-hidden="true" />
              </span>
              <p className="mb-2 font-display text-2xl font-bold text-white">No vehicles in this view.</p>
              <p className="mb-6 max-w-md text-sm text-outline">Try another category, or turn off "In-stock only".</p>
              <Button onClick={() => setView(defaultView)}>Show everything</Button>
            </div>
          )}

          {status === "ready" && visible.length > 0 && (
            <ul aria-labelledby="inventory-title" className={`${grid} transition-opacity ${isFetching ? "opacity-60" : ""}`} aria-busy={isFetching}>
              {visible.map((vehicle) => (
                <li key={vehicle.id}>
                  {/* An administrator's dashboard is for managing the inventory, so it offers no purchase. */}
                  <VehicleCard
                    vehicle={vehicle}
                    onPurchase={isAdmin ? undefined : startPurchase}
                    purchasing={purchasing.has(vehicle.id)}
                    admin={adminActions}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <FeaturesStrip />
        <FinalCta />
      </main>
      <SiteFooter hasCategories={showCategories} categories={available} onChooseCategory={(key) => chooseCategory(key, { toggle: false })} />

      {/* Each dialog exists only while open, so it always starts fresh. */}
      {panel?.kind === "add" && (
        <VehicleFormDialog
          onClose={closePanel}
          onGone={closePanel}
          onSaved={(added) => {
            closePanel();
            toast.success(`Added ${nameOf(added)}.`);
            reload(); // a new vehicle belongs somewhere in the order the server decides
          }}
        />
      )}
      {panel?.kind === "edit" && (
        <VehicleFormDialog
          vehicle={panel.vehicle}
          onClose={closePanel}
          onGone={() => vehicleGone(panel.vehicle)}
          onSaved={(saved) => {
            replace(saved);
            closePanel();
            toast.success(`Updated ${nameOf(saved)}.`);
          }}
        />
      )}
      {panel?.kind === "restock" && (
        <RestockDialog
          vehicle={panel.vehicle}
          onClose={closePanel}
          onGone={() => vehicleGone(panel.vehicle)}
          onRestocked={(restocked) => {
            replace(restocked);
            closePanel();
            toast.success(`Restocked ${nameOf(restocked)}: ${restocked.quantity} in stock.`);
          }}
        />
      )}
      {panel?.kind === "purchase" && (
        <PurchaseDialog
          vehicle={panel.vehicle}
          busy={purchasing.has(panel.vehicle.id)}
          error={purchaseError}
          onConfirm={() => confirmPurchase(panel.vehicle)}
          onCancel={closePanel}
        />
      )}
      {panel?.kind === "delete" && (
        <ConfirmDialog
          title={`Delete ${nameOf(panel.vehicle)}?`}
          message="This removes it from the inventory for everyone. This can't be undone."
          confirmLabel="Delete vehicle"
          busyLabel="Deleting…"
          busy={deleting}
          error={deleteError}
          onConfirm={() => confirmDelete(panel.vehicle)}
          onCancel={closePanel}
        />
      )}
    </div>
  );
}
