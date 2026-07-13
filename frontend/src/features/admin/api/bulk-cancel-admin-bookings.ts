import { apiPost } from "../../../lib/api-client";
import type { AdminBulkCancelRequest } from "../../../types/booking";
import { requireAdminSessionToken } from "./admin-session";

export async function bulkCancelAdminBookings(payload: AdminBulkCancelRequest): Promise<void> {
  await apiPost<void>("/api/admin/bookings/bulk-cancel", payload, {
    adminToken: requireAdminSessionToken(),
  });
}
