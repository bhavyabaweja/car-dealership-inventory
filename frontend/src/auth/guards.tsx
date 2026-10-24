import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "./AuthProvider";

/** Only for signed-in users. Anyone else goes to the login page, which sends them back here afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  return children;
}

/** A path inside this app: starts with one slash, not two (or a slash and a backslash), which browsers read as another site. */
const APP_PATH = /^\/(?![/\\])\S*$/;

function safeDestination(from: unknown): string {
  return typeof from === "string" && APP_PATH.test(from) ? from : "/";
}

/**
 * Only for visitors: someone already signed in has no use for the login or register page, so they
 * go on to the page they were headed for before they were sent to log in (or to the home page).
 */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (user) {
    return <Navigate to={safeDestination((location.state as { from?: unknown } | null)?.from)} replace />;
  }
  return children;
}
