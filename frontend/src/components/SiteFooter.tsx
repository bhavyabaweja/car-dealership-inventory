import { CarFront } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { config } from "../config";
import type { CategoryTab } from "../lib/inventoryView";
import { BrandMark } from "./BrandMark";

const link =
  "rounded text-left text-xs transition-colors hover:text-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container";
const heading = "font-display text-sm font-semibold tracking-wider text-white uppercase";

interface SiteFooterProps {
  /** The categories the vehicles on screen have, to link to. */
  categories: CategoryTab[];
  onChooseCategory: (key: string) => void;
}

/** The foot of the page. Only things that are true: where to go, who is signed in, and how prices and pictures should be read. */
export function SiteFooter({ categories, onChooseCategory }: SiteFooterProps) {
  const { isAdmin } = useAuth();

  return (
    <footer className="mt-12 w-full border-t border-white/8 bg-surface-container-lowest text-outline">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="mb-12 grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-tr from-secondary-container to-primary-container p-0.5">
                <span className="grid size-full place-items-center rounded-[6px] bg-background">
                  <CarFront className="size-[18px] text-primary-container" aria-hidden="true" />
                </span>
              </span>
              <BrandMark />
            </div>
            <p className="text-xs leading-relaxed text-outline">
              AutoVault is a modern automotive marketplace offering transparent live vehicle inventory and straightforward online purchasing.
            </p>
          </div>

          <nav aria-label="Footer: inventory" className="space-y-3">
            <h2 className={heading}>Inventory</h2>
            {categories.length > 0 ? (
              <ul className="space-y-2">
                {categories.map((category) => (
                  <li key={category.key}>
                    <button type="button" className={link} onClick={() => onChooseCategory(category.key)}>
                      {category.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs">No vehicles listed yet.</p>
            )}
          </nav>

          <nav aria-label="Footer: platform" className="space-y-3">
            <h2 className={heading}>Platform</h2>
            <ul className="space-y-2 text-xs">
              <li>
                <a className={link} href="#hero">
                  Home
                </a>
              </li>
              <li>
                <a className={link} href="#inventory">
                  All inventory
                </a>
              </li>
              <li>
                <a className={link} href="#categories">
                  Browse categories
                </a>
              </li>
              <li>
                <a className={link} href="#features">
                  About
                </a>
              </li>
            </ul>
          </nav>

          <div className="space-y-3">
            <h2 className={heading}>Good to know</h2>
            <ul className="space-y-2 text-xs leading-relaxed">
              <li>Signed in as {isAdmin ? "an administrator" : "a customer"}.</li>
              <li>Prices are shown in {config.currency}.</li>
              <li>The pictures on the cards are illustrations of a kind of car, not photographs of the vehicles themselves.</li>
            </ul>
          </div>
        </div>

        <p className="border-t border-white/8 pt-8 text-xs text-slate-500">&copy; {new Date().getFullYear()} AutoVault. All rights reserved.</p>
      </div>
    </footer>
  );
}
