import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/query-keys';
import { getAdminBooking } from '../api/get-admin-booking';

export function useAdminBookingDetails(eventId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.adminBooking(eventId),
    queryFn: ({ signal }) => getAdminBooking(eventId, signal),
    enabled: enabled && Boolean(eventId),
    retry: 0,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
