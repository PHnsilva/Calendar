import type { CalendarSlot, CalendarViewMode } from "../calendar/types";

export type HomeSelectedSlot = Pick<
  CalendarSlot,
  "date" | "startTime" | "endTime"
> | null;

export type HomeCalendarState = {
  selectedDate: string;
  selectedSlot: HomeSelectedSlot;
  currentMonth: string;
  currentView: CalendarViewMode;
  isBookingModalOpen: boolean;
};