import { useMutation } from "@tanstack/react-query";
import { createBooking } from "../api/create-booking";

export function useCreateBooking() {
  return useMutation({
    mutationFn: createBooking,
  });
}
