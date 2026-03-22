import { apiDelete } from "../../../lib/api-client";
import { getStoredAdminToken } from "../../../lib/storage";

export async function deleteAdminBooking(eventId: string): Promise<void> {
  const adminToken = getStoredAdminToken();

  if (!adminToken) {
    throw new Error("Admin token missing");
  }

  await apiDelete<void>(`/api/servicos/admin/${eventId}`, {
    adminToken,
  });
}
