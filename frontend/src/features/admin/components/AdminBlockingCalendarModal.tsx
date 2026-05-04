import { useEffect, useMemo, useState } from 'react';
import type { ServicoResponse, AvailabilityBlockResponse } from '../../../types/api';
import type { AdminBlockEntry, AdminBlockMode } from '../api/manage-admin-blocks';

const TIME_OPTIONS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'] as const;
const CANCEL_CONFIRMATION_TEXT = 'CANCELAR SERVIÇOS';

type AdminBlockingCalendarModalProps = {
  open: boolean;
  currentMonth: string;
  currentAllowedMonth: string;
  nextAllowedMonth: string;
  bookings: ServicoResponse[];
  blocks: AvailabilityBlockResponse[];
  blockedDates: string[];
  scheduleBlockedDates?: string[];
  onClose: () => void;
  onMonthChange: (month: string) => void;
  onBlockDays: (payload: { mode: AdminBlockMode; entries: AdminBlockEntry[]; bookingIdsToCancel: string[] }) => Promise<void> | void;
  onCancelBookings: (bookingIds: string[]) => Promise<void> | void;
  onUnblockDates: (dates: string[]) => Promise<void> | void;
};

type CalendarCell = {
  date: string;
  label: string;
  outsideMonth: boolean;
};

function toLocalDate(dateString: string): Date {
  return new Date(`${dateString}T12:00:00`);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftMonth(monthStart: string, delta: number): string {
  const base = toLocalDate(monthStart);
  const next = new Date(base.getFullYear(), base.getMonth() + delta, 1);
  return toIsoDate(next).slice(0, 7) + '-01';
}

function formatMonth(monthStart: string) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(toLocalDate(monthStart));
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
    .format(toLocalDate(date))
    .replace('.', '');
}

function buildCalendarCells(monthStart: string): CalendarCell[] {
  const first = toLocalDate(monthStart);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    const date = toIsoDate(current);

    return {
      date,
      label: `${current.getDate()}`,
      outsideMonth: date.slice(0, 7) !== monthStart.slice(0, 7),
    } satisfies CalendarCell;
  });
}

function blockDate(block: AvailabilityBlockResponse) {
  return block.start.slice(0, 10);
}

function bookingDate(booking: ServicoResponse) {
  return booking.start.slice(0, 10);
}

function bookingName(booking: ServicoResponse) {
  return `${booking.clientFirstName ?? ''} ${booking.clientLastName ?? ''}`.trim() || booking.serviceType || 'Agendamento';
}

function selectedTimesForDate(selectedTimes: Record<string, string[]>, date: string) {
  return selectedTimes[date] ?? [];
}

