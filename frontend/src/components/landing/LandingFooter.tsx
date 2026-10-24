import { CarFront } from "lucide-react";
import { Link } from "react-router";
import { config } from "../../config";
import { BrandMark } from "../BrandMark";

const link =
  "rounded text-left text-xs transition-colors hover:text-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container";
const heading = "font-display text-sm font-semibold tracking-wider text-white uppercase";

/** The foot of the landing page. Only things that are true: where to go, how to get an account, and how prices and pictures are shown. */
export function LandingFooter() {
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

          <nav aria-label="Footer: account" className="space-y-3">
            <h2 className={heading}>Account</h2>
            <ul className="space-y-2">
              <li>
                <Link className={link} to="/login" state={{ from: "/" }}>
                  Log in
                </Link>
              </li>
              <li>
                <Link className={link} to="/register" state={{ from: "/" }}>
                  Create an account
                </Link>
              </li>
            </ul>
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
                <a className={link} href="#features">
                  About
                </a>
              </li>
            </ul>
          </nav>

          <div className="space-y-3">
            <h2 className={heading}>Good to know</h2>
            <ul className="space-y-2 text-xs leading-relaxed">
              <li>Prices are shown in {config.currency}.</li>
              <li>The pictures on the cards are illustrations of a kind of car, not photographs of the vehicles themselves.</li>
            </ul>
          </div>
        </div>

        <p className="border-t border-white/8 pt-8 text-xs text-outline">&copy; {new Date().getFullYear()} AutoVault. All rights reserved.</p>
      </div>
    </footer>
  );
}
