import { useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Button } from "../components/Button";
import { LandingCta, LandingFeatures } from "../components/landing/LandingFeatures";
import { LandingFooter } from "../components/landing/LandingFooter";
import { LandingHeader } from "../components/landing/LandingHeader";
import { LandingHero } from "../components/landing/LandingHero";
import { LandingSearch } from "../components/landing/LandingSearch";
import { VehicleCard, VehicleCardSkeleton } from "../components/VehicleCard";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useVehicles } from "../hooks/useVehicles";
import { countActive, emptyFilters, type FilterInputs, filtersFromParams, paramsFromFilters, toFilters } from "../lib/filters";

/** How long typing must pause before the search is made. */
const SEARCH_PAUSE_MS = 300;

const grid = "grid gap-6 sm:grid-cols-2 lg:grid-cols-3";
const emptyPanel = "rounded-2xl border border-dashed border-white/15 bg-surface-container/60 p-10 text-center";
const textLink = "font-semibold text-primary-container hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container";

/**
 * What a visitor sees before logging in: the design's page. The API lets anyone browse the vehicles, so the page shows the
 * real inventory and searches it; an account is asked for only at the point of buying, and the search is kept through it.
 */
export function LandingPage() {
  useDocumentTitle("Find your perfect drive");
  const [params] = useSearchParams();
  const [inputs, setInputs] = useState<FilterInputs>(() => filtersFromParams(params));
  const heading = useRef<HTMLHeadingElement>(null);

  // What is typed, as typed. The search follows it once typing pauses.
  const settled = useDebouncedValue(inputs, SEARCH_PAUSE_MS);
  const { filters } = useMemo(() => toFilters(settled), [settled]);
  const { errors } = useMemo(() => toFilters(inputs), [inputs]);
  const { status, vehicles, error, isFetching, reload } = useVehicles(filters);

  // Where the visitor lands once signed in: the inventory, already searched. The address is how the dashboard is told.
  const query = paramsFromFilters(inputs).toString();
  const destination = query ? `/?${query}` : "/";
  const loginToBuy = { to: "/login", state: { from: destination } };
  const searching = countActive(settled) > 0;

  /** The results already follow what is typed, so searching means taking the person to them. */
  function search() {
    if (Object.keys(errors).length > 0) return; // the fields say what is wrong
    heading.current?.focus();
  }

  const clearFilters = () => setInputs(emptyFilters);

  return (
    <div id="top">
      <LandingHeader />
      <main>
        <LandingHero />

        <section aria-label="Search" className="relative z-20 mx-auto -mt-14 max-w-7xl px-4 md:px-8">
          <LandingSearch
            values={inputs}
            errors={errors}
            activeCount={countActive(inputs)}
            onChange={(field, value) => setInputs((current) => ({ ...current, [field]: value }))}
            onClear={clearFilters}
            onSearch={search}
          />
        </section>

        <section id="inventory" aria-labelledby="inventory-title" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-24 md:px-8">
          <div className="mb-6 border-b border-white/8 pb-6">
            <h2
              id="inventory-title"
              ref={heading}
              tabIndex={-1}
              className="font-display text-2xl font-bold text-white focus:outline-none sm:text-3xl"
            >
              Available inventory
            </h2>
            <p className="mt-2 text-sm text-outline">
              Browsing is open to everyone.{" "}
              <Link to="/login" state={{ from: destination }} className={textLink}>
                Log in
              </Link>{" "}
              or{" "}
              <Link to="/register" state={{ from: destination }} className={textLink}>
                Create an account
              </Link>{" "}
              to buy.
            </p>
            <p aria-live="polite" className="mt-1 min-h-5 text-sm text-outline">
              {status === "ready" && vehicles.length > 0 && `${vehicles.length} ${vehicles.length === 1 ? "vehicle" : "vehicles"}`}
            </p>
          </div>

          {status === "loading" && (
            <div role="status">
              <span className="sr-only">Loading vehicles…</span>
              <div className={grid}>
                {[0, 1, 2].map((slot) => (
                  <VehicleCardSkeleton key={slot} />
                ))}
              </div>
            </div>
          )}

          {status === "error" && (
            <div role="alert" className="rounded-2xl border border-red-400/30 bg-red-950/40 p-6 text-center">
              <p className="font-semibold text-on-error-container">We couldn't load the vehicles</p>
              <p className="mt-1 text-sm text-error">{error}</p>
              <Button variant="secondary" className="mt-4" onClick={reload}>
                Try again
              </Button>
            </div>
          )}

          {status === "ready" && vehicles.length === 0 && (
            <div className={emptyPanel}>
              {searching ? (
                <>
                  <p className="font-display text-lg font-semibold text-on-surface">No vehicles match your search.</p>
                  <p className="mt-1 text-sm text-on-surface-variant">Try different words or a wider price range.</p>
                  <Button variant="secondary" className="mt-4" onClick={clearFilters}>
                    Show all vehicles
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-display text-lg font-semibold text-on-surface">No vehicles available yet.</p>
                  <p className="mt-1 text-sm text-on-surface-variant">Check back soon.</p>
                </>
              )}
            </div>
          )}

          {status === "ready" && vehicles.length > 0 && (
            <ul aria-labelledby="inventory-title" className={`${grid} transition-opacity ${isFetching ? "opacity-60" : ""}`} aria-busy={isFetching}>
              {vehicles.map((vehicle) => (
                <li key={vehicle.id}>
                  <VehicleCard vehicle={vehicle} purchasing={false} loginToBuy={loginToBuy} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <LandingFeatures />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
