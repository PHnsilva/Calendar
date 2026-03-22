import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./query-client";
import { ThemeProvider } from "./theme-provider";
import { HomeBookingProvider } from "./home-booking-provider";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <HomeBookingProvider>{children}</HomeBookingProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}