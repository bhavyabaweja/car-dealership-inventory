import { useLayoutEffect } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../auth/AuthProvider";
import { DashboardPage } from "./DashboardPage";
import { LandingPage } from "./LandingPage";

/** The class that gives the signed-in inventory its own look (see index.css). */
export const INVENTORY_THEME = "theme-inventory";

/**
 * What "/" shows: the inventory for someone signed in, the landing page for a visitor. A visitor whose
 * session has just run out is sent to the login page instead, which says why and sends them back here.
 *
 * The two have different looks, from two Stitch designs. The inventory's is switched on by a class on the page's
 * root element, not on its own wrapper, so that what sits outside the page's tree (dialogs in the top layer, the
 * notifications) follows it. It is switched on before the first paint, and off again when the inventory goes away.
 */
export function HomePage() {
  const { user, sessionExpired } = useAuth();
  const location = useLocation();
  const showsInventory = user !== null;

  useLayoutEffect(() => {
    if (!showsInventory) return;
    document.documentElement.classList.add(INVENTORY_THEME);
    return () => document.documentElement.classList.remove(INVENTORY_THEME);
  }, [showsInventory]);

  if (user) return <DashboardPage />;
  if (sessionExpired) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return <LandingPage />;
}
