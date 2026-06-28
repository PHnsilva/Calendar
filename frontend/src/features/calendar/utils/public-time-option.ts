import type { CalendarSlot } from "../types";

export function getPublicTimeOptionToneClass(index: number): string {
  if (index >= 7) return "wf-time-option--tone-red";
  if (index >= 5) return "wf-time-option--tone-orange";
  if (index >= 3) return "wf-time-option--tone-blue";
  return "wf-time-option--tone-green";
}

export function buildPublicTimeOptionClassName(slot: CalendarSlot, selectedTime: string, index: number): string {
  return [
    "wf-time-option",
    getPublicTimeOptionToneClass(index),
    selectedTime === slot.startTime ? "is-active" : "",
  ].filter(Boolean).join(" ");
}
