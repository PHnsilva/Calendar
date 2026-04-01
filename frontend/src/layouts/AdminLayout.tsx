import { Navigate, Outlet, useLocation } from "react-router-dom";
import AppShell from "./AppShell";
import Logo from "../components/branding/Logo";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { clearAdminToken, getStoredAdminToken } from "../lib/storage";
import { env } from "../lib/env";

export default function AdminLayout() {
  const location = useLocation();
  const hasToken = Boolean(getStoredAdminToken());
  const isGatePage = location.pathname === "/admin";

  if (!env.adminEnabled) {
    return <Navigate to="/403" replace />;
  }

  if (!hasToken && !isGatePage) {
    return <Navigate to="/admin" replace />;
  }

  const header = (
    <header className="public-header">
      <div className="brand-lockup" aria-label="Painel administrativo">
        <Logo />
      </div>

      <div className="public-header__actions">
        <span className="booking-sidebar-rail__admin-badge">Admin</span>
        <ThemeToggle />
        {hasToken ? (
          <button
            type="button"
            className="secondary-action"
            onClick={() => {
              clearAdminToken();
              window.location.href = "/admin";
            }}
          >
            Sair
          </button>
        ) : null}
      </div>
    </header>
  );

  return (
    <AppShell header={header}>
      <main className="public-layout__content">
        <Outlet />
      </main>
    </AppShell>
  );
}
