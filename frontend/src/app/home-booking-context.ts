import { createContext, useContext } from 'react';
import type { CalendarEvent } from '../features/calendar/types';

export type HomeBookingContextValue = {
  quickBookingRequestId: number;
  openBookingsRequestId: number;
  openProfileRequestId: number;
  lastCreatedBooking: CalendarEvent | null;
  requestQuickBooking: () => void;
  requestOpenBookings: () => void;
  requestOpenProfile: () => void;
  registerCreatedBooking: (event: CalendarEvent) => void;
};

export const HomeBookingContext = createContext<HomeBookingContextValue | null>(null);

export function useHomeBookingSelection() {
  const context = useContext(HomeBookingContext);

  if (!context) {
    throw new Error('useHomeBookingSelection must be used inside HomeBookingProvider.');
  }

  return context;
}
