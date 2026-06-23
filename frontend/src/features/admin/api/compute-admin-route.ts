import { apiPost } from "../../../lib/api-client";
import type { RouteComputeResponse } from "../../../types/route";
import { requireAdminSessionToken } from "./admin-session";

export async function computeAdminRoute(payload: { eventId: string; originLat: number; originLng: number }): Promise<RouteComputeResponse> {
  return apiPost<RouteComputeResponse>("/api/routes/admin/compute", payload, {
    adminToken: requireAdminSessionToken(),
  });
}
