import { CarFront, Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "../auth/AuthProvider";
import { BrandMark } from "./BrandMark";

interface AppHeaderProps {
  /** Whether the page has a categories section to link to. */
  hasCategories: boolean;
}

const desktopLink =
  "rounded text-sm font-medium text-outline transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-container";

/** The bar across the top of the home page, as in the design: brand, where to go, who is signed in (or Log in and Sign up), and a menu on phones. */
export function AppHeader({ hasCategories }: AppHeaderProps) {
  const { user, isAdmin, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const initials = user?.email.trim().slice(0, 2).toUpperCase() ?? "";
  const location = useLocation();
  const from = `${location.pathname}${location.search}`; // where a visitor who logs in or signs up is brought back to

  const links = [
    { href: "#hero", label: "Home" },
    { href: "#inventory", label: "Browse inventory" },
    ...(hasCategories ? [{ href: "#categories", label: "Categories" }] : []),
    { href: "#features", label: "About" },
  ];

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
        <a href="#hero" className="group flex shrink-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-container">
          <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-tr from-secondary-container via-blue-600 to-primary-container p-0.5 shadow-glow">
            <span className="grid size-full place-items-center rounded-[6px] bg-background">
              <CarFront className="size-5 text-primary-container" aria-hidden="true" />
            </span>
          </span>
          <BrandMark className="hidden text-2xl font-extrabold min-[360px]:inline" />
          <span className="sr-only min-[360px]:hidden">AutoVault</span>
        </a>

        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {links.map((link, index) => (
            <a key={link.href} href={link.href} className={index === 0 ? `${desktopLink} font-semibold! text-white!` : desktopLink}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          {user ? (
            <>
              <div className="flex min-w-0 items-center gap-2.5 rounded-full border border-white/8 bg-surface-container py-1.5 pr-3 pl-1.5">
                <span
                  aria-hidden="true"
                  className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-container to-secondary text-xs font-bold text-on-primary-container"
                >
                  {initials}
                </span>
                <span className="hidden max-w-[10rem] truncate text-sm font-medium text-slate-200 sm:inline lg:max-w-[16rem]">{user.email}</span>
                {isAdmin && (
                  <span className="shrink-0 rounded-full bg-primary-container/15 px-2 py-0.5 text-[11px] font-bold text-primary ring-1 ring-primary-container/30 ring-inset">
                    Admin
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={logout}
                className="rounded px-1 text-xs font-medium text-outline transition-colors hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-container"
              >
                Sign out
              </button>
            </>
          ) : (
            // A visitor: the design's Log in and Sign up. Both remember the page, so signing in brings them back to it.
            <>
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
            </>
          )}

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
          {links.map((link) => (
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
