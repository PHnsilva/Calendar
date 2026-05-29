import { apiClient } from "../../../lib/api-client";
import { getStoredAdminToken } from "../../../lib/storage";
import type { ServicoResponse } from "../../../types/api";

export async function assignAdminProvider(eventId: string, providerId: string): Promise<ServicoResponse> {
  const adminToken = getStoredAdminToken();
  if (!adminToken) {
    throw new Error("Admin session missing");
  }

  return apiClient<ServicoResponse>(`/api/servicos/admin/${eventId}/assignee`, {
    method: "PUT",
    adminToken,
    body: { providerId },
  });
}
