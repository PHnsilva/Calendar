function normalizeQueryPart(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export const queryKeys = {
  geoapifyAutocomplete: (searchText: string, city: string) => [
    "geoapify-autocomplete",
    normalizeQueryPart(searchText),
    normalizeQueryPart(city),
  ] as const,
  publicBootstrap: ["public-bootstrap"] as const,
  availableSlots: (date: string, city: unknown, slotMinutes = 60) => [
    "available-slots",
    date,
    normalizeQueryPart(city),
    slotMinutes,
  ] as const,
  adminBookings: (filtersKey: string) => ["admin-bookings", filtersKey] as const,
  adminRoute: (eventId: string, originLat?: number, originLng?: number) => [
    "admin-route",
    eventId,
    originLat ?? null,
    originLng ?? null,
  ] as const,
};
