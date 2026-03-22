import { apiPost } from "../../../lib/api-client";
import { getStoredAdminToken } from "../../../lib/storage";
import type { AdminBulkCancelRequest } from "../../../types/booking";

export async function bulkCancelAdminBookings(payload: AdminBulkCancelRequest): Promise<void> {
  const adminToken = getStoredAdminToken();

  if (!adminToken) {
    throw new Error("Admin token missing");
  }

  await apiPost<void>("/api/admin/bookings/bulk-cancel", payload, {
    adminToken,
  });
}
