import { apiClient } from "../../../lib/api-client";
import { getStoredAdminToken } from "../../../lib/storage";
import type { ServicoRequest, ServicoResponse } from "../../../types/api";

export async function updateAdminBooking(eventId: string, payload: ServicoRequest): Promise<ServicoResponse> {
  const adminToken = getStoredAdminToken();
  if (!adminToken) {
    throw new Error("Admin session missing");
  }

  return apiClient<ServicoResponse>(`/api/servicos/admin/${eventId}`, {
    method: "PUT",
    adminToken,
    body: payload,
  });
}
