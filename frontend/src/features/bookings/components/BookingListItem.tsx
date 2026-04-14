import type { BookingRecord } from "../../../types/booking";
import { BookingStatusBadge } from "./BookingStatusBadge";

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
}

type BookingListItemProps = {
  booking: BookingRecord;
  selected: boolean;
  onSelect: () => void;
};

export function BookingListItem({ booking, selected, onSelect }: BookingListItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        width: "100%",
        textAlign: "left",
        border: selected ? "2px solid #0f172a" : "1px solid rgba(15,23,42,0.12)",
        borderRadius: 16,
        padding: 14,
        background: "white",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
        <div>
          <strong style={{ display: "block", marginBottom: 6 }}>{booking.serviceType || "Agendamento"}</strong>
          <span style={{ display: "block", fontSize: 14, opacity: 0.8 }}>{formatDateTime(booking.start)}</span>
          <span style={{ display: "block", fontSize: 13, opacity: 0.7, marginTop: 4 }}>{booking.clientCity}</span>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>
    </button>
  );
}
