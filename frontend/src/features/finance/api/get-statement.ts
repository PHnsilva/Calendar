import { apiGet } from "../../../lib/api-client";
import { getStoredAdminToken } from "../../../lib/storage";
import type { AdminStatementResponse } from "../../../types/finance";

const fallbackStatement: AdminStatementResponse = {
  items: [],
};

export async function getStatement(filters?: { from?: string; to?: string }): Promise<AdminStatementResponse> {
  const adminToken = getStoredAdminToken();

  if (!adminToken) {
    return fallbackStatement;
  }

  try {
    return await apiGet<AdminStatementResponse>("/api/admin/finance/statement", {
      adminToken,
      query: {
        from: filters?.from,
        to: filters?.to,
      },
    });
  } catch (error: any) {
    if (error?.status === 401 || error?.status === 403) {
      return fallbackStatement;
    }
    throw error;
  }
}

export default getStatement;
