import { apiClient } from "../../../lib/api-client";
import type { PublicBookingResponse } from "../../../types/api";

export function lookupPublicBookings(phone: string) {
  return apiClient<PublicBookingResponse[]>("/api/servicos/public/lookup", {
    method: "POST",
    body: { phone },
  });
}

export function cancelPublicBooking(eventId: string, phone: string) {
  return apiClient<PublicBookingResponse>("/api/servicos/public/cancel", {
    method: "POST",
    body: { eventId, phone },
  });
}
