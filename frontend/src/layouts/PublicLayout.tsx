import { Outlet, useLocation } from "react-router-dom";
import AppShell from "./AppShell";
import Logo from "../components/branding/Logo";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { useHomeBookingSelection } from "../app/home-booking-provider";

export default function PublicLayout() {
  const location = useLocation();
  const { requestQuickBooking } = useHomeBookingSelection();

  const isHomeLikePage = location.pathname === "/" || location.pathname.startsWith("/admin");

  const header = (
    <header className="public-header public-header--chrome">
      <div className="brand-lockup" aria-label="SG Pequenos Reparos">
        <Logo />
      </div>

      <div className="public-header__actions">
        <ThemeToggle />

        {isHomeLikePage ? (
          <button
            type="button"
            className="header-booking-action"
            onClick={requestQuickBooking}
          >
            <span className="header-booking-action__icon" aria-hidden="true">
              +
            </span>
            <span>Agendamentos</span>
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
