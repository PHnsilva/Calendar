function toLocalDate(dateString: string): Date {
  return new Date(`${dateString}T12:00:00`);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayIso(): string {
  return toIsoDate(new Date());
}

export function isDateBeforeToday(dateString: string): boolean {
  return dateString < getTodayIso();
}

export function isBookableDate(dateString: string): boolean {
  return Boolean(dateString) && !isDateBeforeToday(dateString);
}

export { toIsoDate, toLocalDate };
