import { apiGet } from "../../../lib/api-client";
import { getStoredAdminToken } from "../../../lib/storage";
import type { AdminHealthResponse } from "../../../types/finance";

const fallbackHealth: AdminHealthResponse = {
  ok: false,
  provider: "mock",
  message: "Sem autorização para consultar o extrato real. Exibindo modo de demonstração.",
};

export async function getFinanceHealth(): Promise<AdminHealthResponse> {
  const adminToken = getStoredAdminToken();

  if (!adminToken) {
    return fallbackHealth;
  }

  try {
    return await apiGet<AdminHealthResponse>("/api/admin/finance/health", {
      adminToken,
    });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return fallbackHealth;
    }
    throw error;
  }
}

export default getFinanceHealth;
