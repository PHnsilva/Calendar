import { apiClient } from "../../../lib/api-client";

export function deleteBooking(eventId: string, token: string) {
  return apiClient<null>(`/api/servicos/me/${eventId}`, {
    method: "DELETE",
    query: { token },
  });
}
