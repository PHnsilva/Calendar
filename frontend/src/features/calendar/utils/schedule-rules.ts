export const DEFAULT_4X4_CYCLE_START = "2026-05-16";

const DAY_MS = 24 * 60 * 60 * 1000;

function toLocalDate(dateString: string): Date {
  return new Date(`${dateString}T12:00:00`);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveCycleStart(cycleStart?: string | null): string {
  return cycleStart?.trim() || DEFAULT_4X4_CYCLE_START;
}

export function is4x4UnavailableDate(dateString: string, cycleStart?: string | null): boolean {
  const date = toLocalDate(dateString);
  const anchorDate = toLocalDate(resolveCycleStart(cycleStart));
  const diffInDays = Math.floor((date.getTime() - anchorDate.getTime()) / DAY_MS);
  const normalized = ((diffInDays % 8) + 8) % 8;
  return normalized >= 4;
}

export function build4x4UnavailableDates(monthStart: string, cycleStart?: string | null): string[] {
  const reference = toLocalDate(monthStart);
  const daysInMonth = new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(reference.getFullYear(), reference.getMonth(), index + 1);
    return toIsoDate(date);
  }).filter((date) => is4x4UnavailableDate(date, cycleStart));
}
