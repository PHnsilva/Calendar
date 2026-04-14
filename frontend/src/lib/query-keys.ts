export const queryKeys = {
  geoapifyAutocomplete: (searchText: string, city: string) => ["geoapify-autocomplete", searchText.trim().toLowerCase(), city.trim().toLowerCase()] as const,
  publicBootstrap: ["public-bootstrap"] as const,
  availableSlots: (date: string, city = "", slotMinutes = 60, durationMinutes = slotMinutes) => ["available-slots", date, city.trim().toLowerCase(), slotMinutes, durationMinutes] as const,
  adminBookings: (filtersKey: string) => ["admin-bookings", filtersKey] as const,
  adminRoute: (eventId: string, originLat?: number, originLng?: number) => ["admin-route", eventId, originLat ?? null, originLng ?? null] as const,
};
