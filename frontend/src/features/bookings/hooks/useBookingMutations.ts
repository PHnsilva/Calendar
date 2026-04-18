import { useMutation, useQueryClient } from "@tanstack/react-query";
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
    onSuccess: invalidate,
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
