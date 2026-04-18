import { useQueries } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query-keys";
import { isBookableDateInMonth, toIsoDate } from "../../../lib/dates";
import { getAvailableSlots } from "../api/get-available-slots";

function getMonthDates(monthStart: string): string[] {
  const reference = new Date(`${monthStart}T12:00:00`);
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => toIsoDate(new Date(year, month, index + 1)));
}

export function useAvailableMonthDates(monthStart: string, enabled: boolean, city = "", slotMinutes = 60, durationMinutes = slotMinutes) {
  const monthDates = getMonthDates(monthStart);

  const queries = useQueries({
    queries: monthDates.map((date) => ({
      queryKey: queryKeys.availableSlots(date, city, slotMinutes, durationMinutes),
      queryFn: () => getAvailableSlots(date, city, slotMinutes, durationMinutes),
      enabled: enabled && isBookableDateInMonth(date, monthStart),
      staleTime: 30_000,
      retry: 1,
    })),
  });

  const availableDates = monthDates.filter((date, index) => {
    if (!isBookableDateInMonth(date, monthStart)) return false;
    return (queries[index]?.data?.length ?? 0) > 0;
  });
  const hasError = queries.some((query) => query.isError);
  const isLoading = queries.some((query) => query.isLoading || query.isFetching);

  return {
    monthDates,
    availableDates,
    hasError,
    isLoading,
  };
}
