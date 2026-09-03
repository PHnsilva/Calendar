import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query-keys";
import { getStoredAdminWorkspace } from "../../../lib/storage";
import { getAdminHistory } from "../api/get-admin-history";
import type { AdminFilters } from "../types";

export function useAdminHistory(filters: AdminFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.adminHistory(JSON.stringify({ filters, workspace: getStoredAdminWorkspace() ?? null })),
    queryFn: ({ signal }) => getAdminHistory(filters, signal),
    enabled,
    retry: 0,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
