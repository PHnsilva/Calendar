import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createBooking } from '../api/create-booking';

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBooking,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-bookings'] }),
      ]);
    },
  });
}
