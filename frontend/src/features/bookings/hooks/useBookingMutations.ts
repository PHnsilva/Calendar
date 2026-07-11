import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { BookingListEntry } from "../types";
import { deleteBooking } from "../api/delete-booking";
import { updateBooking } from "../api/update-booking";

export function useBookingMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["booking-details"] });
  };

  const updateMutation = useMutation({
    mutationFn: updateBooking,
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBooking,
    onSuccess: (_data, variables) => {
      queryClient.setQueriesData<BookingListEntry[]>({ queryKey: ["my-bookings"] }, (current) => {
        if (!current) return current;
        return current.filter((entry) => entry.model.id !== variables.eventId);
      });
      invalidate();
    },
  });

  return {
    updateBooking: updateMutation.mutateAsync,
    deleteBooking: deleteMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
  };
}
