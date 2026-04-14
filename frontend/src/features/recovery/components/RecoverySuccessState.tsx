import { Link } from "react-router-dom";
import type { ServicoResponse } from "../../../types/api";
import { formatDateTime } from "../../../lib/dates";

type RecoverySuccessStateProps = {
  bookings: ServicoResponse[];
  onRecoverAnother: () => void;
};

export function RecoverySuccessState({ bookings, onRecoverAnother }: RecoverySuccessStateProps) {
  return (
    <section className="recovery-card recovery-card--success">
      <h2>Acesso restaurado</h2>
      <p>Encontramos {bookings.length} agendamento(s) e salvamos o acesso deste navegador.</p>
      <div className="recovery-card__result-list">
        {bookings.map((booking) => (
          <article key={booking.eventId} className="recovery-card__result-item">
            <strong>{booking.serviceType}</strong>
            <span>{formatDateTime(booking.start)}</span>
            <small>{booking.clientAddressLine}</small>
          </article>
        ))}
      </div>
      <div className="recovery-card__actions">
        <Link to="/my" className="primary-action">Ir para meus agendamentos</Link>
        <button type="button" className="secondary-action" onClick={onRecoverAnother}>Recuperar outro telefone</button>
      </div>
    </section>
  );
}
