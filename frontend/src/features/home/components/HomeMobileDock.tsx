import { useEffect, useState } from 'react';

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7.2a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2Z"
        fill="currentColor"
        fillOpacity="0.96"
      />
      <path
        d="M7.4 17.2c.9-2 2.7-3.1 4.6-3.1s3.7 1.1 4.6 3.1"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M9.1 6.8c.7-.8 1.7-1.3 2.9-1.3 1.2 0 2.3.5 3 1.4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.6 11 12 4.4 20.4 11"
        stroke="currentColor"
        strokeWidth="2.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.2 10.8v8.6c0 .55.45 1 1 1h9.6c.55 0 1-.45 1-1v-8.6"
        stroke="currentColor"
        strokeWidth="2.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 20v-4.6c0-.44.36-.8.8-.8h2.4c.44 0 .8.36.8.8V20"
        stroke="currentColor"
        strokeWidth="2.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  const [isOverviewActive, setIsOverviewActive] = useState(false);
  const agendaIsActive = showQuickBooking ? isOverviewActive : isBookingsOpen;

  useEffect(() => {
    const handleOverviewState = (event: Event) => {
      const detail = (event as CustomEvent<{ active?: boolean }>).detail;
      setIsOverviewActive(Boolean(detail?.active));
    };

    window.addEventListener('home-mobile-planner:overview-state', handleOverviewState);
    return () => window.removeEventListener('home-mobile-planner:overview-state', handleOverviewState);
  }, []);

  const handleAgendaClick = () => {
    if (showQuickBooking && isOverviewActive) {
      window.dispatchEvent(new CustomEvent('home-mobile-planner:home'));
      setIsOverviewActive(false);
      return;
    }

    if (showQuickBooking) {
      window.dispatchEvent(new CustomEvent('home-mobile-planner:open-overview'));
      setIsOverviewActive(true);
      return;
    }

    onOpenBookings();
  };

  const handleQuickBookingClick = () => {
    window.dispatchEvent(new CustomEvent('home-mobile-planner:quick-booking'));
    onQuickBooking();
  };

  return (
    <nav className="home-mobile-dock" aria-label="Ações da agenda no mobile">
      <button
        type="button"
        className={[
          'home-mobile-dock__action',
          'home-mobile-dock__action--bookings',
          agendaIsActive ? 'home-mobile-dock__action--active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={handleAgendaClick}
        aria-label={agendaIsActive ? 'Voltar para o início' : 'Abrir agendamentos'}
        title={agendaIsActive ? 'Voltar para o início' : 'Abrir agendamentos'}
      >
        <span className="home-mobile-dock__icon" aria-hidden="true">
          {agendaIsActive ? (
            <HomeIcon />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 3V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M17 3V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M4 9H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <rect x="4" y="5" width="16" height="15" rx="4" stroke="currentColor" strokeWidth="2" />
              <path d="M8 13H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M8 16H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </span>
        <span className="home-mobile-dock__action-label">{agendaIsActive ? 'Início' : 'Agenda'}</span>
      </button>

      {showQuickBooking ? (
        <button
          type="button"
          className="home-mobile-dock__fab"
          onClick={handleQuickBookingClick}
          aria-label="Novo agendamento"
          title="Novo agendamento"
        >
          <span aria-hidden="true">+</span>
        </button>
      ) : (
        <span className="home-mobile-dock__fab home-mobile-dock__fab--placeholder" aria-hidden="true" />
      )}

      <button type="button" className="home-mobile-dock__profile" aria-label="Perfil" title="Perfil">
        <ProfileIcon />
      </button>
    </nav>
  );
}
