import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteBooking } from "../api/delete-booking";
import { getBookingByToken, resolveManageTokenForEventId } from "../api/get-booking-by-token";
import { updateBooking } from "../api/update-booking";
import { saveManageToken } from "../../../lib/storage";
import type { ServicoRequest } from "../../../types/api";

export function useBookingMutations(seedToken: string) {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["my-bookings", seedToken] }),
      queryClient.invalidateQueries({ queryKey: ["booking-details"] }),
    ]);
  };

  const resolveToken = async (eventId: string) => {
    const token = await resolveManageTokenForEventId(eventId, seedToken ? [seedToken] : []);
    if (!token) {
      throw new Error(
        "Não foi possível validar o token deste agendamento. Recupere o acesso ao atendimento pelo telefone antes de editar ou cancelar.",
      );
    }

    try {
      const booking = await getBookingByToken(token);
      saveManageToken(token, booking.eventId);
    } catch {
      saveManageToken(token, eventId);
    }

    return token;
  };

  const updateMutation = useMutation({
    mutationFn: async ({ eventId, payload }: { eventId: string; payload: ServicoRequest }) => {
      const token = await resolveToken(eventId);
      return updateBooking(eventId, token, payload);
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const token = await resolveToken(eventId);
      return deleteBooking(eventId, token);
    },
    onSuccess: invalidate,
  });

  return {
    updateMutation,
    deleteMutation,
  };
}