export default function AdminBlockingCalendarModal({
  open,
  currentMonth,
  currentAllowedMonth,
  nextAllowedMonth,
  bookings,
  blocks,
  blockedDates,
  scheduleBlockedDates = [],
  onClose,
  onMonthChange,
  onBlockDays,
  onCancelBookings,
  onUnblockDates,
}: AdminBlockingCalendarModalProps) {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [blockMode, setBlockMode] = useState<AdminBlockMode>('full-day');
  const [selectedTimes, setSelectedTimes] = useState<Record<string, string[]>>({});
  const [confirmationText, setConfirmationText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedDates([]);
    setBlockMode('full-day');
    setSelectedTimes({});
    setConfirmationText('');
  }, [open]);

  const blockedDateSet = useMemo(() => new Set(blockedDates), [blockedDates]);
  const scheduleBlockedDateSet = useMemo(() => new Set(scheduleBlockedDates), [scheduleBlockedDates]);
  const calendarCells = useMemo(() => buildCalendarCells(currentMonth), [currentMonth]);
  const blocksByDate = useMemo(() => {
    const map = new Map<string, AvailabilityBlockResponse[]>();
    blocks.forEach((block) => {
      const date = blockDate(block);
      const list = map.get(date) ?? [];
      list.push(block);
      map.set(date, list);
    });
    return map;
  }, [blocks]);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, ServicoResponse[]>();
    bookings.forEach((booking) => {
      const date = bookingDate(booking);
      const list = map.get(date) ?? [];
      list.push(booking);
      map.set(date, list.sort((left, right) => left.start.localeCompare(right.start)));
    });
    return map;
  }, [bookings]);

  const selectedBookings = useMemo(
    () => selectedDates.flatMap((date) => {
      const dayBookings = bookingsByDate.get(date) ?? [];
      if (blockMode === 'full-day' || blockedDateSet.has(date)) {
        return dayBookings;
      }

      const selectedTimesForDay = new Set(selectedTimesForDate(selectedTimes, date));
      return dayBookings.filter((booking) => selectedTimesForDay.has(booking.start.slice(11, 16)));
    }),
    [blockMode, blockedDateSet, bookingsByDate, selectedDates, selectedTimes],
  );
  const selectedBookingIds = useMemo(
    () => Array.from(new Set(selectedBookings.map((booking) => booking.eventId))),
    [selectedBookings],
  );
  const selectedOnlyBlocked = selectedDates.length > 0 && selectedDates.every((date) => blockedDateSet.has(date));
  const hasSelectedBookings = selectedBookingIds.length > 0;
  const confirmationRequired = hasSelectedBookings && !selectedOnlyBlocked;
  const confirmationOk = !confirmationRequired || confirmationText.trim().toUpperCase() === CANCEL_CONFIRMATION_TEXT;
  const hasValidHourSelection = blockMode === 'full-day'
    || selectedDates.every((date) => selectedTimesForDate(selectedTimes, date).length > 0);
  const primaryDisabled = selectedDates.length === 0 || submitting || (!selectedOnlyBlocked && (!hasValidHourSelection || !confirmationOk));
  const cancelDisabled = selectedBookingIds.length === 0 || submitting || confirmationText.trim().toUpperCase() !== CANCEL_CONFIRMATION_TEXT;

  if (!open) return null;

  const toggleDate = (date: string) => {
    if (date < currentAllowedMonth || date > shiftMonth(nextAllowedMonth, 1)) return;
    if (scheduleBlockedDateSet.has(date)) return;

    setSelectedDates((current) => {
      const active = current.includes(date);
      const next = active ? current.filter((item) => item !== date) : [...current, date].sort();
      setConfirmationText('');
      return next;
    });

    setSelectedTimes((current) => ({
      ...current,
      [date]: current[date] ?? [...TIME_OPTIONS],
    }));
  };

  const toggleTime = (date: string, time: string) => {
    setSelectedTimes((current) => {
      const times = current[date] ?? [...TIME_OPTIONS];
      const active = times.includes(time);
      return {
        ...current,
        [date]: active ? times.filter((item) => item !== time) : [...times, time].sort(),
      };
    });
  };

  const handlePrimaryAction = async () => {
    if (primaryDisabled) return;

    setSubmitting(true);
    try {
      if (selectedOnlyBlocked) {
        await onUnblockDates(selectedDates);
      } else {
        await onBlockDays({
          mode: blockMode,
          bookingIdsToCancel: selectedBookingIds,
          entries: selectedDates.map((date) => ({
            date,
            times: blockMode === 'specific-hours' ? selectedTimesForDate(selectedTimes, date) : undefined,
          })),
        });
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelServices = async () => {
    if (cancelDisabled) return;

    setSubmitting(true);
    try {
      await onCancelBookings(selectedBookingIds);
      setConfirmationText('');
    } finally {
      setSubmitting(false);
    }
  };

  const primaryLabel = selectedOnlyBlocked ? 'Desbloquear dias' : 'Bloquear serviços';

  return (
    <div className="admin-blocking-modal" role="dialog" aria-modal="true" aria-label="Gerenciar bloqueios administrativos">
      <button type="button" className="admin-blocking-modal__backdrop" onClick={onClose} aria-label="Fechar bloqueios" />

      <section className="admin-blocking-modal__card">
        <header className="admin-blocking-modal__header">
          <div>
            <span className="admin-blocking-modal__eyebrow">Bloqueios admin</span>
            <h3>Calendário de bloqueios</h3>
            <p>Selecione dias para bloquear, desbloquear ou cancelar serviços.</p>
          </div>
          <button type="button" className="admin-blocking-modal__close" onClick={onClose} aria-label="Fechar">×</button>
        </header>

        <div className="admin-blocking-modal__toolbar">
          <button type="button" onClick={() => onMonthChange(shiftMonth(currentMonth, -1))} disabled={currentMonth <= currentAllowedMonth}>‹</button>
          <strong>{formatMonth(currentMonth)}</strong>
          <button type="button" onClick={() => onMonthChange(shiftMonth(currentMonth, 1))} disabled={currentMonth >= nextAllowedMonth}>›</button>
        </div>

        <div className="admin-blocking-modal__legend" aria-label="Legenda do calendário de bloqueios">
          <span><i className="admin-blocking-modal__legend-dot admin-blocking-modal__legend-dot--booking" />Com agendamentos</span>
          <span><i className="admin-blocking-modal__legend-dot admin-blocking-modal__legend-dot--blocked" />Bloqueado</span>
          <span><i className="admin-blocking-modal__legend-dot admin-blocking-modal__legend-dot--schedule" />Escala 4x4</span>
          <span><i className="admin-blocking-modal__legend-dot admin-blocking-modal__legend-dot--selected" />Selecionado</span>
        </div>

        <div className="admin-blocking-modal__grid" aria-label="Calendário para seleção de dias">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((weekday) => (
            <span key={weekday} className="admin-blocking-modal__weekday">{weekday}</span>
          ))}

          {calendarCells.map((cell) => {
            const selected = selectedDates.includes(cell.date);
            const blocked = blockedDateSet.has(cell.date);
            const scheduleBlocked = scheduleBlockedDateSet.has(cell.date);
            const dayBookings = bookingsByDate.get(cell.date) ?? [];
            const dayBlocks = blocksByDate.get(cell.date) ?? [];
            const disabled = cell.date < currentAllowedMonth
              || cell.date > shiftMonth(nextAllowedMonth, 1)
              || scheduleBlocked;
            const indicator = scheduleBlocked
              ? '4x4'
              : dayBookings.length > 0
                ? `${dayBookings.length} serv.`
                : dayBlocks.length > 0
                  ? `${dayBlocks.length} bloq.`
                  : blocked
                    ? 'Bloq.'
                    : '';

            return (
              <button
                key={cell.date}
                type="button"
                className={[
                  'admin-blocking-modal__day',
                  cell.outsideMonth ? 'admin-blocking-modal__day--muted' : '',
                  selected ? 'admin-blocking-modal__day--selected' : '',
                  blocked ? 'admin-blocking-modal__day--blocked' : '',
                  scheduleBlocked ? 'admin-blocking-modal__day--schedule-blocked' : '',
                  dayBookings.length > 0 ? 'admin-blocking-modal__day--has-bookings' : '',
                ].filter(Boolean).join(' ')}
                disabled={disabled}
                onClick={() => toggleDate(cell.date)}
                aria-pressed={selected}
                title={scheduleBlocked ? 'Indisponível pela escala 4x4' : undefined}
              >
                <strong>{cell.label}</strong>
                <span>{indicator}</span>
              </button>
            );
          })}
        </div>

        <aside className="admin-blocking-modal__side">
          <section className="admin-blocking-modal__selection">
            <strong>{selectedDates.length} {selectedDates.length === 1 ? 'dia selecionado' : 'dias selecionados'}</strong>
            <span>
              {selectedDates.length === 0
                ? 'Clique nos dias do calendário para começar.'
                : selectedDates.map(formatShortDate).join(' • ')}
            </span>
          </section>

          {!selectedOnlyBlocked ? (
            <section className="admin-blocking-modal__mode">
              <span>Tipo de bloqueio</span>
              <label>
                <input type="radio" checked={blockMode === 'full-day'} onChange={() => setBlockMode('full-day')} />
                Dia inteiro
              </label>
              <label>
                <input type="radio" checked={blockMode === 'specific-hours'} onChange={() => setBlockMode('specific-hours')} />
                Horários específicos
              </label>
            </section>
          ) : null}

          {!selectedOnlyBlocked && blockMode === 'specific-hours' && selectedDates.length > 0 ? (
            <section className="admin-blocking-modal__hours">
              <span>Horários que serão bloqueados</span>
              {selectedDates.map((date) => (
                <div key={date} className="admin-blocking-modal__hours-group">
                  <strong>{formatShortDate(date)}</strong>
                  <div>
                    {TIME_OPTIONS.map((time) => {
                      const active = selectedTimesForDate(selectedTimes, date).includes(time);
                      return (
                        <button
                          key={`${date}-${time}`}
                          type="button"
                          className={active ? 'admin-blocking-modal__time admin-blocking-modal__time--active' : 'admin-blocking-modal__time'}
                          onClick={() => toggleTime(date, time)}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {selectedBookings.length > 0 ? (
            <section className="admin-blocking-modal__conflicts">
              <strong>{selectedBookings.length} serviço(s) nos dias selecionados</strong>
              <p>Para cancelar os serviços afetados pela seleção, escreva <b>{CANCEL_CONFIRMATION_TEXT}</b>.</p>
              <input
                value={confirmationText}
                onChange={(event) => setConfirmationText(event.target.value)}
                placeholder={CANCEL_CONFIRMATION_TEXT}
                autoComplete="off"
              />
              <div className="admin-blocking-modal__booking-list">
                {selectedBookings.slice(0, 4).map((booking) => (
                  <article key={booking.eventId}>
                    <strong>{bookingName(booking)}</strong>
                    <span>{formatShortDate(bookingDate(booking))} • {booking.start.slice(11, 16)}</span>
                  </article>
                ))}
              </div>
            </section>
          ) : (
            <section className="admin-blocking-modal__empty-note">
              <strong>Sem serviços nos dias selecionados</strong>
              <span>O bloqueio será aplicado sem cancelamentos.</span>
            </section>
          )}
        </aside>

        <footer className="admin-blocking-modal__footer">
          <button
            type="button"
            className={selectedOnlyBlocked ? 'admin-blocking-modal__primary admin-blocking-modal__primary--unlock' : 'admin-blocking-modal__primary'}
            onClick={handlePrimaryAction}
            disabled={primaryDisabled}
          >
            {submitting ? 'Processando...' : primaryLabel}
          </button>
          <button
            type="button"
            className="admin-blocking-modal__danger"
            onClick={handleCancelServices}
            disabled={cancelDisabled}
          >
            Cancelar serviços
          </button>
        </footer>
      </section>
    </div>
  );
}
