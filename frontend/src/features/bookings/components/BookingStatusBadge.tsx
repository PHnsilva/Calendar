type BookingStatusBadgeProps = {
  status: string;
};

const LABELS: Record<string, string> = {
  CONFIRMED: "Confirmado",
  PENDING_PHONE: "Pendente",
  CANCELLED: "Cancelado",
};

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  const normalized = status?.toUpperCase() || "";
  const className = ["booking-status-badge", `booking-status-badge--${normalized.toLowerCase()}`].join(" ");
  return <span className={className}>{LABELS[normalized] ?? status}</span>;
}
