import type { ReactNode } from "react";
import { HomeBookingProvider } from "../home-booking-provider";
import { ThemeProvider } from "../theme-provider";
import { AuthProvider } from "./auth-provider";
import { QueryProvider } from "./query-provider";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <HomeBookingProvider>{children}</HomeBookingProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
