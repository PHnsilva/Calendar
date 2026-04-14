import { apiClient } from '../../../lib/api-client';
import { getStoredAdminToken } from '../../../lib/storage';

export async function deleteAdminBooking(eventId: string): Promise<void> {
  const adminToken = getStoredAdminToken();

  if (!adminToken) {
    throw new Error('Admin token missing');
  }

  await apiClient<void>(`/api/servicos/admin/${eventId}`, {
    method: 'DELETE',
    adminToken,
  });
}
