import { mapBookingDto } from "../../../entities/booking";
import type { ServicoResponse } from "../../../types/api";
import { BookingListItem } from "./BookingListItem";

type BookingListProps = {
  bookings: ServicoResponse[];
  selectedEventId?: string;
  onSelect: (booking: ServicoResponse) => void;
};

export function BookingList({ bookings, selectedEventId, onSelect }: BookingListProps) {
  if (bookings.length === 0) {
    return <p className="my-bookings__empty">Nenhum agendamento encontrado.</p>;
  }

  return (
    <div className="my-bookings__list">
      {bookings.map((legacyBooking) => {
        const booking = mapBookingDto(legacyBooking);
        return (
          <BookingListItem
            key={booking.id}
            booking={booking}
            isActive={booking.id === selectedEventId}
            onSelect={() => onSelect(legacyBooking)}
          />
        );
      })}
    </div>
  );
}
