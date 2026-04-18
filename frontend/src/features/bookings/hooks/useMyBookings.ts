import { useQuery } from "@tanstack/react-query";
import { getMyBookings } from "../api/get-my-bookings";
import type { ServicoResponse } from "../../../types/api";

function mergeBookings(items: ServicoResponse[][]): ServicoResponse[] {
  const map = new Map<string, ServicoResponse>();
  items.flat().forEach((booking) => {
    const current = map.get(booking.eventId);
    if (!current || current.start < booking.start) {
      map.set(booking.eventId, booking);
    }
  });

  return [...map.values()].sort((a, b) => a.start.localeCompare(b.start));
}

export function useMyBookings(tokens: string[]) {
  const uniqueTokens = [...new Set(tokens.filter(Boolean))];

  return useQuery({
    queryKey: ["my-bookings", uniqueTokens],
    enabled: uniqueTokens.length > 0,
    queryFn: async () => {
      const results = await Promise.allSettled(uniqueTokens.map((token) => getMyBookings(token)));
      const fulfilled = results
        .filter((result): result is PromiseFulfilledResult<ServicoResponse[]> => result.status === "fulfilled")
        .map((result) => result.value);
      return mergeBookings(fulfilled);
    },
    retry: 0,
  });
}
