import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query-keys";
import type { RouteComputeResponse } from "../../../types/route";
import { computeAdminRoute } from "../api/compute-admin-route";

export function useAdminRoute(eventId: string, originLat?: number, originLng?: number, enabled = true) {
  return useQuery<RouteComputeResponse>({
    queryKey: queryKeys.adminRoute(eventId, originLat, originLng),
    queryFn: () => computeAdminRoute({
      eventId,
      originLat: Number(originLat),
      originLng: Number(originLng),
    }),
    enabled: enabled && Boolean(eventId) && typeof originLat === "number" && typeof originLng === "number",
    staleTime: 30_000,
    retry: 1,
  });
}
