import { Link, Outlet, useLocation } from "react-router-dom";
import AppShell from "./AppShell";
import Logo from "../components/branding/Logo";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { useHomeBookingSelection } from "../app/home-booking-provider";

export default function PublicLayout() {
  const location = useLocation();
  const { requestQuickBooking, requestOpenBookings } = useHomeBookingSelection();

  const isHomePage = location.pathname === "/";

  const header = (
    <header className={["public-header", isHomePage ? "public-header--home" : ""].filter(Boolean).join(" ")}>
      <Link to="/" className="brand-lockup" aria-label="Ir para a página inicial">
        <Logo />
      </Link>

      <div className={["public-header__actions", isHomePage ? "public-header__actions--home" : ""].filter(Boolean).join(" ")}>
        <ThemeToggle />

        {isHomePage ? (
          <>
            <button
              type="button"
              className="header-booking-action header-booking-action--compact-plus header-booking-action--accent-orange"
              onClick={requestQuickBooking}
              aria-label="Novo agendamento"
              title="Novo agendamento"
            >
              <span className="header-booking-action__icon" aria-hidden="true">
                +
              </span>
            </button>

            <button
              type="button"
              className="header-booking-action header-booking-action--sidebar-focus header-booking-action--bookings"
              onClick={requestOpenBookings}
            >
              <span>Meus agendamentos</span>
            </button>
          </>
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
