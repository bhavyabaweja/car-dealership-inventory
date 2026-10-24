import { ArrowRight, CarFront, PackageCheck, SlidersHorizontal, Zap } from "lucide-react";
import { Link } from "react-router";
import { useAuth } from "../auth/AuthProvider";

/** What the app really does, in the design's four cards. Each sentence describes behaviour the app has and tests. */
const FEATURES = [
  {
    icon: CarFront,
    title: "Explore available vehicles",
    text: "Browse the dealership's whole inventory in one place, with each vehicle's category, price and stock on show.",
    tone: "bg-primary-container/10 border-primary-container/20",
  },
  {
    icon: SlidersHorizontal,
    title: "Search by your preferences",
    text: "Filter by make, model, category and price range. Results come straight from the inventory as you type.",
    tone: "bg-secondary-container/10 border-secondary-container/20",
  },
  {
    icon: PackageCheck,
    title: "Check live stock availability",
    text: "Quantity counters show how many of each vehicle are on hand now, and flag the ones that are running low.",
    tone: "bg-primary-container/10 border-primary-container/20",
  },
  {
    icon: Zap,
    title: "Purchase with ease",
    text: "Review your order, confirm it, and it is applied in one step: two buyers can never take the last unit.",
    tone: "bg-secondary-container/10 border-secondary-container/20",
  },
] as const;

export function FeaturesStrip() {
  return (
    <section id="features" aria-labelledby="features-title" className="mx-auto max-w-7xl scroll-mt-28 border-t border-white/8 px-4 py-20 md:px-8">
      <div className="mx-auto mb-16 max-w-2xl text-center">
        <p className="mb-2 text-xs font-semibold tracking-wider text-primary-container uppercase">Built for clarity</p>
        <h2 id="features-title" className="font-display text-3xl font-bold text-white sm:text-4xl">
          Why explore AutoVault?
        </h2>
        <p className="mt-3 text-sm text-outline">Transparent, live inventory for buyers, and simple controls for the people who manage it.</p>
      </div>

      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, text, tone }) => (
          <li key={title} className="flex flex-col justify-between rounded-2xl border border-white/7 bg-surface-container p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary-container/30 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
            <span className={`mb-5 grid size-12 place-items-center rounded-xl border text-primary-container ${tone}`}>
              <Icon className="size-6" aria-hidden="true" />
            </span>
            <div>
              <h3 className="mb-2 font-display text-lg font-bold text-white">{title}</h3>
              <p className="text-xs leading-relaxed text-outline">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The closing banner of the design. A visitor is invited to create an account, which is what opens the inventory. */
export function FinalCta() {
  const { user } = useAuth();
  const callToAction =
    "inline-flex items-center gap-2 rounded-xl bg-primary-container px-8 py-3.5 font-display text-sm font-bold text-on-primary-container transition-all hover:bg-primary hover:shadow-[0_0_20px_rgba(0,212,255,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container";

  return (
    <section aria-labelledby="cta-title" className="mx-auto max-w-7xl px-4 py-16 md:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-surface-container/75 p-8 text-center backdrop-blur-xl sm:p-14">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-secondary-container/10 via-primary-container/5 to-transparent" />
        <div className="relative z-10 mx-auto max-w-2xl">
          <h2 id="cta-title" className="mb-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Your next drive awaits.
          </h2>
          <p className="mb-8 text-sm leading-relaxed text-slate-300 sm:text-base">
            {user
              ? "Browse the inventory, check what is in stock, and buy when you are ready."
              : "Create an account to see the live inventory, check what is in stock, and buy when you are ready."}
          </p>
          {user ? (
            <a href="#inventory" className={callToAction}>
              Browse all vehicles
              <ArrowRight className="size-[18px]" aria-hidden="true" />
            </a>
          ) : (
            <Link to="/register" state={{ from: "/" }} className={callToAction}>
              Create an account
              <ArrowRight className="size-[18px]" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
