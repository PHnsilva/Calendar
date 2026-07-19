import { apiClient } from '../../../lib/api-client';
import type { ServicoResponse } from '../../../types/api';
import { requireAdminSessionToken } from './admin-session';

export async function getAdminBooking(eventId: string, signal?: AbortSignal): Promise<ServicoResponse> {
  return apiClient<ServicoResponse>(`/api/servicos/admin/${encodeURIComponent(eventId)}`, {
    method: 'GET',
    adminToken: requireAdminSessionToken(),
    signal,
  });
}
