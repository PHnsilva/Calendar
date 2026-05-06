import { useMemo, useState } from 'react';
import type { ServicoResponse } from '../../../types/api';

type HistorySheetProps = {
  open: boolean;
  onClose: () => void;
  bookings: ServicoResponse[];
};

const CITY_TONES: Record<string, string> = {
  Itabirito: 'cyan',
  'Ouro Preto': 'violet',
  Moeda: 'orange',
  Congonhas: 'teal',
  'Nova Lima': 'royal',
};

function getCityTone(city?: string): string {
  return CITY_TONES[city ?? ''] ?? 'indigo';
}

function getDayParts(value: string) {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(date);
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '');
  return { day, weekday };
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function bookingName(booking: ServicoResponse) {
  return `${booking.clientFirstName ?? ''} ${booking.clientLastName ?? ''}`.trim() || 'Cliente';
}

export default function HistorySheet({ open, onClose, bookings }: HistorySheetProps) {
  const [activeBookingId, setActiveBookingId] = useState('');

  const activeBooking = useMemo(
    () => bookings.find((booking) => booking.eventId === activeBookingId) ?? null,
    [bookings, activeBookingId],
  );

  if (!open) return null;

  return (
    <div className="admin-bottom-sheet admin-bottom-sheet--history" role="dialog" aria-modal="false">
      <button
        type="button"
        className="admin-bottom-sheet__backdrop"
        aria-label="Fechar historico"
        onClick={onClose}
      />
      <section className="admin-bottom-sheet__card history-sheet">
        <header className="admin-bottom-sheet__header">
          <div>
            <span className="admin-bottom-sheet__eyebrow">Admin</span>
            <h3 className="admin-bottom-sheet__title">Histórico</h3>
          </div>
          <button type="button" className="admin-bottom-sheet__close" onClick={onClose}>×</button>
        </header>

        <div className="admin-bottom-sheet__body history-sheet__list">
          {bookings.length === 0 ? (
            <div className="timeline-card timeline-card--empty">
              <strong>Sem histórico</strong>
              <span>Ainda não existem atendimentos anteriores.</span>
            </div>
          ) : (
            bookings.map((booking) => {
              const tone = getCityTone(booking.clientCity);
              const dayParts = getDayParts(booking.start);

              return (
                <button
                  key={booking.eventId}
                  type="button"
                  className={`history-sheet__card history-sheet__card--${tone}`}
                  onClick={() => setActiveBookingId(booking.eventId)}
                >
                  <div className="history-sheet__date-pill">
                    <strong>{dayParts.day}</strong>
                    <span>{dayParts.weekday}</span>
                  </div>

                  <div className="history-sheet__content">
                    <div className="history-sheet__top">
                      <strong className="history-sheet__name">{bookingName(booking)}</strong>
                      <span className="history-sheet__time">{new Date(booking.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <span className="history-sheet__meta">{booking.clientAddressLine ?? booking.clientCity ?? 'Endereço não informado'}</span>
                    <span className="history-sheet__meta">{booking.serviceType}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {activeBooking ? (
          <div className="history-sheet__detail">
            <div className="history-sheet__detail-header">
              <div>
                <span className="admin-bottom-sheet__eyebrow">Detalhes</span>
                <h4 className="history-sheet__detail-title">{bookingName(activeBooking)}</h4>
              </div>
              <button type="button" className="admin-bottom-sheet__close" onClick={() => setActiveBookingId('')}>×</button>
            </div>

            <div className="history-sheet__detail-grid">
              <div className="history-sheet__detail-row"><span>Data</span><strong>{formatDateTime(activeBooking.start)}</strong></div>
              <div className="history-sheet__detail-row"><span>Serviço</span><strong>{activeBooking.serviceType}</strong></div>
              <div className="history-sheet__detail-row"><span>Telefone</span><strong>{activeBooking.clientPhone || 'Não informado'}</strong></div>
              <div className="history-sheet__detail-row"><span>E-mail</span><strong>{activeBooking.clientEmail || 'Não informado'}</strong></div>
              <div className="history-sheet__detail-row history-sheet__detail-row--full"><span>Endereço</span><strong>{activeBooking.clientAddressLine ?? activeBooking.clientStreet ?? activeBooking.clientCity ?? 'Não informado'}</strong></div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
