import type { CSSProperties, KeyboardEvent } from "react";
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

  return Array.from({ length: 35 }, (_, index) => {
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
  bookingPickMode?: boolean;
  onDateSelect: (date: string, options?: { unavailable?: boolean }) => void;
  onOpenDayBooking: (date: string) => void;
};

const weekLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function BigCalendar({
  currentMonth,
  selectedDate,
  events,
  unavailableDates,
  bookingPickMode = false,
  onDateSelect,
  onOpenDayBooking,
}: BigCalendarProps) {
  const today = toIsoDate(new Date());
  const days = getMonthDays(currentMonth);
  const activeWeekday = getWeekdayIndex(selectedDate || today);

  const handleKeyboardSelect = (
    event: KeyboardEvent<HTMLDivElement>,
    date: string,
    isClickable: boolean,
  ) => {
    if (!isClickable) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onDateSelect(date, { unavailable: false });
    }
  };

  return (
    <div className="calendar-grid calendar-grid--slim">
      <div className="calendar-grid__weekdays calendar-grid__weekdays--slim">
        {weekLabels.map((label, index) => (
          <span
            key={label}
            className={[
              "calendar-grid__weekday",
              activeWeekday === index ? "calendar-grid__weekday--active" : "",
              `calendar-grid__weekday--tone-${index}`,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="calendar-grid__body calendar-grid__body--slim">
        {days.map((day, index) => {
          const dayEvents = events.filter((event) => event.date === day.date);
          const isUnavailable = unavailableDates.includes(day.date);
          const isOutside = !day.isCurrentMonth;
          const isPast = day.date < today;
          const hasEvents = dayEvents.length > 0;
          const isSelected = selectedDate === day.date;
          const isClickable = !isOutside && !isUnavailable && !isPast;
          const isFloating = bookingPickMode && isClickable;

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
                bookingPickMode ? "calendar-grid__cell--pick-mode" : "",
                isFloating ? "calendar-grid__cell--floating" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => {
                if (!isClickable) return;
                onDateSelect(day.date, { unavailable: false });
              }}
              onKeyDown={(event) => handleKeyboardSelect(event, day.date, isClickable)}
              aria-label={`Selecionar dia ${day.date}`}
              aria-disabled={!isClickable}
              role="button"
              tabIndex={isClickable ? 0 : -1}
              style={{ "--cell-order": index % 7 } as CSSProperties}
            >
              <div className="calendar-grid__date-row">
                <CalendarDateCell
                  date={day.date}
                  variant="big"
                  isToday={today === day.date}
                  isSelected={isSelected}
                  isUnavailable={isUnavailable || isPast}
                  hasEvents={hasEvents}
                  isCurrentMonth={day.isCurrentMonth}
                />
              </div>

              <div className="calendar-grid__indicator-stack">
                <span
                  className={[
                    "calendar-indicator",
                    hasEvents ? "calendar-indicator--booked" : "calendar-indicator--idle",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              </div>

              {isSelected && isClickable && !bookingPickMode ? (
                <button
                  type="button"
                  className="calendar-grid__inline-cta"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenDayBooking(day.date);
                  }}
                >
                  <span className="calendar-grid__inline-cta-label">Agendar</span>
                  <span className="calendar-grid__inline-cta-icon" aria-hidden="true">
                    +
                  </span>
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
