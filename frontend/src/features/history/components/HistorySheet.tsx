import type { ServicoResponse } from "../../../types/booking";

function formatDateTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function bookingName(booking: ServicoResponse) {
  return `${booking.clientFirstName ?? ""} ${booking.clientLastName ?? ""}`.trim() || "Cliente";
}

type HistorySheetProps = {
  open: boolean;
  onClose: () => void;
  bookings: ServicoResponse[];
};

export default function HistorySheet({ open, onClose, bookings }: HistorySheetProps) {
  if (!open) return null;

  return (
    <div className="bottom-sheet" role="dialog" aria-modal="true">
      <button type="button" className="bottom-sheet__backdrop" onClick={onClose} aria-label="Fechar histórico" />
      <section className="bottom-sheet__panel">
        <div className="bottom-sheet__handle" aria-hidden="true" />
        <header className="bottom-sheet__header">
          <div>
            <span className="timeline-panel__eyebrow">Admin</span>
            <h3 className="bottom-sheet__title">Histórico</h3>
          </div>
          <button type="button" className="bottom-sheet__close" onClick={onClose}>Fechar</button>
        </header>

        <div className="bottom-sheet__body">
          {bookings.length === 0 ? (
            <div className="timeline-card timeline-card--empty">
              <strong>Sem histórico</strong>
              <span>Ainda não existem agendamentos passados.</span>
            </div>
          ) : (
            bookings.map((booking) => (
              <article key={booking.eventId} className="bottom-sheet__entry">
                <div>
                  <strong>{bookingName(booking)}</strong>
                  <p>{booking.clientAddressLine ?? booking.clientCity ?? "Endereço não informado"}</p>
                </div>
                <div className="bottom-sheet__entry-meta">
                  <span>{formatDateTime(booking.start)}</span>
                  <small>{booking.serviceType}</small>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
