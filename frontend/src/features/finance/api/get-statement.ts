import { apiGet } from "../../../lib/api-client";
import { getStoredAdminToken } from "../../../lib/storage";
import type { AdminStatementResponse } from "../../../types/finance";

export async function getStatement(filters?: { from?: string; to?: string }): Promise<AdminStatementResponse> {
  const adminToken = getStoredAdminToken();

  if (!adminToken) {
    throw new Error("Admin token missing");
  }

  return apiGet<AdminStatementResponse>("/api/admin/finance/statement", {
    adminToken,
    query: {
      from: filters?.from,
      to: filters?.to,
    },
  });
}
