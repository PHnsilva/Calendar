function toLocalDate(dateString: string): Date {
  return new Date(`${dateString}T12:00:00`);
}

function cn(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

type CalendarDateCellProps = {
  date: string;
  isToday?: boolean;
  isSelected?: boolean;
  isUnavailable?: boolean;
  hasEvents?: boolean;
  isCurrentMonth?: boolean;
  variant?: "big" | "mini";
};

export default function CalendarDateCell({
  date,
  isToday = false,
  isSelected = false,
  isUnavailable = false,
  hasEvents = false,
  isCurrentMonth = true,
  variant = "big",
}: CalendarDateCellProps) {
  const label = toLocalDate(date).getDate();

  return (
    <span
      className={cn(
        "calendar-date-cell",
        `calendar-date-cell--${variant}`,
        isToday && "calendar-date-cell--today",
        isSelected && "calendar-date-cell--selected",
        isUnavailable && "calendar-date-cell--unavailable",
        hasEvents && "calendar-date-cell--has-events",
        !isCurrentMonth && "calendar-date-cell--outside",
      )}
      aria-hidden="true"
    >
      <span className="calendar-date-cell__label">{label}</span>
    </span>
  );
}