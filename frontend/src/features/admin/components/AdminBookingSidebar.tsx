import { Link } from "react-router-dom";
import type { ServicoResponse } from "../../../types/booking";

function formatDateTime(value: string): { day: string; week: string; time: string } {
  const date = new Date(value);
  return {
    day: new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(date),
    week: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", ""),
    time: new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
}

function toBookingName(booking: ServicoResponse): string {
  return `${booking.clientFirstName ?? ""} ${booking.clientLastName ?? ""}`.trim() || "Cliente";
}

type AdminBookingSidebarProps = {
  bookings: ServicoResponse[];
  selectedIds: string[];
  selectedBookingId?: string;
  allVisibleSelected: boolean;
  onToggleSelection: (eventId: string) => void;
  onToggleSelectVisible: () => void;
  onSelectBooking: (eventId: string) => void;
};

export default function AdminBookingSidebar({
  bookings,
  selectedIds,
  selectedBookingId,
  allVisibleSelected,
  onToggleSelection,
  onToggleSelectVisible,
  onSelectBooking,
}: AdminBookingSidebarProps) {
  return (
    <section className="admin-list panel">
      <div className="admin-list__header">
        <div>
          <span className="admin-section-eyebrow">Bookings</span>
          <h2 className="admin-section-title">Lista operacional</h2>
        </div>

        <label className="admin-check-all">
          <input
            type="checkbox"
            checked={allVisibleSelected}
            onChange={onToggleSelectVisible}
          />
          <span>Selecionar visíveis</span>
        </label>
      </div>

      <div className="admin-list__body">
        {bookings.length === 0 ? (
          <article className="admin-empty-state">
            <strong>Nenhum agendamento visível</strong>
            <span>Ajuste os filtros ou aguarde novos pedidos.</span>
          </article>
        ) : (
          bookings.map((booking) => {
            const schedule = formatDateTime(booking.start);
            const isSelected = selectedBookingId === booking.eventId;
            const isChecked = selectedIds.includes(booking.eventId);

            return (
              <article
                key={booking.eventId}
                className={[
                  "admin-booking-card",
                  isSelected ? "admin-booking-card--selected" : "",
                ].filter(Boolean).join(" ")}
              >
                <label className="admin-booking-card__check">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggleSelection(booking.eventId)}
                  />
                </label>

                <button
                  type="button"
                  className="admin-booking-card__main"
                  onClick={() => onSelectBooking(booking.eventId)}
                >
                  <div className="admin-booking-card__date">
                    <strong>{schedule.day}</strong>
                    <span>{schedule.week}</span>
                  </div>

                  <div className="admin-booking-card__content">
                    <div className="admin-booking-card__topline">
                      <strong>{toBookingName(booking)}</strong>
                      <span>{schedule.time}</span>
                    </div>
                    <span className="admin-booking-card__meta">{booking.clientAddressLine ?? booking.clientCity ?? "Endereço não informado"}</span>
                    <span className="admin-booking-card__status">{booking.status}</span>
                  </div>
                </button>

                <Link to={`/admin/booking/${booking.eventId}`} className="admin-booking-card__link">
                  Abrir
                </Link>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
