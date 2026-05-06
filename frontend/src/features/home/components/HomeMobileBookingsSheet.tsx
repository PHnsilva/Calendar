import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";

import HomeBookingsTimeline from "../../bookings/components/HomeBookingsTimeline";
import type { CalendarEvent } from "../../calendar/types";

function toLocalDate(dateString: string): Date {
  return new Date(`${dateString}T12:00:00`);
}

type HomeMobileBookingsSheetProps = {
  open: boolean;
  selectedDate: string;
  events: CalendarEvent[];
  activeMonth: string;
  currentAllowedMonth: string;
  nextAllowedMonth: string;
  onClose: () => void;
  onChangeTimelineMonth: (monthStart: string) => void;
  isAdminMode?: boolean;
};

export default function HomeMobileBookingsSheet({
  open,
  selectedDate,
  events,
  activeMonth,
  currentAllowedMonth,
  nextAllowedMonth,
  onClose,
  onChangeTimelineMonth,
  isAdminMode = false,
}: HomeMobileBookingsSheetProps) {
  if (!open) return null;

  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(
    toLocalDate(activeMonth),
  );
  const stopClosePropagation = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  };

  const handleCloseClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onClose();
  };

  return (
    <div
      className={[
        "home-mobile-bookings-sheet",
        open ? "home-mobile-bookings-sheet--open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="home-mobile-bookings-sheet__backdrop"
        onClick={handleCloseClick}
        aria-label="Fechar agendamentos"
      />

      <section className="home-mobile-bookings-sheet__panel" role="dialog" aria-modal="true">
        <header className="home-mobile-bookings-sheet__header">
          <div className="home-mobile-bookings-sheet__header-main">
            <span className="home-mobile-bookings-sheet__handle" aria-hidden="true" />
            <div className="home-mobile-bookings-sheet__title-block">
              <span>{isAdminMode ? 'Agenda admin' : 'Agendamentos'}</span>
              <strong>{monthLabel}</strong>
            </div>
          </div>
          <button
            type="button"
            className="home-mobile-bookings-sheet__close"
            onPointerDown={stopClosePropagation}
            onClick={handleCloseClick}
            aria-label="Fechar agendamentos"
          >
            ×
          </button>
        </header>

        <div className="home-mobile-bookings-sheet__body">
          <HomeBookingsTimeline
            selectedDate={selectedDate}
            events={events}
            activeMonth={activeMonth}
            currentAllowedMonth={currentAllowedMonth}
            nextAllowedMonth={nextAllowedMonth}
            onChangeMonth={onChangeTimelineMonth}
            onQuickBooking={() => {}}
              hideQuickBooking
            eyebrow={isAdminMode ? "AGENDA ADMIN" : "MEUS AGENDAMENTOS"}
            title={monthLabel}
            isAdminMode={isAdminMode}
          />
        </div>
      </section>
    </div>
  );
}
