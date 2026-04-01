import { useQuery } from "@tanstack/react-query";
import { getAvailableSlots } from "../api/get-available-slots";
import { queryKeys } from "../../../lib/query-keys";

export function useAvailableSlots(date: string, slotMinutes: number, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.availableSlots(date, slotMinutes),
    queryFn: () => getAvailableSlots(date, slotMinutes),
    enabled: enabled && Boolean(date) && Number.isFinite(slotMinutes) && slotMinutes > 0,
    staleTime: 30_000,
  });
}
