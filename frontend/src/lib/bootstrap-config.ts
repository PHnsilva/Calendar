import { ALLOWED_CITIES } from "../data/allowed-cities";
import type { PublicBootstrapResponse } from "../types/api";

const FALLBACK_ALLOWED_STATES = ["MG"] as const;
const FALLBACK_SLOT_MINUTES = 60;
const FALLBACK_DURATION_BY_CITY: Record<string, number> = {
  Itabirito: 60,
  "Ouro Preto": 240,
  Moeda: 240,
  "Belo Horizonte": 240,
  "Nova Lima": 240,
};

function normalizeArray(values?: string[] | null): string[] {
  return (values ?? []).map((value) => value.trim()).filter(Boolean);
}

function normalizeDurationMap(durationByCity?: Record<string, number> | null): Record<string, number> {
  return Object.entries(durationByCity ?? {}).reduce<Record<string, number>>((acc, [city, minutes]) => {
    if (!city.trim()) return acc;
    const normalizedMinutes = Number(minutes);
    if (!Number.isFinite(normalizedMinutes) || normalizedMinutes <= 0) return acc;
    acc[city.trim()] = normalizedMinutes;
    return acc;
  }, {});
}

export function getAllowedCities(bootstrap?: PublicBootstrapResponse | null): string[] {
  const fromBootstrap = normalizeArray(bootstrap?.serviceArea?.allowedCities);
  return fromBootstrap.length > 0 ? fromBootstrap : [...ALLOWED_CITIES];
}

export function getAllowedStates(bootstrap?: PublicBootstrapResponse | null): string[] {
  const fromBootstrap = normalizeArray(bootstrap?.serviceArea?.allowedStates);
  return fromBootstrap.length > 0 ? fromBootstrap : [...FALLBACK_ALLOWED_STATES];
}

export function getDefaultCity(bootstrap?: PublicBootstrapResponse | null): string {
  return getAllowedCities(bootstrap)[0] ?? ALLOWED_CITIES[0];
}

export function getDefaultState(bootstrap?: PublicBootstrapResponse | null): string {
  return getAllowedStates(bootstrap)[0] ?? FALLBACK_ALLOWED_STATES[0];
}

export function getSlotMinutes(bootstrap?: PublicBootstrapResponse | null): number {
  const slotMinutes = Number(bootstrap?.booking?.slotMinutes ?? FALLBACK_SLOT_MINUTES);
  return Number.isFinite(slotMinutes) && slotMinutes > 0 ? slotMinutes : FALLBACK_SLOT_MINUTES;
}

export function getMaxFutureMonthsAhead(bootstrap?: PublicBootstrapResponse | null): number {
  const months = Number(bootstrap?.booking?.maxFutureMonthsAhead ?? 1);
  if (!Number.isFinite(months)) return 1;
  return Math.max(0, Math.floor(months));
}

export function getScheduleTimeOptions(bootstrap?: PublicBootstrapResponse | null): string[] {
  const schedule = bootstrap?.schedule;
  const slotMinutes = getSlotMinutes(bootstrap);
  if (!schedule?.workStart || !schedule?.workEnd) return [];

  const options: string[] = [];
  const [startHour, startMinute] = schedule.workStart.split(":").map(Number);
  const [endHour, endMinute] = schedule.workEnd.split(":").map(Number);
  const [lunchStartHour, lunchStartMinute] = (schedule.lunchStart ?? "").split(":").map(Number);
  const [lunchEndHour, lunchEndMinute] = (schedule.lunchEnd ?? "").split(":").map(Number);

  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  const lunchStart = Number.isFinite(lunchStartHour) ? lunchStartHour * 60 + lunchStartMinute : null;
  const lunchEnd = Number.isFinite(lunchEndHour) ? lunchEndHour * 60 + lunchEndMinute : null;

  for (let minutes = start; minutes + slotMinutes <= end; minutes += slotMinutes) {
    if (lunchStart != null && lunchEnd != null && minutes < lunchEnd && minutes + slotMinutes > lunchStart) {
      continue;
    }
    options.push(`${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`);
  }

  return options;
}

export function getBookingDurationMinutesByCity(bootstrap: PublicBootstrapResponse | null | undefined, city?: string | null): number {
  const durationByCity = { ...FALLBACK_DURATION_BY_CITY, ...normalizeDurationMap(bootstrap?.serviceArea?.durationByCity) };
  if (!city) return durationByCity[getDefaultCity(bootstrap)] ?? FALLBACK_SLOT_MINUTES;
  return durationByCity[city] ?? durationByCity[getDefaultCity(bootstrap)] ?? FALLBACK_SLOT_MINUTES;
}

export function getBookingDurationMinutes(bootstrap?: PublicBootstrapResponse | null): number {
  return getBookingDurationMinutesByCity(bootstrap, getDefaultCity(bootstrap));
}

export function formatDurationLabel(minutes: number): string {
  if (minutes <= 0) return "";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0 && remainingMinutes > 0) return `${hours}h${String(remainingMinutes).padStart(2, "0")}`;
  if (hours > 0) return `${hours}h`;
  return `${remainingMinutes} min`;
}
