import { ThemeToggle } from "../../../components/ui/ThemeToggle";

type HomeMobileDockProps = {
  onQuickBooking: () => void;
  onOpenBookings: () => void;
  isBookingsOpen: boolean;
  showQuickBooking?: boolean;
};

export default function HomeMobileDock({
  onQuickBooking,
  onOpenBookings,
  isBookingsOpen,
  showQuickBooking = true,
}: HomeMobileDockProps) {
  return (
    <nav className="home-mobile-dock" aria-label="Ações da agenda no mobile">
      <button
        type="button"
        className={[
          "home-mobile-dock__action",
          "home-mobile-dock__action--bookings",
          isBookingsOpen ? "home-mobile-dock__action--active" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={onOpenBookings}
        aria-label={isBookingsOpen ? "Fechar agendamentos" : "Abrir agendamentos"}
        title={isBookingsOpen ? "Fechar agendamentos" : "Abrir agendamentos"}
      >
        <span className="home-mobile-dock__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 3V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M17 3V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M4 9H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <rect x="4" y="5" width="16" height="15" rx="4" stroke="currentColor" strokeWidth="2" />
            <path d="M8 13H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M8 16H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      {showQuickBooking ? (
        <button
          type="button"
          className="home-mobile-dock__fab"
          onClick={onQuickBooking}
          aria-label="Novo agendamento"
          title="Novo agendamento"
        >
          <span aria-hidden="true">+</span>
        </button>
      ) : (
        <span className="home-mobile-dock__fab home-mobile-dock__fab--placeholder" aria-hidden="true" />
      )}

      <div className="home-mobile-dock__theme" aria-label="Alternar tema">
        <ThemeToggle />
      </div>
    </nav>
  );
}
