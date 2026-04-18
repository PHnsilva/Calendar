import type { CityTone } from "../../../data/allowed-cities";

function toLocalDate(dateString: string): Date {
  return new Date(`${dateString}T12:00:00`);
}

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type CalendarDateCellProps = {
  date: string;
  isToday?: boolean;
  isSelected?: boolean;
  isUnavailable?: boolean;
  hasEvents?: boolean;
  isCurrentMonth?: boolean;
  isPast?: boolean;
  variant?: "big" | "preview" | "mini";
  tone?: CityTone | null;
};

export default function CalendarDateCell({
  date,
  isToday = false,
  isSelected = false,
  isUnavailable = false,
  hasEvents = false,
  isCurrentMonth = true,
  isPast = false,
  variant = "big",
  tone,
}: CalendarDateCellProps) {
  const numericLabel = toLocalDate(date).getDate();
  const label = String(numericLabel);

  return (
    <span
      className={cn(
        "calendar-date-cell",
        `calendar-date-cell--${variant}`,
        tone && `calendar-date-cell--tone-${tone}`,
        isToday && "calendar-date-cell--today",
        isSelected && "calendar-date-cell--selected",
        isUnavailable && "calendar-date-cell--unavailable",
        hasEvents && "calendar-date-cell--has-events",
        !isCurrentMonth && "calendar-date-cell--outside",
        isPast && "calendar-date-cell--past",
      )}
    >
      {label}
    </span>
  );
}
