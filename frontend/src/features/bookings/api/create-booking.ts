import { apiPost } from "../../../lib/api-client";
import type { ServicoCreateResponse, ServicoRequest } from "../../../types/api";

export function createBooking(payload: ServicoRequest) {
  return apiPost<ServicoCreateResponse>("/api/servicos", payload);
}
