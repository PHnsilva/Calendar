type BookingStatusBadgeProps = {
  status?: string;
};

const LABELS: Record<string, string> = {
  PENDING_PHONE: "Pendente",
  CONFIRMED: "Confirmado",
  CANCELLED: "Cancelado",
  COMPLETED: "Concluído",
};

export function BookingStatusBadge({ status }: BookingStatusBadgeProps) {
  const normalized = (status ?? "").trim().toUpperCase();
  const label = LABELS[normalized] ?? (status || "Sem status");

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 700,
        background: "rgba(15, 23, 42, 0.08)",
      }}
    >
      {label}
    </span>
  );
}
