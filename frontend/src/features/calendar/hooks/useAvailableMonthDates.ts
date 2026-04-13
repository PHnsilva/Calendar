import { useQueries } from "@tanstack/react-query";
import { isBookableDate } from "../../../lib/dates";
import { queryKeys } from "../../../lib/query-keys";
import { getAvailableSlots } from "../api/get-available-slots";

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthDates(monthStart: string): string[] {
  const reference = new Date(`${monthStart}T12:00:00`);
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) =>
    toIsoDate(new Date(year, month, index + 1)),
  );
}

export function useAvailableMonthDates(
  monthStart: string,
  enabled: boolean,
  city = "Itabirito",
  slotMinutes = 60,
) {
  const normalizedCity = typeof city === "string" ? city.trim() : "";
  const monthDates = getMonthDates(monthStart);

  const queries = useQueries({
    queries: monthDates.map((date) => {
      const queryEnabled = enabled && Boolean(normalizedCity) && isBookableDate(date);

      return {
        queryKey: queryKeys.availableSlots(date, normalizedCity, slotMinutes),
        queryFn: () => getAvailableSlots(date, normalizedCity, slotMinutes),
        enabled: queryEnabled,
        staleTime: 30_000,
        retry: 1,
      };
    }),
  });

  const availableDates = monthDates.filter((date, index) => (queries[index]?.data?.length ?? 0) > 0);
  const hasError = queries.some((query) => query.isError);
  const isLoading = queries.some((query) => query.isLoading || query.isFetching);

  return {
    monthDates,
    availableDates,
    hasError,
    isLoading,
  };
}
