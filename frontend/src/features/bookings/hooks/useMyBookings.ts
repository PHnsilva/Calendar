import { useQuery } from "@tanstack/react-query";
import { bookingKeys, type Booking } from "../../../entities/booking";
import { getMyBookings } from "../api/get-my-bookings";
import type { ServicoResponse } from "../../../types/api";
import { toLegacyBookingResponse } from "../adapters/to-legacy-booking-response";

function mergeBookings(items: Booking[][]): Booking[] {
  const map = new Map<string, Booking>();
  items.flat().forEach((booking) => {
    const current = map.get(booking.id);
    if (!current || current.startsAt < booking.startsAt) {
      map.set(booking.id, booking);
    }
  });

  return [...map.values()].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export function useMyBookings(tokens: string[]) {
  const uniqueTokens = [...new Set(tokens.map((token) => token.trim()).filter(Boolean))].sort();

  return useQuery<ServicoResponse[]>({
    queryKey: bookingKeys.mine(uniqueTokens),
    enabled: uniqueTokens.length > 0,
    queryFn: async () => {
      const results = await Promise.allSettled(uniqueTokens.map((token) => getMyBookings(token)));
      const fulfilled = results
        .filter((result): result is PromiseFulfilledResult<Booking[]> => result.status === "fulfilled")
        .map((result) => result.value);
      return mergeBookings(fulfilled).map(toLegacyBookingResponse);
    },
    retry: 0,
  });
}
