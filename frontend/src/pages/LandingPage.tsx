import { Lock } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { AccountDialog } from "../components/landing/AccountDialog";
import { LandingCta, LandingFeatures } from "../components/landing/LandingFeatures";
import { LandingFooter } from "../components/landing/LandingFooter";
import { LandingHeader } from "../components/landing/LandingHeader";
import { LandingHero } from "../components/landing/LandingHero";
import { LandingSearch } from "../components/landing/LandingSearch";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { countActive, emptyFilters, type FilterInputs, filtersFromParams, paramsFromFilters, toFilters } from "../lib/filters";

const linkButton =
  "inline-flex h-11 items-center justify-center rounded-lg px-6 text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container";

/**
 * What a visitor sees before logging in: the design's page. The API lets only signed-in users list vehicles, so this
 * page cannot show any; it sells the inventory, lets the visitor start a search, and asks for an account to run it.
 */
export function LandingPage() {
  useDocumentTitle("Find your perfect drive");
  const [params] = useSearchParams();
  const [inputs, setInputs] = useState<FilterInputs>(() => filtersFromParams(params));
  const [asking, setAsking] = useState(false);

  const { errors } = toFilters(inputs);
  // Where the visitor lands once signed in: the inventory, already searched. The address is how the dashboard is told.
  const query = paramsFromFilters(inputs).toString();
  const destination = query ? `/?${query}` : "/";

  function search() {
    if (Object.keys(errors).length > 0) return; // the fields say what is wrong; there is nothing to keep yet
    setAsking(true);
  }

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
            onClear={() => setInputs(emptyFilters)}
            onSearch={search}
          />
        </section>

        <section id="inventory" aria-labelledby="inventory-title" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-24 md:px-8">
          <div className="mb-6 border-b border-white/8 pb-6">
            <h2 id="inventory-title" tabIndex={-1} className="font-display text-2xl font-bold text-white focus:outline-none sm:text-3xl">
              Available inventory
            </h2>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/7 bg-surface-container px-4 py-20 text-center">
            <span className="mb-4 grid size-16 place-items-center rounded-2xl border border-white/8 bg-surface-container-high text-primary-container">
              <Lock className="size-8" aria-hidden="true" />
            </span>
            <p className="mb-2 font-display text-2xl font-bold text-white">Sign in to see the live inventory</p>
            <p className="mb-6 max-w-md text-sm text-outline">
              Every vehicle, its price and exactly how many are in stock are shown to signed-in visitors. It takes a minute to create an account.
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                to="/login"
                state={{ from: destination }}
                className={`${linkButton} bg-primary-container font-display font-bold text-on-primary-container hover:bg-primary hover:shadow-[0_0_15px_rgba(0,212,255,0.3)]`}
              >
                Log in
              </Link>
              <Link
                to="/register"
                state={{ from: destination }}
                className={`${linkButton} bg-surface-container-low text-on-surface ring-1 ring-white/10 ring-inset hover:text-primary-container`}
              >
                Create an account
              </Link>
            </div>
          </div>
        </section>

        <LandingFeatures />
        <LandingCta />
      </main>
      <LandingFooter />

      {asking && <AccountDialog from={destination} onClose={() => setAsking(false)} />}
    </div>
  );
}
