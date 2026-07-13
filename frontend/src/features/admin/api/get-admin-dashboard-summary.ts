import { apiGet } from '../../../lib/api-client';
import type { AdminDashboardSummaryResponse } from '../../../types/api';
import type { AdminFilters } from '../types';
import { requireAdminSessionToken } from './admin-session';

export async function getAdminDashboardSummary(filters: Pick<AdminFilters, 'from' | 'to' | 'status' | 'city'>): Promise<AdminDashboardSummaryResponse> {
  return apiGet<AdminDashboardSummaryResponse>('/api/admin/dashboard/summary', {
    adminToken: requireAdminSessionToken(),
    query: {
      from: filters.from,
      to: filters.to,
      status: filters.status,
      city: filters.city,
    },
  });
}
