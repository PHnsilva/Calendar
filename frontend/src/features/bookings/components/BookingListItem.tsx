import { BookingStatusBadge } from "./BookingStatusBadge";
import type { Booking } from "../../../entities/booking";
import { formatDateTime } from "../../../lib/dates";

type BookingListItemProps = {
  booking: Booking;
  isActive: boolean;
  onSelect: () => void;
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
  return (
    <button
      type="button"
      className={["my-bookings__item", isActive ? "my-bookings__item--active" : ""].filter(Boolean).join(" ")}
      onClick={onSelect}
    >
      <BookingListItemDisplay booking={booking} />
    </button>
  );
}
