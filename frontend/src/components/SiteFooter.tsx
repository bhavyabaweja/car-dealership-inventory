import { Car } from "lucide-react";
import { config } from "../config";
import { BrandMark } from "./BrandMark";

const link =
  "rounded text-sm text-on-surface-variant transition-colors hover:text-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container";

/** The foot of the page. Only things that are true: where to go, and how prices and pictures should be read. */
export function SiteFooter() {
  return (
    <footer className="border-t border-white/5 bg-surface-container-lowest">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:px-12 lg:grid-cols-[1.4fr_1fr_1.4fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-secondary-container to-primary-container text-white">
              <Car className="size-4" aria-hidden="true" />
            </span>
            <BrandMark />
          </div>
          <p className="mt-4 max-w-xs text-sm leading-6 text-on-surface-variant">
            A dealership inventory you can search, buy from and, if you are an administrator, manage.
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="text-xs font-bold tracking-wider text-on-surface uppercase">Browse</h2>
          <ul className="mt-4 space-y-2.5">
            <li>
              <a href="#top" className={link}>
                Back to the top
              </a>
            </li>
            <li>
              <a href="#inventory" className={link}>
                All vehicles
              </a>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="text-xs font-bold tracking-wider text-on-surface uppercase">Good to know</h2>
          <p className="mt-4 rounded-xl bg-surface-container p-4 text-sm leading-6 text-on-surface-variant ring-1 ring-white/5">
            Prices are shown in {config.currency}. The pictures on the cards are illustrations of a kind of car, not photographs of the
            vehicles themselves.
          </p>
        </div>
      </div>

      <div className="border-t border-white/5">
        <p className="mx-auto max-w-7xl px-5 py-5 text-xs text-outline md:px-12">&copy; {new Date().getFullYear()} AutoVault.</p>
      </div>
    </footer>
  );
}
