import { apiClient } from "../../../lib/api-client";
import type { ServicoResponse } from "../../../types/api";

export function getBookingByToken(token: string) {
  return apiClient<ServicoResponse>("/api/servicos/me", {
    method: "GET",
    query: { token },
  });
}
