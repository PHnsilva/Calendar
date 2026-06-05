import { useQueries } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query-keys";
import { isBookableDateInMonth, toIsoDate } from "../../../lib/dates";
import { getAvailableSlots } from "../api/get-available-slots";

function shiftMonthStart(monthStart: string, delta: number): string {
  const reference = new Date(`${monthStart}T12:00:00`);
  return toIsoDate(new Date(reference.getFullYear(), reference.getMonth() + delta, 1));
}

function getMonthDates(monthStart: string): string[] {
  const reference = new Date(`${monthStart}T12:00:00`);
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => toIsoDate(new Date(year, month, index + 1)));
}

function getDateRange(monthStart: string, monthsAhead: number): string[] {
  const safeMonthsAhead = Number.isFinite(monthsAhead) ? Math.max(0, Math.floor(monthsAhead)) : 0;
  return Array.from({ length: safeMonthsAhead + 1 }, (_, index) => getMonthDates(shiftMonthStart(monthStart, index))).flat();
}

export function useAvailableMonthDates(
  monthStart: string,
  enabled: boolean,
  city = "",
  slotMinutes = 60,
  durationMinutes = slotMinutes,
  monthsAhead = 0,
) {
  const monthDates = getDateRange(monthStart, monthsAhead);

  const queries = useQueries({
    queries: monthDates.map((date) => ({
      queryKey: queryKeys.availableSlots(date, city, slotMinutes, durationMinutes),
      queryFn: () => getAvailableSlots(date, city, slotMinutes, durationMinutes),
      enabled: enabled && isBookableDateInMonth(date, monthStart, monthsAhead),
      staleTime: 30_000,
      retry: 1,
    })),
  });

  const availableDates = monthDates.filter((date, index) => {
    if (!isBookableDateInMonth(date, monthStart, monthsAhead)) return false;
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
