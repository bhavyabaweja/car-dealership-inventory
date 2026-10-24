import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useVehiclesApi } from "../api/ApiProvider";
import { ApiError } from "../api/client";
import type { Vehicle } from "../api/types";
import { AppHeader } from "../components/AppHeader";
import { Button } from "../components/Button";
import { SearchFilters } from "../components/SearchFilters";
import { useToast } from "../components/Toasts";
import { VehicleCard, VehicleCardSkeleton } from "../components/VehicleCard";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useVehicles } from "../hooks/useVehicles";
import { messageFor } from "../lib/errors";
import { countActive, emptyFilters, type FilterInputs, filtersFromParams, paramsFromFilters, toFilters } from "../lib/filters";

/** Failures after which the list on screen is out of date and worth refreshing. */
const STALE_LIST_CODES = new Set(["INSUFFICIENT_STOCK", "VEHICLE_NOT_FOUND"]);

/** How long typing must pause before the search is made. */
const SEARCH_PAUSE_MS = 300;

const grid = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

export function DashboardPage() {
  const api = useVehiclesApi();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [purchasing, setPurchasing] = useState<ReadonlySet<string>>(new Set());

  // What is typed, as typed. The search follows it once typing pauses, and the address bar follows the search.
  const [inputs, setInputs] = useState<FilterInputs>(() => filtersFromParams(params));
  const settled = useDebouncedValue(inputs, SEARCH_PAUSE_MS);
  const { filters, errors } = useMemo(() => toFilters(settled), [settled]);
  const { status, vehicles, error, isFetching, reload, replace } = useVehicles(filters);

  useEffect(() => {
    const next = paramsFromFilters(settled);
    // replace: filter-by-filter edits would otherwise fill the Back button with near-identical pages.
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [settled]); // eslint-disable-line react-hooks/exhaustive-deps -- only a settled search writes to the address

  const searching = countActive(settled) > 0;
  const clearFilters = () => setInputs(emptyFilters);

  function setBusy(id: string, busy: boolean) {
    setPurchasing((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function purchase(vehicle: Vehicle) {
    if (purchasing.has(vehicle.id)) return;

    const name = `${vehicle.make} ${vehicle.model}`;
    setBusy(vehicle.id, true);
    try {
      // The server answers with the vehicle as it now is, so the card shows the real stock, not a guess.
      replace(await api.purchase(vehicle.id));
      toast.success(`Purchased ${name}.`);
    } catch (failure) {
      toast.error(`${name}: ${messageFor(failure)}`);
      // Someone else bought it first, or it was removed: what is on screen is stale, so refresh it.
      if (failure instanceof ApiError && STALE_LIST_CODES.has(failure.code)) reload();
    } finally {
      setBusy(vehicle.id, false);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-[max(4rem,env(safe-area-inset-bottom))] sm:pt-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Vehicles</h1>

        <div className="mt-4">
          <SearchFilters
            values={inputs}
            errors={errors}
            activeCount={countActive(inputs)}
            onChange={(field, value) => setInputs((current) => ({ ...current, [field]: value }))}
            onClear={clearFilters}
          />
        </div>

        <p aria-live="polite" className="mt-4 min-h-5 text-sm text-slate-600">
          {status === "ready" && vehicles.length > 0 && `${vehicles.length} ${vehicles.length === 1 ? "vehicle" : "vehicles"}`}
        </p>

        <div className="mt-2">
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
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="font-semibold text-red-900">We couldn't load the vehicles</p>
              <p className="mt-1 text-sm text-red-800">{error}</p>
              <Button variant="secondary" className="mt-4" onClick={reload}>
                Try again
              </Button>
            </div>
          )}

          {status === "ready" && vehicles.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              {searching ? (
                <>
                  <p className="font-medium text-slate-900">No vehicles match your search.</p>
                  <p className="mt-1 text-sm text-slate-600">Try different words or a wider price range.</p>
                  <Button variant="secondary" className="mt-4" onClick={clearFilters}>
                    Show all vehicles
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-medium text-slate-900">No vehicles available yet.</p>
                  <p className="mt-1 text-sm text-slate-600">Check back soon.</p>
                </>
              )}
            </div>
          )}

          {status === "ready" && vehicles.length > 0 && (
            <ul className={`${grid} transition-opacity ${isFetching ? "opacity-60" : ""}`} aria-busy={isFetching}>
              {vehicles.map((vehicle) => (
                <li key={vehicle.id}>
                  <VehicleCard vehicle={vehicle} onPurchase={purchase} purchasing={purchasing.has(vehicle.id)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
