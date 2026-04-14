import { apiGet } from '../../../lib/api-client';
import { getStoredAdminToken } from '../../../lib/storage';
import type { AdminFinanceHealthResponse } from '../../../types/finance';

export async function getFinanceHealth(): Promise<AdminFinanceHealthResponse> {
  const adminToken = getStoredAdminToken();

  if (!adminToken) {
    throw new Error('Admin token missing');
  }

  return apiGet<AdminFinanceHealthResponse>('/api/admin/finance/health', {
    adminToken,
  });
}
