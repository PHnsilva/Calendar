import { apiClient } from "../../../lib/api-client";
import type { ServicoRequest, ServicoResponse } from "../../../types/api";

export function updateBooking(eventId: string, token: string, payload: ServicoRequest) {
  return apiClient<ServicoResponse>(`/api/servicos/me/${eventId}`, {
    method: "PUT",
    query: { token },
    body: payload,
  });
}
