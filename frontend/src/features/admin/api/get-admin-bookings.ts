import { apiGet } from "../../../lib/api-client";
import type { ServicoResponse } from "../../../types/api";
import type { AdminFilters } from "../types";
import { requireAdminSessionToken } from "./admin-session";

export async function getAdminBookings(filters: AdminFilters = {}, signal?: AbortSignal): Promise<ServicoResponse[]> {
  return apiGet<ServicoResponse[]>("/api/servicos/admin", {
    adminToken: requireAdminSessionToken(),
    signal,
    query: {
      from: filters.from,
      to: filters.to,
      status: filters.status,
      city: filters.city,
    },
  });
}
