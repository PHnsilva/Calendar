import { apiGet } from '../../../lib/api-client';
import { getStoredAdminToken } from '../../../lib/storage';
import type { AdminFinanceConfigResponse } from '../../../types/finance';

export async function getFinanceConfig(): Promise<AdminFinanceConfigResponse> {
  const adminToken = getStoredAdminToken();

  if (!adminToken) {
    throw new Error('Admin token missing');
  }

  return apiGet<AdminFinanceConfigResponse>('/api/admin/finance/config', {
    adminToken,
  });
}
