export const queryKeys = {
  geoapifyAutocomplete: (searchText: string, city: string) => ["geoapify-autocomplete", searchText.trim().toLowerCase(), city.trim().toLowerCase()] as const,
  publicBootstrap: ["public-bootstrap"] as const,
  availableSlots: (date: string, slotMinutes = 60) => ["available-slots", date, slotMinutes] as const,
  adminBookings: (filtersKey: string) => ["admin-bookings", filtersKey] as const,
  adminRoute: (eventId: string, originLat?: number, originLng?: number) => ["admin-route", eventId, originLat ?? null, originLng ?? null] as const,
};
