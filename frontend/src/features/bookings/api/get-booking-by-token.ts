import { apiGet } from "../../../lib/api-client";
import type { ServicoResponse } from "../../../types/api";

export function getBookingByToken(token: string) {
  return apiGet<ServicoResponse>("/api/servicos/me", {
    query: { token },
  });
}
