import { apiClient } from "../../../lib/api-client";
import type { ServicoRequest, ServicoResponse } from "../../../types/api";
import { requireAdminSessionToken } from "./admin-session";

export async function updateAdminBooking(eventId: string, payload: ServicoRequest): Promise<ServicoResponse> {
  return apiClient<ServicoResponse>(`/api/servicos/admin/${eventId}`, {
    method: "PUT",
    adminToken: requireAdminSessionToken(),
    body: payload,
  });
}
