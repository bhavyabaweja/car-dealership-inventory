import { KeyRound, PackageCheck, ShieldCheck } from "lucide-react";

/** What the app really does, in the design's three-card strip. Each sentence describes behaviour the app has and tests. */
const FEATURES = [
  {
    icon: PackageCheck,
    title: "Live stock levels",
    text: "Every card shows the units on hand right now. Sold-out vehicles stay listed, clearly marked, so you can see what is out of stock.",
  },
  {
    icon: ShieldCheck,
    title: "Purchases that never oversell",
    text: "A purchase is checked and applied in one step, so two buyers cannot both take the last unit.",
  },
  {
    icon: KeyRound,
    title: "Roles that keep it safe",
    text: "Customers browse, search and buy. Administrators add, edit, restock and delete. The server checks every request, not just the screen.",
  },
] as const;

export function FeaturesStrip() {
  return (
    <section aria-labelledby="features-title" className="mx-auto max-w-7xl px-5 pb-16 md:px-12">
      <h2 id="features-title" className="sr-only">
        How the inventory works
      </h2>
      <ul className="grid gap-4 md:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <li key={title} className="rounded-xl bg-surface-container p-6 shadow-md ring-1 ring-white/5">
            <span className="grid size-10 place-items-center rounded-lg bg-primary-container/15 text-primary-container ring-1 ring-primary-container/25">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-display text-lg font-semibold text-on-surface">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-on-surface-variant">{text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
