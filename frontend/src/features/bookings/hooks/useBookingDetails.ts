import { useQuery } from "@tanstack/react-query";
import { getBookingByToken } from "../api/get-booking-by-token";

export function useBookingDetails(token: string, enabled = true) {
  return useQuery({
    queryKey: ["booking-details", token],
    enabled: enabled && Boolean(token),
    queryFn: () => getBookingByToken(token),
    retry: 0,
  });
}
