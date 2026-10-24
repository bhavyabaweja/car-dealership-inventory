import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { config } from "../config";

/** What is true of this app, said plainly. Nothing here is a figure about stock or a promise about a vehicle. */
const FACTS: ReadonlyArray<[string, string]> = [
  ["Live", "Stock levels"],
  ["Safe", "No overselling"],
  ["Secure", "Role-based sign-in"],
];

/** The top of the page: what this is, the facts about it, and (as children) the search console. */
export function HeroSection({ children }: { children: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-surface-container-low to-background">
      {/* Two soft pools of cold light, as in the design. */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-32 -left-20 size-96 rounded-full bg-secondary-container/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute top-1/2 -right-32 size-[32rem] rounded-full bg-primary-container/10 blur-3xl" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-5 pt-10 pb-8 md:px-12">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-primary-container uppercase">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Dealership inventory
            </p>
            <h1 className="mt-2 font-display text-4xl leading-[1.1] font-bold tracking-tight text-on-surface sm:text-5xl lg:text-[3.5rem]">
              Find your{" "}
              <span className="bg-gradient-to-r from-primary via-primary-container to-secondary bg-clip-text text-transparent">perfect drive</span>
            </h1>
            <p className="mt-3 max-w-2xl text-base text-outline sm:text-lg">
              Browse the dealership's inventory as it stands right now. Search by make, model, category or price, and see exactly how many of
              each vehicle are on hand.
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:w-auto">
            {[...FACTS, [config.currency, "Price currency"] as const].map(([value, label]) => (
              <Fact key={label} value={value} label={label} />
            ))}
          </dl>
        </div>

        {children}
      </div>
    </section>
  );
}

function Fact({ value, label }: { value: string; label: string }) {
  return (
    // The term comes first in the markup, as a description list needs; the value is shown above it.
    <div className="flex flex-col-reverse rounded-lg bg-surface-container/70 px-3 py-2 shadow-sm">
      <dt className="text-xs font-semibold text-outline">{label}</dt>
      <dd className="font-display text-xl leading-tight font-bold text-primary">{value}</dd>
    </div>
  );
}
