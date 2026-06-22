import { BookingStatusBadge } from "./BookingStatusBadge";
import { mapBookingStatus } from "../../../entities/booking";
import { formatDateTime } from "../../../lib/dates";
import type { ServicoResponse } from "../../../types/api";

type BookingListItemProps = {
  booking: ServicoResponse;
  isActive: boolean;
  onSelect: (booking: ServicoResponse) => void;
};

export function BookingListItem({ booking, isActive, onSelect }: BookingListItemProps) {
  return (
    <button
      type="button"
      className={["my-bookings__item", isActive ? "my-bookings__item--active" : ""].filter(Boolean).join(" ")}
      onClick={() => onSelect(booking)}
    >
      <div className="my-bookings__item-top">
        <strong>{booking.serviceType}</strong>
        <BookingStatusBadge status={mapBookingStatus(booking.status)} />
      </div>
      <span>{formatDateTime(booking.start)}</span>
      <small>{booking.clientAddressLine || `${booking.clientStreet}, ${booking.clientNumber}`}</small>
    </button>
  );
}
