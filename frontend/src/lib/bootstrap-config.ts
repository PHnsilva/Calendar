import type { PublicBootstrapResponse } from "../types/api";

export const FALLBACK_ALLOWED_CITIES = [
  "Itabirito",
  "Ouro Preto",
  "Moeda",
  "Belo Horizonte",
  "Nova Lima",
  "Congonhas",
  "Rio Acima",
] as const;

export const FALLBACK_ALLOWED_STATES = ["MG"] as const;

const FALLBACK_CITY_DURATIONS: Record<string, number> = {
  Itabirito: 60,
  "Rio Acima": 180,
  "Nova Lima": 180,
  "Ouro Preto": 240,
  "Belo Horizonte": 240,
  Congonhas: 240,
  Moeda: 240,
};

type Bootstrap = PublicBootstrapResponse | null | undefined;

function unique(values: string[]): string[] {
  return Array.from(new Set((values ?? []).map((value) => String(value).trim()).filter(Boolean)));
}

function sortCities(values: string[]): string[] {
  const preferred = ["Itabirito", "Belo Horizonte"];
  return [...values].sort((left, right) => {
    const leftIndex = preferred.indexOf(left);
    const rightIndex = preferred.indexOf(right);
    const normalizedLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
    const normalizedRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

    if (normalizedLeft !== normalizedRight) return normalizedLeft - normalizedRight;
    return left.localeCompare(right, "pt-BR");
  });
}

function toMinutes(time: string): number {
  const [hours, minutes] = String(time ?? "00:00").split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
}

function toTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${`${hours}`.padStart(2, "0")}:${`${minutes}`.padStart(2, "0")}`;
}

export function getAllowedCities(bootstrap?: Bootstrap): string[] {
  const values = unique(bootstrap?.serviceArea?.allowedCities ?? []);
  const cities = values.length > 0 ? values : [...FALLBACK_ALLOWED_CITIES];
  return sortCities(cities);
}

export function getAllowedStates(bootstrap?: Bootstrap): string[] {
  const values = unique(bootstrap?.serviceArea?.allowedStates ?? []);
  return values.length > 0 ? values : [...FALLBACK_ALLOWED_STATES];
}

export function getDefaultCity(bootstrap?: Bootstrap): string {
  return getAllowedCities(bootstrap)[0] ?? FALLBACK_ALLOWED_CITIES[0];
}

export function getDefaultState(bootstrap?: Bootstrap): string {
  return getAllowedStates(bootstrap)[0] ?? FALLBACK_ALLOWED_STATES[0];
}

export function getScheduleTimeOptions(bootstrap?: Bootstrap): string[] {
  const slotMinutes = bootstrap?.booking?.slotMinutes ?? 60;
  const workStart = bootstrap?.schedule?.workStart ?? "08:00";
  const workEnd = bootstrap?.schedule?.workEnd ?? "18:00";
  const lunchStart = bootstrap?.schedule?.lunchStart ?? "12:00";
  const lunchEnd = bootstrap?.schedule?.lunchEnd ?? "13:00";

  const start = toMinutes(workStart);
  const end = toMinutes(workEnd);
  const lunchStartMinutes = toMinutes(lunchStart);
  const lunchEndMinutes = toMinutes(lunchEnd);
  const values: string[] = [];

  for (let current = start; current + slotMinutes <= end; current += slotMinutes) {
    const overlapsLunch = current < lunchEndMinutes && current + slotMinutes > lunchStartMinutes;
    if (overlapsLunch) continue;
    values.push(toTime(current));
  }

  return values;
}

export function getBookingDurationMinutesByCity(bootstrap?: Bootstrap): Record<string, number> {
  const configured = bootstrap?.booking?.durationMinutesByCity;
  return configured && Object.keys(configured).length > 0 ? configured : FALLBACK_CITY_DURATIONS;
}

export function getBookingDurationMinutes(city: string, bootstrap?: Bootstrap): number {
  const values = getBookingDurationMinutesByCity(bootstrap);
  return values[String(city ?? "").trim()] ?? bootstrap?.booking?.defaultDurationMinutes ?? 60;
}

export function formatDurationLabel(durationMinutes: number): string {
  const hours = durationMinutes / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1).replace(".", ",")}h`;
}
