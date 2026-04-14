import { useQuery } from "@tanstack/react-query";
import { getMyBookings } from "../api/get-my-bookings";

export function useMyBookings(token: string, enabled = true) {
  return useQuery({
    queryKey: ["my-bookings", token],
    queryFn: () => getMyBookings(token),
    enabled: enabled && Boolean(token.trim()),
    staleTime: 30_000,
  });
}
