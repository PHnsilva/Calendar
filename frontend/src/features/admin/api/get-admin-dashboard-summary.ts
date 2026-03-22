import { apiGet } from "../../../lib/api-client";
import { getStoredAdminToken } from "../../../lib/storage";
import type { AdminDashboardSummaryResponse } from "../../../types/booking";
import type { AdminFilters } from "../types";

export async function getAdminDashboardSummary(filters: Pick<AdminFilters, "from" | "to" | "status" | "city">): Promise<AdminDashboardSummaryResponse> {
  const adminToken = getStoredAdminToken();

  if (!adminToken) {
    throw new Error("Admin token missing");
  }

  return apiGet<AdminDashboardSummaryResponse>("/api/admin/dashboard/summary", {
    adminToken,
    query: {
      from: filters.from,
      to: filters.to,
      status: filters.status,
      city: filters.city,
    },
  });
}
