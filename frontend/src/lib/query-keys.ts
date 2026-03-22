export const queryKeys = {
  availableSlots: (date: string) => ["available-slots", date] as const,
  adminBookings: ["admin", "bookings"] as const,
  adminSummary: (filtersKey: string) => ["admin", "summary", filtersKey] as const,
};
