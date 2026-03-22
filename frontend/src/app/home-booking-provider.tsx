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
  requestQuickBooking: () => void;
};

const HomeBookingContext = createContext<HomeBookingContextValue | null>(null);

type HomeBookingProviderProps = {
  children: ReactNode;
};

export function HomeBookingProvider({ children }: HomeBookingProviderProps) {
  const [quickBookingRequestId, setQuickBookingRequestId] = useState(0);

  const requestQuickBooking = useCallback(() => {
    setQuickBookingRequestId((current) => current + 1);
  }, []);

  const value = useMemo<HomeBookingContextValue>(
    () => ({
      quickBookingRequestId,
      requestQuickBooking,
    }),
    [quickBookingRequestId, requestQuickBooking],
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