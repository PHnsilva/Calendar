export const queryKeys = {
  geoapifyAutocomplete: (searchText: string, city: string, cityConstraint = "") => ["geoapify-autocomplete", searchText.trim().toLowerCase(), city.trim().toLowerCase(), cityConstraint.trim().toLowerCase()] as const,
  publicBootstrap: ["public-bootstrap"] as const,
  availableSlots: (date: string, city = "", slotMinutes = 60, durationMinutes = slotMinutes) => ["available-slots", date, city.trim().toLowerCase(), slotMinutes, durationMinutes] as const,
  adminBookings: (filtersKey: string) => ["admin-bookings", filtersKey] as const,
  adminHistory: (filtersKey: string) => ["admin-history", filtersKey] as const,
  adminBooking: (eventId: string) => ["admin-booking", eventId] as const,
  adminSummary: (filtersKey: string) => ["admin-summary", filtersKey] as const,
  adminBlocks: (filtersKey: string) => ["admin-blocks", filtersKey] as const,
  adminRoute: (eventId: string, originLat?: number, originLng?: number) => ["admin-route", eventId, originLat ?? null, originLng ?? null] as const,
  locationPreview: (addressLine: string, city: string) => ["location-preview", addressLine.trim().toLowerCase(), city.trim().toLowerCase()] as const,
};
