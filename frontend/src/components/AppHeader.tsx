import { Car, LogOut } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { Button } from "./Button";

/** The bar across the top of every signed-in screen. */
export function AppHeader() {
  const { user, isAdmin, logout } = useAuth();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <div className="flex shrink-0 items-center gap-2 font-semibold text-slate-900">
          <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white">
            <Car className="size-4" aria-hidden="true" />
          </span>
          <span className="sr-only sm:not-sr-only">Car Dealership</span>
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-3">
          <span className="min-w-0 truncate text-sm text-slate-600">{user?.email}</span>
          {isAdmin && (
            <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
              Admin
            </span>
          )}
          <Button variant="secondary" size="sm" onClick={logout}>
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
