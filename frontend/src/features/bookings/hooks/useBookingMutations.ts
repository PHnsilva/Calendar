import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteBooking } from "../api/delete-booking";
import { updateBooking } from "../api/update-booking";
import type { ServicoRequest } from "../../../types/api";

export function useBookingMutations(token: string) {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["my-bookings", token] }),
      queryClient.invalidateQueries({ queryKey: ["booking-details", token] }),
    ]);
  };

  const updateMutation = useMutation({
    mutationFn: ({ eventId, payload }: { eventId: string; payload: ServicoRequest }) =>
      updateBooking(eventId, token, payload),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) => deleteBooking(eventId, token),
    onSuccess: invalidate,
  });

  return {
    updateMutation,
    deleteMutation,
  };
}
