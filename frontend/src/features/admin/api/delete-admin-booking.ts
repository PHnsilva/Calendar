import { apiClient } from '../../../lib/api-client';
import { requireAdminSessionToken } from './admin-session';

export async function deleteAdminBooking(eventId: string): Promise<void> {
  await apiClient<void>(`/api/servicos/admin/${eventId}`, {
    method: 'DELETE',
    adminToken: requireAdminSessionToken(),
  });
}
