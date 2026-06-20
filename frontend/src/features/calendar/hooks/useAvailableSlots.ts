import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query-keys";
import { isBookableIsoDate } from "../../../lib/dates";
import { ApiError } from "../../../lib/api-client";
import { getAvailableSlots } from "../api/get-available-slots";

function shouldRetryRequest(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  if (!(error instanceof ApiError)) return true;
  if ([400, 401, 403, 404, 409, 422].includes(error.status)) return false;
  return true;
}

export function useAvailableSlots(date: string, city: string, slotMinutes: number, durationMinutes: number, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.availableSlots(date, city, slotMinutes, durationMinutes),
    queryFn: () => getAvailableSlots(date, city, slotMinutes, durationMinutes),
    enabled: enabled && Boolean(date) && Boolean(city.trim()) && Number.isFinite(slotMinutes) && slotMinutes > 0 && isBookableIsoDate(date),
    staleTime: 30_000,
    retry: shouldRetryRequest,
  });
}
