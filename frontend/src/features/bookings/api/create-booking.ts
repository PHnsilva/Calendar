import { apiClient } from "../../../lib/api-client";
import type { ServicoCreateResponse, ServicoRequest } from "../../../types/api";

export function createBooking(payload: ServicoRequest) {
  return apiClient<ServicoCreateResponse>("/api/servicos", {
    method: "POST",
    body: payload,
  });
}
