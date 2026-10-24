import { Navigate, useLocation } from "react-router";
import { useAuth } from "../auth/AuthProvider";
import { DashboardPage } from "./DashboardPage";
import { LandingPage } from "./LandingPage";

/**
 * What "/" shows: the inventory for someone signed in, the landing page for a visitor. A visitor whose
 * session has just run out is sent to the login page instead, which says why and sends them back here.
 */
export function HomePage() {
  const { user, sessionExpired } = useAuth();
  const location = useLocation();

  if (user) return <DashboardPage />;
  if (sessionExpired) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return <LandingPage />;
}
