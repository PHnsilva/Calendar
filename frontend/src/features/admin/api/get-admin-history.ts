import { apiGet } from "../../../lib/api-client";
import type { ServicoResponse } from "../../../types/api";
import type { AdminFilters } from "../types";
import { requireAdminSessionToken } from "./admin-session";

export async function getAdminHistory(filters: AdminFilters = {}, signal?: AbortSignal): Promise<ServicoResponse[]> {
  return apiGet<ServicoResponse[]>("/api/servicos/admin/history", {
    adminToken: requireAdminSessionToken(),
    query: {
      from: filters.from,
      to: filters.to,
      status: filters.status,
      city: filters.city,
    },
    signal,
  });
}
