import { apiPost } from "../../../lib/api-client";
import { getStoredAdminToken } from "../../../lib/storage";
import type { RouteComputeResponse } from "../../../types/route";

export async function computeAdminRoute(payload: { eventId: string; originLat: number; originLng: number }): Promise<RouteComputeResponse> {
  const adminToken = getStoredAdminToken();

  if (!adminToken) {
    throw new Error("Admin token missing");
  }

  return apiPost<RouteComputeResponse>("/api/routes/admin/compute", payload, {
    adminToken,
  });
}
