import { Car, LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { config } from "../config";
import { BrandMark } from "./BrandMark";
import { Button } from "./Button";

const navLink =
  "rounded-lg px-4 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface " +
  "focus-visible:outline-2 focus-visible:outline-primary-container";

/** The bar across the top of every signed-in screen: the brand, where to go, which currency prices use, and who is signed in. */
export function AppHeader() {
  const { user, isAdmin, logout } = useAuth();
  const initial = user?.email.trim().charAt(0).toUpperCase() ?? "";

  return (
    <header className="sticky top-0 z-30 border-b border-primary-container/15 bg-surface/90 pt-[env(safe-area-inset-top)] shadow-[0_4px_24px_rgba(6,13,36,0.6)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-5 sm:h-20 md:px-12">
        <a href="#top" className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-container">
          <span className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-secondary-container to-primary-container text-white shadow-glow">
            <Car className="size-5" aria-hidden="true" />
          </span>
          <BrandMark className="hidden min-[400px]:inline" />
          <span className="sr-only min-[400px]:hidden">AutoVault</span>
        </a>

        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
          <a href="#top" className={navLink}>
            Home
          </a>
          <a href="#inventory" className={navLink}>
            Inventory
          </a>
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
          <span
            title={`Prices are shown in ${config.currency}`}
            className="hidden shrink-0 rounded-lg bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-on-surface sm:inline-block"
          >
            <span className="sr-only">Prices in </span>
            {config.currency}
          </span>

          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-container/15 font-display text-sm font-semibold text-primary-container ring-2 ring-primary-container/30"
            >
              {initial}
            </span>
            <span className="hidden min-w-0 truncate text-sm text-on-surface-variant md:inline">{user?.email}</span>
            {isAdmin && (
              <span className="shrink-0 rounded-full bg-primary-container/15 px-2 py-0.5 text-xs font-semibold text-primary ring-1 ring-inset ring-primary-container/30">
                Admin
              </span>
            )}
          </div>

          <Button variant="secondary" size="sm" onClick={logout}>
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
