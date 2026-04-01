import { apiGet } from "../../../lib/api-client";
import { getStoredAdminToken } from "../../../lib/storage";
import type { ServicoResponse } from "../../../types/api";
import type { AdminFilters } from "../types";

export async function getAdminBookings(filters: AdminFilters = {}): Promise<ServicoResponse[]> {
  const adminToken = getStoredAdminToken();

  if (!adminToken) {
    throw new Error("Admin token missing");
  }

  return apiGet<ServicoResponse[]>("/api/servicos/admin", {
    adminToken,
    query: {
      from: filters.from,
      to: filters.to,
      status: filters.status,
      city: filters.city,
    },
  });
}
