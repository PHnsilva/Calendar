import { apiGet } from "../../../lib/api-client";
import { getStoredAdminToken } from "../../../lib/storage";
import type { ServicoResponse } from "../../../types/booking";

export async function getAdminBookings(): Promise<ServicoResponse[]> {
  const adminToken = getStoredAdminToken();

  if (!adminToken) {
    throw new Error("Admin token missing");
  }

  return apiGet<ServicoResponse[]>("/api/servicos/admin", {
    adminToken,
  });
}
