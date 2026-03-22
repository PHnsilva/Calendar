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

function getPreviewDays(monthStart: string): string[] {
  const reference = toLocalDate(monthStart);
  const days = new Date(
    reference.getFullYear(),
    reference.getMonth() + 1,
    0,
  ).getDate();

  return Array.from({ length: Math.min(days, 14) }, (_, index) =>
    toIsoDate(new Date(reference.getFullYear(), reference.getMonth(), index + 1)),
  );
}

type CalendarMonthPreviewProps = {
  monthStart: string;
  selectedDate: string;
  events: CalendarEvent[];
  unavailableDates: string[];
  disabled?: boolean;
  onMonthActivate: (monthStart: string) => void;
};

export default function CalendarMonthPreview({
  monthStart,
  selectedDate,
  events,
  unavailableDates,
  disabled = false,
  onMonthActivate,
}: CalendarMonthPreviewProps) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
  }).format(toLocalDate(monthStart));

  const days = getPreviewDays(monthStart);
  const todayIso = toIsoDate(new Date());

  return (
    <section
      className={[
        "month-preview",
        disabled ? "month-preview--disabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => {
        if (disabled) return;
        onMonthActivate(monthStart);
      }}
      aria-disabled={disabled}
    >
      <div className="month-preview__header">
        <strong>{label}</strong>
      </div>

      <div className="month-preview__grid">
        {days.map((date) => {
          const isUnavailable = unavailableDates.includes(date) || date < todayIso;
          const hasEvents = events.some((event) => event.date === date);

          return (
            <span key={date} className="month-preview__day">
              <CalendarDateCell
                date={date}
                variant="preview"
                isSelected={selectedDate === date}
                isUnavailable={isUnavailable}
                hasEvents={hasEvents}
                isCurrentMonth
              />
            </span>
          );
        })}
      </div>
    </section>
  );
}