function pad(value: number): string {
  return `${value}`.padStart(2, "0");
}

function parseDateInput(value: Date | string): Date {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  const normalized = value.length <= 10 ? `${value}T12:00:00` : value;
  return new Date(normalized);
}

const DEFAULT_BUSINESS_TIME_ZONE = "America/Sao_Paulo";

export type DateTimeParts = {
  date: string;
  time: string;
};

export function toBusinessDateTimeParts(
  value: Date | string,
  timeZone = DEFAULT_BUSINESS_TIME_ZONE,
): DateTimeParts {
  if (typeof value === "string") {
    const localDateTime = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?$/);
    if (localDateTime) {
      return { date: localDateTime[1], time: localDateTime[2] };
    }
  }

  const date = parseDateInput(value);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";

  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

function parseMonthInput(value: Date | string): { year: number; month: number } {
  if (value instanceof Date) {
    return { year: value.getFullYear(), month: value.getMonth() };
  }

  const date = parseDateInput(value.length === 7 ? `${value}-01` : value);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function getTodayIso(): string {
  return toIsoDatePart(new Date());
}

export function toIsoDatePart(value: Date | string): string {
  const date = parseDateInput(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toIsoDate(value: Date | string): string {
  return toIsoDatePart(value);
}

export function toLocalDate(value: Date | string): Date {
  return parseDateInput(value);
}

export function isDateBeforeToday(value: Date | string): boolean {
  return toIsoDatePart(value) < getTodayIso();
}

export function isPastIsoDate(value: string): boolean {
  return isDateBeforeToday(value);
}

export function isBookableDate(value: Date | string): boolean {
  return toIsoDatePart(value) > getTodayIso();
}

export function isBookableIsoDate(value: string): boolean {
  return isBookableDate(value);
}

export function isBookableDateInMonth(
  dateValue: Date | string,
  monthValue: Date | string,
  allowedMonthSpan = 1,
): boolean {
  if (!isBookableDate(dateValue)) {
    return false;
  }

  const targetDate = parseDateInput(dateValue);
  const targetMonthIndex = targetDate.getFullYear() * 12 + targetDate.getMonth();
  const { year, month } = parseMonthInput(monthValue);
  const baseMonthIndex = year * 12 + month;

  return targetMonthIndex >= baseMonthIndex && targetMonthIndex <= baseMonthIndex + allowedMonthSpan;
}

export function isDateBlocked(
  value: Date | string,
  unavailableDates: string[] = [],
): boolean {
  return unavailableDates.includes(toIsoDatePart(value));
}

export function formatDate(value: Date | string): string {
  const date = parseDateInput(value);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: Date | string): string {
  const date = parseDateInput(value);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function isWithinHours(value: Date | string, hours: number): boolean {
  const date = parseDateInput(value);
  return date.getTime() - Date.now() < hours * 60 * 60 * 1000;
}

export function isWithinTwoHours(value: Date | string): boolean {
  return isWithinHours(value, 2);
}

export function isWithinTwelveHours(value: Date | string): boolean {
  return isWithinHours(value, 12);
}
