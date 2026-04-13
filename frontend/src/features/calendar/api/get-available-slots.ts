import { apiClient } from "../../../lib/api-client";
import { isBookableDate } from "../../../lib/dates";
import type { CalendarSlot } from "../types";

type AvailableSlotLike =
  | string
  | {
      date?: string;
      start?: string;
      end?: string;
      startTime?: string;
      endTime?: string;
      startDateTime?: string;
      endDateTime?: string;
      durationMinutes?: number;
      available?: boolean;
      isAvailable?: boolean;
    };

type AvailableResponseLike =
  | string[]
  | AvailableSlotLike[]
  | {
      slots?: AvailableSlotLike[];
      availableSlots?: AvailableSlotLike[];
      data?: AvailableSlotLike[];
      items?: AvailableSlotLike[];
    };

function pad(value: number): string {
  return `${value}`.padStart(2, "0");
}

function addMinutes(time: string, minutesToAdd: number): string {
  const [hours, minutes] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const normalizedHours = Math.floor(totalMinutes / 60);
  const normalizedMinutes = totalMinutes % 60;
  return `${pad(normalizedHours)}:${pad(normalizedMinutes)}`;
}

function extractTime(value?: string): string | null {
  if (!value) return null;

  const directMatch = value.match(/(?:T|\s)(\d{2}:\d{2})(?::\d{2})?/);
  if (directMatch) return directMatch[1];

  if (/^\d{2}:\d{2}$/.test(value)) return value;
  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) return value.slice(0, 5);

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return null;

  return `${pad(parsedDate.getHours())}:${pad(parsedDate.getMinutes())}`;
}

function normalizeSlot(slot: AvailableSlotLike, date: string, slotMinutes: number): CalendarSlot | null {
  if (typeof slot === "string") {
    const startTime = extractTime(slot);
    if (!startTime) return null;

    return {
      date,
      startTime,
      endTime: addMinutes(startTime, slotMinutes),
      available: true,
      label: `${startTime} - ${addMinutes(startTime, slotMinutes)}`,
    };
  }

  const explicitlyUnavailable = slot.available === false || slot.isAvailable === false;
  if (explicitlyUnavailable) return null;

  const startTime =
    extractTime(slot.startTime) ??
    extractTime(slot.startDateTime) ??
    extractTime(slot.start);

  if (!startTime) return null;

  const endTime =
    extractTime(slot.endTime) ??
    extractTime(slot.endDateTime) ??
    extractTime(slot.end) ??
    addMinutes(startTime, slotMinutes);

  return {
    date: slot.date ?? date,
    startTime,
    endTime,
    available: true,
    label: `${startTime} - ${endTime}`,
  };
}

function toSlotArray(payload: AvailableResponseLike | null | undefined): AvailableSlotLike[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.availableSlots)) return payload.availableSlots;
  if (Array.isArray(payload.slots)) return payload.slots;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

export async function getAvailableSlots(date: string, city: string, slotMinutes = 60): Promise<CalendarSlot[]> {
  const normalizedCity = typeof city === "string" ? city.trim() : "";
  if (!isBookableDate(date) || !normalizedCity) return [];

  const response = await apiClient<AvailableResponseLike | null>("/api/servicos/available", {
    method: "GET",
    query: {
      date,
      city: normalizedCity,
      slotMinutes,
    },
  });

  return toSlotArray(response)
    .map((slot) => normalizeSlot(slot, date, slotMinutes))
    .filter((slot): slot is CalendarSlot => Boolean(slot))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}
