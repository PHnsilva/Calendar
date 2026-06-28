import { apiClient } from "../../../lib/api-client";
import type { ServicoResponse } from "../../../types/api";
import { requireAdminSessionToken } from "./admin-session";

export async function assignAdminProvider(eventId: string, providerId: string): Promise<ServicoResponse> {
  return apiClient<ServicoResponse>(`/api/servicos/admin/${eventId}/assignee`, {
    method: "PUT",
    adminToken: requireAdminSessionToken(),
    body: { providerId },
  });
}
