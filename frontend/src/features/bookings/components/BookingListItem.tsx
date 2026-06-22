import { BookingStatusBadge } from "./BookingStatusBadge";
import { mapBookingDto, type Booking } from "../../../entities/booking";
import { formatDateTime } from "../../../lib/dates";
import type { ServicoResponse } from "../../../types/api";

type BookingListItemProps = {
  booking: ServicoResponse;
  isActive: boolean;
  onSelect: (booking: ServicoResponse) => void;
};

type BookingListItemDisplayProps = {
  booking: Booking;
};

function BookingListItemDisplay({ booking }: BookingListItemDisplayProps) {
  return (
    <>
      <div className="my-bookings__item-top">
        <strong>{booking.serviceType}</strong>
        <BookingStatusBadge status={booking.status} />
      </div>
      <span>{formatDateTime(booking.startsAt)}</span>
      <small>{booking.client.address.formatted}</small>
    </>
  );
}

export function BookingListItem({ booking, isActive, onSelect }: BookingListItemProps) {
  const displayBooking = mapBookingDto(booking);

  return (
    <button
      type="button"
      className={["my-bookings__item", isActive ? "my-bookings__item--active" : ""].filter(Boolean).join(" ")}
      onClick={() => onSelect(booking)}
    >
      <BookingListItemDisplay booking={displayBooking} />
    </button>
  );
}
