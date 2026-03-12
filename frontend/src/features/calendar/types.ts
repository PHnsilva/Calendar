export type CalendarViewMode = "month" | "week" | "day";

export type CalendarEventStatus = "booked" | "blocked" | "completed";

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  city?: string;
  customerName?: string;
  status?: CalendarEventStatus;
};

export type CalendarSlot = {
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
  label: string;
};

export type CalendarLegendKind =
  | "available"
  | "unavailable"
  | "selected"
  | "today"
  | "booked";