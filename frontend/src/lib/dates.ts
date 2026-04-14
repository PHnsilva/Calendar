export function getTodayIso(): string {
  const today = new Date();
  return toIsoDate(today);
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toLocalDate(dateString: string): Date {
  return new Date(`${dateString}T12:00:00`);
}

export function isDateBeforeToday(dateString?: string | null): boolean {
  if (!dateString) return false;
  return dateString < getTodayIso();
}

export function isBookableIsoDate(dateString?: string | null): boolean {
  if (!dateString) return false;
  return !isDateBeforeToday(dateString);
}

export function isBookableDate(dateString?: string | null): boolean {
  return isBookableIsoDate(dateString);
}

export function isBookableDateInMonth(dateString: string, monthStart: string): boolean {
  return dateString.startsWith(monthStart.slice(0, 7)) && isBookableIsoDate(dateString);
}
