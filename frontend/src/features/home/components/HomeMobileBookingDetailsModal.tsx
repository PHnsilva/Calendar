import { createPortal } from 'react-dom';
import type { CalendarEvent } from '../../calendar/types';

type HomeMobileBookingDetailsModalProps = {
  event: CalendarEvent | null;
  open: boolean;
  onClose: () => void;
};

function toLocalDate(dateString: string): Date {
  return new Date(`${dateString}T12:00:00`);
}

function formatMonth(dateString: string) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(toLocalDate(dateString));
}

function buildMapUrl(address?: string) {
  const query = encodeURIComponent(address || 'Minas Gerais, Brasil');
  return `https://www.google.com/maps?q=${query}&output=embed`;
}

export default function HomeMobileBookingDetailsModal({ event, open, onClose }: HomeMobileBookingDetailsModalProps) {
  if (!open || !event || typeof document === 'undefined') return null;

  return createPortal(
    <div className="booking-detail-modal mobile-booking-detail-modal" role="dialog" aria-modal="true">
      <button type="button" className="booking-detail-modal__backdrop" onClick={onClose} aria-label="Fechar detalhes" />

      <div className="booking-detail-modal__card mobile-booking-detail-modal__card">
        <div className="booking-detail-modal__header">
          <div>
            <span className="booking-preview-modal__eyebrow">Detalhes</span>
            <h3 className="booking-preview-modal__title">{event.customerName ?? event.title}</h3>
            <p className="mobile-booking-detail-modal__subtitle">{event.serviceLabel ?? 'Atendimento agendado'}</p>
          </div>
          <button type="button" className="booking-preview-modal__close" onClick={onClose} aria-label="Fechar">×</button>
        </div>

        <div className="booking-detail-modal__body mobile-booking-detail-modal__grid">
          <span className="mobile-booking-detail-modal__status">Confirmado</span>

          <div className="mobile-booking-detail-modal__hero">
            <div className="mobile-booking-detail-modal__map">
              <iframe title="Local do serviço" src={buildMapUrl(event.customerAddress)} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
            <div className="mobile-booking-detail-modal__date-card" aria-hidden="true">
              <strong>{event.date.slice(8, 10)}</strong>
              <span>{formatMonth(event.date)}</span>
              <small>{event.startTime} • {event.endTime}</small>
            </div>
          </div>

          <div className="booking-detail-modal__row">
            <span>Localização</span>
            <strong>{event.customerAddress ?? 'Endereço não informado'}</strong>
          </div>

          <div className="booking-detail-modal__row">
            <span>Cidade</span>
            <strong>{event.city ?? 'Cidade não informada'}</strong>
          </div>

          <div className="booking-detail-modal__row">
            <span>Contato</span>
            <strong>{event.customerPhone ?? 'Telefone não informado'}</strong>
          </div>

          <div className="booking-detail-modal__row">
            <span>E-mail</span>
            <strong>{event.customerEmail ?? 'E-mail não informado'}</strong>
          </div>

          <div className="mobile-booking-detail-modal__section-title">Ações</div>
          <div className="mobile-booking-detail-modal__actions">
            <button type="button" className="mobile-booking-detail-modal__action mobile-booking-detail-modal__action--danger">Cancelar</button>
            <button type="button" className="mobile-booking-detail-modal__action mobile-booking-detail-modal__action--primary">Reagendar</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
