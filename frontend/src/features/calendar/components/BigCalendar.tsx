import CalendarDateCell from "./CalendarDateCell";
import type { CalendarEvent } from "../types";

function toLocalDate(dateString: string): Date {
  return new Date(`${dateString}T12:00:00`);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthDays(monthStart: string): Array<{
  date: string;
  isCurrentMonth: boolean;
}> {
  const reference = toLocalDate(monthStart);
  const firstDay = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const mondayBasedOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    1 - mondayBasedOffset,
  );

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      date: toIsoDate(date),
      isCurrentMonth: date.getMonth() === reference.getMonth(),
    };
  });
}

type BigCalendarProps = {
  currentMonth: string;
  selectedDate: string;
  events: CalendarEvent[];
  unavailableDates: string[];
  onDateSelect: (date: string, options?: { unavailable?: boolean }) => void;
};

const weekLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export default function BigCalendar({
  currentMonth,
  selectedDate,
  events,
  unavailableDates,
  onDateSelect,
}: BigCalendarProps) {
  const today = toIsoDate(new Date());
  const days = getMonthDays(currentMonth);

  return (
    <div className="calendar-grid">
      <div className="calendar-grid__weekdays">
        {weekLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="calendar-grid__body">
        {days.map((day) => {
          const dayEvents = events.filter((event) => event.date === day.date);
          const isUnavailable = unavailableDates.includes(day.date);
          const isDisabled = !day.isCurrentMonth;
          const bookingsCount = dayEvents.length;

          return (
            <div
              key={day.date}
              className={[
                "calendar-grid__cell",
                day.isCurrentMonth ? "" : "calendar-grid__cell--outside",
                selectedDate === day.date ? "calendar-grid__cell--selected" : "",
                isUnavailable ? "calendar-grid__cell--unavailable" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <button
                type="button"
                className="calendar-grid__day-button"
                disabled={isDisabled}
                onClick={() =>
                  onDateSelect(day.date, {
                    unavailable: isUnavailable,
                  })
                }
              >
                <div className="calendar-grid__cell-top">
                  <CalendarDateCell
                    date={day.date}
                    variant="big"
                    isToday={today === day.date}
                    isSelected={selectedDate === day.date}
                    isUnavailable={isUnavailable}
                    hasEvents={bookingsCount > 0}
                    isCurrentMonth={day.isCurrentMonth}
                  />

                  {isUnavailable ? (
                    <span className="calendar-grid__state calendar-grid__state--unavailable">
                      Indisponível
                    </span>
                  ) : (
                    <span className="calendar-grid__state calendar-grid__state--available">
                      Disponível
                    </span>
                  )}
                </div>

                <div className="calendar-grid__cell-bottom">
                  {bookingsCount > 0 ? (
                    <span className="calendar-count-badge">
                      <strong>{bookingsCount}</strong>
                      <span>
                        {bookingsCount === 1 ? "agendamento" : "agendamentos"}
                      </span>
                    </span>
                  ) : (
                    <span className="calendar-count-badge calendar-count-badge--ghost">
                      <span>Nenhum agendamento</span>
                    </span>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}