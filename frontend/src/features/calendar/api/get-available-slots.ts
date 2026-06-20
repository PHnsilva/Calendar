import { ApiError, apiClient } from "../../../lib/api-client";
import { getAvailabilityErrorMessage } from "../../../lib/api-error-messages";
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
  return `${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}`;
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

function toSlotArray(payload: AvailableResponseLike | null | undefined): AvailableSlotLike[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.availableSlots)) return payload.availableSlots;
  if (Array.isArray(payload.slots)) return payload.slots;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
}

function normalizeSlot(slot: AvailableSlotLike, date: string, durationMinutes: number): CalendarSlot | null {
  if (typeof slot === "string") {
    const startTime = extractTime(slot);
    if (!startTime) return null;
    const endTime = addMinutes(startTime, durationMinutes);
    return { date, startTime, endTime, available: true, label: `${startTime} - ${endTime}` };
  }

  if (slot.available === false || slot.isAvailable === false) return null;

  const startTime = extractTime(slot.startTime) ?? extractTime(slot.startDateTime) ?? extractTime(slot.start);
  if (!startTime) return null;
  const endTime = extractTime(slot.endTime) ?? extractTime(slot.endDateTime) ?? extractTime(slot.end) ?? addMinutes(startTime, durationMinutes);

  return {
    date: slot.date ?? date,
    startTime,
    endTime,
    available: true,
    label: `${startTime} - ${endTime}`,
  };
}

export async function getAvailableSlots(date: string, city = "", slotMinutes = 60, durationMinutes = slotMinutes): Promise<CalendarSlot[]> {
  let response: AvailableResponseLike | null;
  try {
    response = await apiClient<AvailableResponseLike | null>("/api/servicos/available", {
      method: "GET",
      query: {
        date,
        city: city.trim() || undefined,
        slotMinutes,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw new ApiError(getAvailabilityErrorMessage(error), error.status, error.payload, {
        code: error.code,
        method: error.method,
        url: error.url,
      });
    }
    throw error;
  }

  return toSlotArray(response)
    .map((slot) => normalizeSlot(slot, date, durationMinutes))
    .filter((slot): slot is CalendarSlot => Boolean(slot))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}
