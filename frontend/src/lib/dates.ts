function toLocalDateInternal(dateString: string): Date {
  return new Date(`${dateString}T12:00:00`);
}

function toIsoDateInternal(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayIso(): string {
  return toIsoDateInternal(new Date());
}

export function isDateBeforeToday(dateString: string): boolean {
  return Boolean(dateString) && dateString < getTodayIso();
}

export function isPastIsoDate(dateString: string, todayIso = getTodayIso()): boolean {
  return Boolean(dateString) && dateString < todayIso;
}

export function isBookableDate(dateString: string): boolean {
  return Boolean(dateString) && !isDateBeforeToday(dateString);
}

export function isBookableIsoDate(dateString: string, todayIso = getTodayIso()): boolean {
  return Boolean(dateString) && dateString >= todayIso;
}

export function isDateBlocked(dateString: string, unavailableDates: string[]): boolean {
  return isDateBeforeToday(dateString) || unavailableDates.includes(dateString);
}

export const toIsoDate = toIsoDateInternal;
export const toLocalDate = toLocalDateInternal;
export const toIsoDatePart = toIsoDateInternal;
