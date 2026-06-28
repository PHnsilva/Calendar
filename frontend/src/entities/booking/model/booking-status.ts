export type BookingStatusCode = "pending" | "confirmed" | "cancelled" | "unknown";

export type BookingStatus = {
  code: BookingStatusCode;
  label: string;
  raw: string;
};

const STATUS_BY_BACKEND_VALUE: Record<string, Omit<BookingStatus, "raw">> = {
  PENDING_PHONE: { code: "pending", label: "Pendente" },
  CONFIRMED: { code: "confirmed", label: "Confirmado" },
  CANCELLED: { code: "cancelled", label: "Cancelado" },
};

export function mapBookingStatus(value: string | null | undefined): BookingStatus {
  const raw = value?.trim() ?? "";
  const knownStatus = STATUS_BY_BACKEND_VALUE[raw.toUpperCase()];

  if (knownStatus) {
    return { ...knownStatus, raw };
  }

  return {
    code: "unknown",
    label: raw,
    raw,
  };
}
