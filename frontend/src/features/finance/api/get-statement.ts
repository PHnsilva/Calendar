import { apiGet } from '../../../lib/api-client';
import { getStoredAdminToken } from '../../../lib/storage';
import type { AdminStatementResponse } from '../../../types/finance';

export async function getStatement(): Promise<AdminStatementResponse> {
  const adminToken = getStoredAdminToken();

  if (!adminToken) {
    throw new Error('Admin token missing');
  }

  return apiGet<AdminStatementResponse>('/api/admin/finance/statement', {
    adminToken,
  });
}
