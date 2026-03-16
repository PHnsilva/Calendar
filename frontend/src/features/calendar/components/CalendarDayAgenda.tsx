import type { CalendarEvent } from "../types";

function toLocalDate(dateString: string): Date {
  return new Date(`${dateString}T12:00:00`);
}

function formatDay(dateString: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(toLocalDate(dateString));
}

type CalendarDayAgendaProps = {
  selectedDate: string;
  events: CalendarEvent[];
  unavailableDates: string[];
  isSelectingDate: boolean;
  onRequestBookingDate: () => void;
};

export default function CalendarDayAgenda({
  selectedDate,
  events,
  unavailableDates,
  isSelectingDate,
  onRequestBookingDate,
}: CalendarDayAgendaProps) {
  const dayEvents = events.filter((event) => event.date === selectedDate);
  const isUnavailable = unavailableDates.includes(selectedDate);

  return (
    <div className="agenda" id="day-agenda-panel">
      <div className="agenda__header">
        <div>
          <span className="agenda__eyebrow">Agendamentos do dia</span>
          <h3 className="agenda__title">{formatDay(selectedDate)}</h3>
        </div>

        <div className="agenda__summary">
          <strong>{dayEvents.length}</strong>
          <span>{dayEvents.length === 1 ? "agendamento" : "agendamentos"}</span>
        </div>
      </div>

      {isSelectingDate ? (
        <div className="agenda__selection-hint">
          <strong>Selecione um dia</strong>
          <p>Escolha um dia disponível no calendário para abrir o formulário.</p>
        </div>
      ) : null}

      <div className="agenda__body">
        {isUnavailable ? (
          <div className="agenda__empty">
            <strong>Data indisponível</strong>
            <p>Esse dia está bloqueado para novos agendamentos.</p>
          </div>
        ) : dayEvents.length > 0 ? (
          <div className="agenda__events">
            {dayEvents.map((event) => (
              <div key={event.id} className="agenda__event-card">
                <div className="agenda__event-main">
                  <div>
                    <span className="agenda__event-time">
                      {event.startTime} - {event.endTime}
                    </span>
                    <strong className="agenda__event-title">{event.title}</strong>
                  </div>

                  <span className="agenda__event-chip">Agendado</span>
                </div>

                <span className="agenda__event-meta">
                  {event.city ? `${event.city}` : "Atendimento"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="agenda__empty agenda__empty--soft">
            <strong>Nenhum agendamento neste dia</strong>
            <p>Esse dia está livre para um novo atendimento.</p>
          </div>
        )}
      </div>

      <div className="agenda__footer">
        <button
          type="button"
          className={[
            "booking-cta",
            isSelectingDate ? "booking-cta--active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={onRequestBookingDate}
        >
          <span className="booking-cta__icon" aria-hidden="true">
            +
          </span>
          <span>{isSelectingDate ? "Selecione um dia" : "Agendamentos"}</span>
        </button>
      </div>
    </div>
  );
}