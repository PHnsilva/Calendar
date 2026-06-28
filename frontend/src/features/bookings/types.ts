import type { Booking } from "../../entities/booking";
import type { ServicoRequest, ServicoResponse } from "../../types/api";

export type BookingItem = ServicoResponse;

export type BookingListEntry = {
  model: Booking;
  legacy: ServicoResponse;
};

export type UpdateBookingInput = {
  eventId: string;
  token: string;
  payload: ServicoRequest;
};

export type DeleteBookingInput = {
  eventId: string;
  token: string;
};
