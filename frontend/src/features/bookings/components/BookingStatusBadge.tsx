import type { BookingStatus } from "../../../entities/booking";

type BookingStatusBadgeProps = {
  status: BookingStatus;
};

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  const className = ["booking-status-badge", `booking-status-badge--${status.raw.toLowerCase()}`].join(" ");
  return <span className={className}>{status.label}</span>;
}
