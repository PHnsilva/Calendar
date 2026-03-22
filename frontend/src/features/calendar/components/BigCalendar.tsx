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
  const sundayOffset = firstDay.getDay();
  const gridStart = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    1 - sundayOffset,
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

function getWeekdayIndex(dateString: string) {
  return toLocalDate(dateString).getDay();
}

type BigCalendarProps = {
  currentMonth: string;
  selectedDate: string;
  events: CalendarEvent[];
  unavailableDates: string[];
  onDateSelect: (date: string, options?: { unavailable?: boolean }) => void;
  onOpenDayBooking: (date: string) => void;
  showInlineBookingAction?: boolean;
};

const weekLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function BigCalendar({
  currentMonth,
  selectedDate,
  events,
  unavailableDates,
  onDateSelect,
  onOpenDayBooking,
  showInlineBookingAction = true,
}: BigCalendarProps) {
  const today = toIsoDate(new Date());
  const days = getMonthDays(currentMonth);
  const activeWeekday = getWeekdayIndex(selectedDate || today);

  return (
    <div className="calendar-grid calendar-grid--slim">
      <div className="calendar-grid__weekdays calendar-grid__weekdays--slim">
        {weekLabels.map((label, index) => (
          <span
            key={label}
            className={[
              "calendar-grid__weekday",
              activeWeekday === index ? "calendar-grid__weekday--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="calendar-grid__body calendar-grid__body--slim">
        {days.map((day) => {
          const dayEvents = events.filter((event) => event.date === day.date);
          const isPast = day.date < today;
          const isUnavailable = unavailableDates.includes(day.date) || isPast;
          const isOutside = !day.isCurrentMonth;
          const hasEvents = dayEvents.length > 0;
          const isSelected = selectedDate === day.date;
          const isClickable = !isOutside && !isUnavailable;

          return (
            <div
              key={day.date}
              className={[
                "calendar-grid__cell",
                "calendar-grid__cell--slim",
                isSelected ? "calendar-grid__cell--selected" : "",
                isUnavailable ? "calendar-grid__cell--unavailable" : "",
                isOutside ? "calendar-grid__cell--outside" : "",
                isPast ? "calendar-grid__cell--past" : "",
                !isClickable ? "calendar-grid__cell--blocked" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                if (!isClickable) return;
                onDateSelect(day.date, { unavailable: false });
              }}
              onKeyDown={(event) => {
                if (!isClickable) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onDateSelect(day.date, { unavailable: false });
                }
              }}
              role="button"
              tabIndex={isClickable ? 0 : -1}
              aria-disabled={!isClickable}
              aria-label={`Selecionar dia ${day.date}`}
            >
              <div className="calendar-grid__date-row">
                <CalendarDateCell
                  date={day.date}
                  variant="big"
                  isToday={today === day.date}
                  isSelected={isSelected}
                  isUnavailable={isUnavailable}
                  hasEvents={hasEvents}
                  isCurrentMonth={day.isCurrentMonth}
                />
              </div>

              <div className="calendar-grid__indicator-stack">
                {hasEvents ? <span className="calendar-indicator calendar-indicator--booked" /> : null}
              </div>

              {isSelected && isClickable && showInlineBookingAction ? (
                <button
                  type="button"
                  className="calendar-grid__inline-cta"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenDayBooking(day.date);
                  }}
                >
                  Agendar
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
