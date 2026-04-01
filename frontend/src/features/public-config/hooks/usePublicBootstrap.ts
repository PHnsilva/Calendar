import { useQuery } from "@tanstack/react-query";
import { getPublicBootstrap } from "../api/get-public-bootstrap";
import { queryKeys } from "../../../lib/query-keys";

export function usePublicBootstrap(enabled = true) {
  return useQuery({
    queryKey: queryKeys.publicBootstrap,
    queryFn: getPublicBootstrap,
    enabled,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
