import type { BookingRecord } from "../../../types/booking";
import { BookingListItem } from "./BookingListItem";

type BookingListProps = {
  bookings: BookingRecord[];
  selectedEventId?: string;
  onSelect: (eventId: string) => void;
};

export function BookingList({ bookings, selectedEventId, onSelect }: BookingListProps) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {bookings.map((booking) => (
        <BookingListItem
          key={booking.eventId}
          booking={booking}
          selected={booking.eventId === selectedEventId}
          onSelect={() => onSelect(booking.eventId)}
        />
      ))}
    </div>
  );
}
