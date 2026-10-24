import { CarFront, Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { BrandMark } from "../BrandMark";

const LINKS = [
  { href: "#hero", label: "Home" },
  { href: "#inventory", label: "Browse inventory" },
  { href: "#features", label: "About" },
] as const;

const desktopLink =
  "rounded text-sm font-medium text-outline transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-container";

/**
 * The bar across the top of the landing page, as in the updated design: the brand, where to go, Log in and Sign up,
 * and a menu on phones. Both account links remember the page, so signing in brings the visitor back to it.
 */
export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const location = useLocation();
  const from = `${location.pathname}${location.search}`;

  // Escape closes the menu and gives the cursor back to its button, but only while it is open.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButton.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/8 bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 sm:gap-6 md:px-8">
        <a href="#hero" className="flex shrink-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-container">
          <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-tr from-secondary-container via-blue-600 to-primary-container p-0.5 shadow-glow">
            <span className="grid size-full place-items-center rounded-[6px] bg-background">
              <CarFront className="size-5 text-primary-container" aria-hidden="true" />
            </span>
          </span>
          <BrandMark className="hidden text-2xl font-extrabold min-[360px]:inline" />
          <span className="sr-only min-[360px]:hidden">AutoVault</span>
        </a>

        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {LINKS.map((link, index) => (
            <a key={link.href} href={link.href} className={index === 0 ? `${desktopLink} font-semibold! text-white!` : desktopLink}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Link
            to="/login"
            state={{ from }}
            className="rounded-lg px-2 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-primary-container sm:px-3"
          >
            Log in
          </Link>
          <Link
            to="/register"
            state={{ from }}
            className="rounded-lg bg-primary-container px-3 py-2 text-xs font-semibold text-on-primary-container shadow-glow transition-all hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container sm:px-4"
          >
            Sign up
          </Link>

          <button
            ref={menuButton}
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
            className="grid size-11 place-items-center rounded-lg text-slate-300 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-primary-container md:hidden"
          >
            {menuOpen ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-6" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div id={menuId} hidden={!menuOpen} className="border-t border-white/8 bg-surface-container-low px-4 py-4 md:hidden">
        <nav aria-label="Mobile" className="space-y-1">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-2 py-3 font-medium text-slate-200 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-primary-container"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
