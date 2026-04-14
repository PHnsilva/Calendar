import { apiClient } from "../../../lib/api-client";
import type { ServicoRequest, ServicoResponse } from "../../../types/api";

export function updateBooking(input: { eventId: string; token: string; payload: ServicoRequest }) {
  return apiClient<ServicoResponse>(`/api/servicos/me/${input.eventId}`, {
    method: "PUT",
    query: { token: input.token },
    body: input.payload,
  });
}
