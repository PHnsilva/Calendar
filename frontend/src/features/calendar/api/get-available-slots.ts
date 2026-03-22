import { apiGet } from "../../../lib/api-client";
import type { CalendarSlot } from "../types";

function pad(value: number): string {
  return `${value}`.padStart(2, "0");
}

function addHour(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  return `${pad(hours + 1)}:${pad(minutes)}`;
}

function extractTime(isoDateTime: string): string {
  const match = isoDateTime.match(/T(\d{2}:\d{2})/);
  if (match) {
    return match[1];
  }

  const date = new Date(isoDateTime);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export async function getAvailableSlots(date: string): Promise<CalendarSlot[]> {
  const response = await apiGet<string[]>("/api/servicos/available", {
    query: {
      date,
      slotMinutes: 60,
    },
  });

  return response
    .map((isoDateTime) => {
      const startTime = extractTime(isoDateTime);
      const endTime = addHour(startTime);

      return {
        date,
        startTime,
        endTime,
        available: true,
        label: `${startTime} - ${endTime}`,
      } satisfies CalendarSlot;
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}
