import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CalendarEvent } from "../features/calendar/types";

type HomeBookingContextValue = {
  quickBookingRequestId: number;
  openBookingsRequestId: number;
  openProfileRequestId: number;
  lastCreatedBooking: CalendarEvent | null;
  requestQuickBooking: () => void;
  requestOpenBookings: () => void;
  requestOpenProfile: () => void;
  registerCreatedBooking: (event: CalendarEvent) => void;
};

const HomeBookingContext = createContext<HomeBookingContextValue | null>(null);

type HomeBookingProviderProps = {
  children: ReactNode;
};

export function HomeBookingProvider({ children }: HomeBookingProviderProps) {
  const [quickBookingRequestId, setQuickBookingRequestId] = useState(0);
  const [openBookingsRequestId, setOpenBookingsRequestId] = useState(0);
  const [openProfileRequestId, setOpenProfileRequestId] = useState(0);
  const [lastCreatedBooking, setLastCreatedBooking] = useState<CalendarEvent | null>(null);

  const requestQuickBooking = useCallback(() => {
    setQuickBookingRequestId((current) => current + 1);
  }, []);

  const requestOpenBookings = useCallback(() => {
    setOpenBookingsRequestId((current) => current + 1);
  }, []);

  const requestOpenProfile = useCallback(() => {
    setOpenProfileRequestId((current) => current + 1);
  }, []);

  const registerCreatedBooking = useCallback((event: CalendarEvent) => {
    setLastCreatedBooking(event);
  }, []);

  const value = useMemo<HomeBookingContextValue>(
    () => ({
      quickBookingRequestId,
      openBookingsRequestId,
      openProfileRequestId,
      lastCreatedBooking,
      requestQuickBooking,
      requestOpenBookings,
      requestOpenProfile,
      registerCreatedBooking,
    }),
    [
      quickBookingRequestId,
      openBookingsRequestId,
      openProfileRequestId,
      lastCreatedBooking,
      requestQuickBooking,
      requestOpenBookings,
      requestOpenProfile,
      registerCreatedBooking,
    ],
  );

  return (
    <HomeBookingContext.Provider value={value}>
      {children}
    </HomeBookingContext.Provider>
  );
}

export function useHomeBookingSelection() {
  const context = useContext(HomeBookingContext);

  if (!context) {
    throw new Error(
      "useHomeBookingSelection must be used inside HomeBookingProvider.",
    );
  }

  return context;
}
