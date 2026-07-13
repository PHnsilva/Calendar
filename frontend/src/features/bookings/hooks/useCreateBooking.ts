import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createBooking } from '../api/create-booking';

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    },
  });
}
