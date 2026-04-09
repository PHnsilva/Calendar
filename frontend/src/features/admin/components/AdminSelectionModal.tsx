import { useEffect, useMemo, useState } from 'react';
import type { ServicoResponse } from '../../../types/api';
import type { AdminBlockMode, AdminBlockEntry } from '../api/manage-admin-blocks';

type AdminSelectionModalMode = 'block' | 'cancel' | 'view';

type BlockConfirmPayload = {
  mode: AdminBlockMode;
  entries: AdminBlockEntry[];
};

type AdminSelectionModalProps = {
  open: boolean;
  mode: AdminSelectionModalMode | null;
  selectedDates: string[];
  bookings: ServicoResponse[];
  onClose: () => void;
  onConfirmBlock: (payload: BlockConfirmPayload) => void | Promise<void>;
  onConfirmCancel: (bookingIds: string[]) => void | Promise<void>;
};

const TIME_OPTIONS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'] as const;

type DayDraft = {
  date: string;
  selected: boolean;
  times: string[];
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(`${date}T12:00:00`));
}

function bookingName(booking: ServicoResponse) {
  return `${booking.clientFirstName ?? ''} ${booking.clientLastName ?? ''}`.trim() || booking.serviceType || 'Agendamento';
}

export default function AdminSelectionModal({
  open,
  mode,
  selectedDates,
  bookings,
  onClose,
  onConfirmBlock,
  onConfirmCancel,
}: AdminSelectionModalProps) {
  const [blockMode, setBlockMode] = useState<AdminBlockMode>('full-day');
  const [draftDays, setDraftDays] = useState<DayDraft[]>([]);
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !mode) return;

    if (mode === 'block') {
      setBlockMode('full-day');
      setDraftDays(selectedDates.map((date) => ({ date, selected: true, times: [...TIME_OPTIONS] })));
      return;
    }

    setSelectedBookingIds(mode === 'cancel' ? bookings.map((booking) => booking.eventId) : []);
  }, [bookings, mode, open, selectedDates]);

  const groupedBookings = useMemo(() => {
    const map = new Map<string, ServicoResponse[]>();
    [...bookings]
      .sort((left, right) => left.start.localeCompare(right.start))
      .forEach((booking) => {
        const key = booking.start.slice(0, 10);
        const current = map.get(key) ?? [];
        current.push(booking);
        map.set(key, current);
      });
    return Array.from(map.entries());
  }, [bookings]);

  if (!open || !mode) return null;

  const activeDays = draftDays.filter((day) => day.selected);
  const selectedBookings = selectedBookingIds.length;

  const title = mode === 'block' ? 'Bloquear seleção' : mode === 'cancel' ? 'Cancelar agendamentos' : 'Agendamentos selecionados';
  const description = mode === 'block'
    ? 'Revise os dias selecionados e ajuste os horários antes de confirmar o bloqueio.'
    : mode === 'cancel'
      ? 'Os cards já vêm marcados. Desmarque o que deve permanecer ativo.'
      : 'Visualize os agendamentos encontrados. Se quiser, selecione alguns para cancelar.';

  return (
    <div className="admin-selection-modal" role="dialog" aria-modal="true">
      <button type="button" className="admin-selection-modal__backdrop" onClick={onClose} aria-label="Fechar modal" />

      <section className="admin-selection-modal__card">
        <header className="admin-selection-modal__header">
          <div>
            <span className="admin-selection-modal__eyebrow">Admin</span>
            <h3 className="admin-selection-modal__title">{title}</h3>
            <p className="admin-selection-modal__description">{description}</p>
          </div>

          <button type="button" className="admin-selection-modal__close" onClick={onClose}>
            ×
          </button>
        </header>

        {mode === 'block' ? (
          <>
            <div className="admin-selection-modal__mode-switch">
              <button
                type="button"
                className={['admin-selection-modal__mode-button', blockMode === 'full-day' ? 'admin-selection-modal__mode-button--active' : ''].filter(Boolean).join(' ')}
                onClick={() => setBlockMode('full-day')}
              >
                Dia inteiro
              </button>
              <button
                type="button"
                className={['admin-selection-modal__mode-button', blockMode === 'specific-hours' ? 'admin-selection-modal__mode-button--active' : ''].filter(Boolean).join(' ')}
                onClick={() => setBlockMode('specific-hours')}
              >
                Horários específicos
              </button>
            </div>

            <div className="admin-selection-modal__list">
              {draftDays.map((day) => (
                <article key={day.date} className="admin-selection-card">
                  <label className="admin-selection-card__header">
                    <input
                      type="checkbox"
                      checked={day.selected}
                      onChange={() => setDraftDays((current) => current.map((item) => item.date === day.date ? { ...item, selected: !item.selected } : item))}
                    />
                    <div>
                      <strong>{formatDate(day.date)}</strong>
                      <span>{day.date}</span>
                    </div>
                  </label>

                  {blockMode === 'specific-hours' ? (
                    <div className="admin-selection-card__chips">
                      {TIME_OPTIONS.map((time) => {
                        const active = day.times.includes(time);
                        return (
                          <button
                            key={`${day.date}-${time}`}
                            type="button"
                            className={['admin-selection-card__chip', active ? 'admin-selection-card__chip--active' : ''].filter(Boolean).join(' ')}
                            onClick={() => setDraftDays((current) => current.map((item) => {
                              if (item.date !== day.date) return item;
                              return {
                                ...item,
                                times: active ? item.times.filter((value) => value !== time) : [...item.times, time].sort(),
                              };
                            }))}
                            disabled={!day.selected}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="admin-selection-card__hint">Todos os horários do dia serão bloqueados.</p>
                  )}
                </article>
              ))}
            </div>

            <footer className="admin-selection-modal__footer">
              <button type="button" className="admin-selection-modal__secondary" onClick={onClose}>Fechar</button>
              <button
                type="button"
                className="admin-selection-modal__primary"
                disabled={activeDays.length === 0 || (blockMode === 'specific-hours' && activeDays.every((day) => day.times.length === 0))}
                onClick={() => onConfirmBlock({
                  mode: blockMode,
                  entries: activeDays.map((day) => ({ date: day.date, times: day.times })),
                })}
              >
                Confirmar bloqueio
              </button>
            </footer>
          </>
        ) : (
          <>
            <div className="admin-selection-modal__list admin-selection-modal__list--bookings">
              {groupedBookings.length === 0 ? (
                <div className="admin-selection-modal__empty">
                  <strong>Nenhum agendamento encontrado</strong>
                  <span>Não existem agendamentos dentro dos dias selecionados.</span>
                </div>
              ) : groupedBookings.map(([date, items]) => (
                <section key={date} className="admin-selection-booking-group">
                  <header className="admin-selection-booking-group__header">
                    <strong>{formatDate(date)}</strong>
                  </header>

                  <div className="admin-selection-booking-group__list">
                    {items.map((booking) => {
                      const active = selectedBookingIds.includes(booking.eventId);
                      return (
                        <button
                          key={booking.eventId}
                          type="button"
                          className={['admin-selection-booking-card', active ? 'admin-selection-booking-card--active' : ''].filter(Boolean).join(' ')}
                          onClick={() => setSelectedBookingIds((current) => active ? current.filter((id) => id !== booking.eventId) : [...current, booking.eventId])}
                        >
                          <div className="admin-selection-booking-card__top">
                            <strong>{bookingName(booking)}</strong>
                            <span>{booking.start.slice(11, 16)}</span>
                          </div>
                          <span>{booking.clientAddressLine || booking.clientCity}</span>
                          <small>{booking.serviceType}</small>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <footer className="admin-selection-modal__footer">
              <button type="button" className="admin-selection-modal__secondary" onClick={onClose}>Fechar</button>
              <button
                type="button"
                className="admin-selection-modal__primary"
                disabled={selectedBookings === 0}
                onClick={() => onConfirmCancel(selectedBookingIds)}
              >
                {mode === 'cancel' ? 'Cancelar agendamentos' : 'Cancelar selecionados'}
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
