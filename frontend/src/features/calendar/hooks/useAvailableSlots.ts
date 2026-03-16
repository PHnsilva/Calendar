import { useQuery } from "@tanstack/react-query";
import { getAvailableSlots } from "../api/get-available-slots";
import { queryKeys } from "../../../lib/query-keys";

export function useAvailableSlots(date: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.availableSlots(date),
    queryFn: () => getAvailableSlots(date),
    enabled: enabled && Boolean(date),
    staleTime: 30_000,
  });
}
