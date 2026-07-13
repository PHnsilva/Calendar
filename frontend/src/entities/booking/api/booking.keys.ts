import type { BookingAdminFilters } from "../model/booking";

function normalizeTokenSet(tokens: readonly string[]): string[] {
  return [...new Set(tokens.map((token) => token.trim()).filter(Boolean))].sort();
}

function normalizeAdminFilters(filters: BookingAdminFilters) {
  return {
    from: filters.from?.trim() || null,
    to: filters.to?.trim() || null,
    status: filters.status?.trim() || null,
    city: filters.city?.trim() || null,
  };
}

export const bookingKeys = {
  all: ["bookings"] as const,
  details: () => [...bookingKeys.all, "detail"] as const,
  detail: (manageToken: string) => [...bookingKeys.details(), manageToken.trim()] as const,
  lists: () => [...bookingKeys.all, "list"] as const,
  // Legacy mutations invalidate this root; keep it stable during incremental migration.
  mine: (manageTokens: readonly string[]) => ["my-bookings", normalizeTokenSet(manageTokens)] as const,
  admin: (filters: BookingAdminFilters = {}) => [...bookingKeys.lists(), "admin", normalizeAdminFilters(filters)] as const,
};
