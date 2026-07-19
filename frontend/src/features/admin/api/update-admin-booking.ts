import { apiClient } from "../../../lib/api-client";
import type { AdminServicoUpdateRequest, ServicoResponse } from "../../../types/api";
import { requireAdminSessionToken } from "./admin-session";

export async function updateAdminBooking(eventId: string, payload: AdminServicoUpdateRequest): Promise<ServicoResponse> {
  return apiClient<ServicoResponse>(`/api/servicos/admin/${encodeURIComponent(eventId)}`, {
    method: "PUT",
    adminToken: requireAdminSessionToken(),
    body: payload,
  });
}
