import { apiGet } from "../../../lib/api-client";
import { getStoredAdminToken } from "../../../lib/storage";
import type { AdminHealthResponse } from "../../../types/finance";

export async function getFinanceHealth(): Promise<AdminHealthResponse> {
  const adminToken = getStoredAdminToken();

  if (!adminToken) {
    throw new Error("Admin token missing");
  }

  return apiGet<AdminHealthResponse>("/api/admin/finance/health", {
    adminToken,
  });
}
