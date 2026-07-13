type DayClassParams = {
  cellDate: string;
  isCurrentMonth: boolean;
  isDisabled: boolean;
  calendarDate: string | null;
  confirmedDate: string | null;
};

export function getBookingDayButtonClassName({
  cellDate,
  isCurrentMonth,
  isDisabled,
  calendarDate,
  confirmedDate,
}: DayClassParams): string {
  const isSelected = calendarDate === cellDate;
  const isConfirmedCurrentSelection = isSelected && confirmedDate === cellDate;

  return [
    "booking-day-picker__day",
    isCurrentMonth ? "" : "booking-day-picker__day--muted",
    isSelected ? "booking-day-picker__day--selected" : "",
    isConfirmedCurrentSelection ? "booking-day-picker__day--confirmed" : "",
    isDisabled ? "booking-day-picker__day--disabled" : "",
  ].filter(Boolean).join(" ");
}
