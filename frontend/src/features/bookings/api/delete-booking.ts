import { apiClient } from "../../../lib/api-client";

export function deleteBooking(input: { eventId: string; token: string }) {
  return apiClient<void>(`/api/servicos/me/${input.eventId}`, {
    method: "DELETE",
    query: { token: input.token },
  });
}
