import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query-keys";
import { getAvailableSlots } from "../api/get-available-slots";

export function useAvailableSlots(date: string, city: string, slotMinutes: number, enabled: boolean) {
  const normalizedCity = typeof city === "string" ? city.trim() : "";

  return useQuery({
    queryKey: queryKeys.availableSlots(date, normalizedCity, slotMinutes),
    queryFn: () => getAvailableSlots(date, normalizedCity, slotMinutes),
    enabled: enabled && Boolean(date) && Boolean(normalizedCity) && Number.isFinite(slotMinutes) && slotMinutes > 0,
    staleTime: 30_000,
  });
}
