import { apiGet } from "../../../lib/api-client";
import type { ServicoResponse } from "../../../types/api";

export function getMyBookings(token: string) {
  return apiGet<ServicoResponse[]>("/api/servicos/my", {
    query: { token },
  });
}
