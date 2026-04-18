import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query-keys";
import { isBookableIsoDate } from "../../../lib/dates";
import { getAvailableSlots } from "../api/get-available-slots";

export function useAvailableSlots(date: string, city: string, slotMinutes: number, durationMinutes: number, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.availableSlots(date, city, slotMinutes, durationMinutes),
    queryFn: () => getAvailableSlots(date, city, slotMinutes, durationMinutes),
    enabled: enabled && Boolean(date) && Boolean(city.trim()) && Number.isFinite(slotMinutes) && slotMinutes > 0 && isBookableIsoDate(date),
    staleTime: 30_000,
  });
}
