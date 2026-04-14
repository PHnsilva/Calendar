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
      {bookings.map((booking) => (
        <BookingListItem
          key={booking.eventId}
          booking={booking}
          isActive={booking.eventId === selectedEventId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
