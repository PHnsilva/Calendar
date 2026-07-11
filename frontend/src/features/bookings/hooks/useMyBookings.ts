import { useQuery } from "@tanstack/react-query";
import { bookingKeys, type Booking } from "../../../entities/booking";
import { getMyBookings } from "../api/get-my-bookings";
import { toLegacyBookingResponse } from "../adapters/to-legacy-booking-response";
import type { BookingListEntry } from "../types";

const MY_BOOKINGS_TIMEOUT_MS = 6_000;

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

  return useQuery<BookingListEntry[]>({
    queryKey: bookingKeys.mine(uniqueTokens),
    enabled: uniqueTokens.length > 0,
    queryFn: async ({ signal }) => {
      const controller = new AbortController();
      const abortFromQuery = () => controller.abort();
      const timeoutId = globalThis.setTimeout(() => controller.abort(), MY_BOOKINGS_TIMEOUT_MS);

      if (signal.aborted) {
        controller.abort();
      } else {
        signal.addEventListener("abort", abortFromQuery, { once: true });
      }

      try {
        const results = await Promise.allSettled(
          uniqueTokens.map((token) => getMyBookings(token, controller.signal)),
        );
        const fulfilled = results
          .filter((result): result is PromiseFulfilledResult<Booking[]> => result.status === "fulfilled")
          .map((result) => result.value);

        if (fulfilled.length === 0) {
          const firstFailure = results.find(
            (result): result is PromiseRejectedResult => result.status === "rejected",
          );
          throw firstFailure?.reason ?? new Error("Não foi possível carregar os agendamentos.");
        }

        return mergeBookings(fulfilled).map((model) => ({
          model,
          legacy: toLegacyBookingResponse(model),
        }));
      } finally {
        globalThis.clearTimeout(timeoutId);
        signal.removeEventListener("abort", abortFromQuery);
      }
    },
    retry: 0,
  });
}
