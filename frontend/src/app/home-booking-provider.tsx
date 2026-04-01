import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type HomeBookingContextValue = {
  quickBookingRequestId: number;
  openBookingsRequestId: number;
  requestQuickBooking: () => void;
  requestOpenBookings: () => void;
};

const HomeBookingContext = createContext<HomeBookingContextValue | null>(null);

type HomeBookingProviderProps = {
  children: ReactNode;
};

export function HomeBookingProvider({ children }: HomeBookingProviderProps) {
  const [quickBookingRequestId, setQuickBookingRequestId] = useState(0);
  const [openBookingsRequestId, setOpenBookingsRequestId] = useState(0);

  const requestQuickBooking = useCallback(() => {
    setQuickBookingRequestId((current) => current + 1);
  }, []);

  const requestOpenBookings = useCallback(() => {
    setOpenBookingsRequestId((current) => current + 1);
  }, []);

  const value = useMemo<HomeBookingContextValue>(
    () => ({
      quickBookingRequestId,
      openBookingsRequestId,
      requestQuickBooking,
      requestOpenBookings,
    }),
    [quickBookingRequestId, openBookingsRequestId, requestQuickBooking, requestOpenBookings],
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
