import { Link } from "react-router-dom";
import type { ServicoResponse } from "../../../types/booking";

function formatFullDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function toBookingName(booking: ServicoResponse): string {
  return `${booking.clientFirstName ?? ""} ${booking.clientLastName ?? ""}`.trim() || "Cliente";
}

type AdminBookingSheetProps = {
  booking: ServicoResponse | null;
  deleting?: boolean;
  onDelete: (eventId: string) => void;
};

export default function AdminBookingSheet({ booking, deleting, onDelete }: AdminBookingSheetProps) {
  if (!booking) {
    return (
      <aside className="admin-sheet panel">
        <div className="admin-empty-state">
          <strong>Selecione um agendamento</strong>
          <span>Os detalhes operacionais aparecem aqui para revisão rápida.</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="admin-sheet panel">
      <div className="admin-sheet__header">
        <div>
          <span className="admin-section-eyebrow">Detalhes</span>
          <h2 className="admin-section-title">{toBookingName(booking)}</h2>
        </div>

        <span className="admin-status-pill">{booking.status}</span>
      </div>

      <div className="admin-sheet__body">
        <div className="admin-detail-block">
          <span>Data e hora</span>
          <strong>{formatFullDate(booking.start)}</strong>
        </div>

        <div className="admin-detail-block">
          <span>Endereço</span>
          <strong>{booking.clientAddressLine ?? "Não informado"}</strong>
        </div>

        <div className="admin-detail-grid">
          <div className="admin-detail-block">
            <span>E-mail</span>
            <strong>{booking.clientEmail || "Não informado"}</strong>
          </div>

          <div className="admin-detail-block">
            <span>Telefone</span>
            <strong>{booking.clientPhone || "Não informado"}</strong>
          </div>

          <div className="admin-detail-block">
            <span>Serviço</span>
            <strong>{booking.serviceType || "Visita técnica"}</strong>
          </div>

          <div className="admin-detail-block">
            <span>Local</span>
            <strong>{[booking.clientCity, booking.clientState].filter(Boolean).join(" / ") || "MG"}</strong>
          </div>
        </div>
      </div>

      <div className="admin-sheet__actions">
        <Link to={`/admin/booking/${booking.eventId}`} className="admin-btn admin-btn--ghost admin-btn--link">
          Abrir página
        </Link>

        <button
          type="button"
          className="admin-btn admin-btn--danger"
          disabled={deleting}
          onClick={() => onDelete(booking.eventId)}
        >
          {deleting ? "Cancelando..." : "Excluir agendamento"}
        </button>
      </div>
    </aside>
  );
}
