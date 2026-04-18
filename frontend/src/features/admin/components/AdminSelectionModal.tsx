import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ServicoResponse, AvailabilityBlockResponse } from '../../../types/api';
import { previewAdminBlocks, type AdminBlockMode, type AdminBlockEntry } from '../api/manage-admin-blocks';

type AdminSelectionModalMode = 'block' | 'cancel' | 'view';

type BlockConfirmPayload = {
  mode: AdminBlockMode;
  entries: AdminBlockEntry[];
};

type AdminSelectionModalProps = {
  open: boolean;
  mode: AdminSelectionModalMode | null;
  selectedDates?: string[];
  bookings?: ServicoResponse[];
  blocks?: AvailabilityBlockResponse[];
  onClose: () => void;
  onConfirmBlock: (payload: BlockConfirmPayload) => void | Promise<void>;
  onConfirmCancel: (bookingIds: string[]) => void | Promise<void>;
  onDeleteBlock: (blockId: string) => void | Promise<void>;
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function bookingName(booking: ServicoResponse) {
  return `${booking.clientFirstName ?? ''} ${booking.clientLastName ?? ''}`.trim() || booking.serviceType || 'Agendamento';
}

function blockDate(block: AvailabilityBlockResponse) {
  return block.start.slice(0, 10);
}

export default function AdminSelectionModal({
  open,
  mode,
  selectedDates = [],
  bookings = [],
  blocks = [],
  onClose,
  onConfirmBlock,
  onConfirmCancel,
  onDeleteBlock,
}: AdminSelectionModalProps) {
  const [blockMode, setBlockMode] = useState<AdminBlockMode>('full-day');
  const [draftDays, setDraftDays] = useState<DayDraft[]>([]);
  const [selectedBookingIds, setSelectedBookingIds] = useState<string[]>([]);
  const [deletingBlockId, setDeletingBlockId] = useState('');

  const safeSelectedDates = Array.isArray(selectedDates) ? selectedDates : [];
  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safeBlocks = Array.isArray(blocks) ? blocks : [];

  useEffect(() => {
    if (!open || !mode) return;

    if (mode === 'block') {
      setBlockMode('full-day');
      setDraftDays(safeSelectedDates.map((date) => ({ date, selected: true, times: [...TIME_OPTIONS] })));
      return;
    }

    setSelectedBookingIds(mode === 'cancel' ? safeBookings.map((booking) => booking.eventId) : []);
  }, [mode, open, safeBookings, safeSelectedDates]);

  const groupedBookings = useMemo(() => {
    const map = new Map<string, ServicoResponse[]>();
    [...safeBookings]
      .sort((left, right) => left.start.localeCompare(right.start))
      .forEach((booking) => {
        const key = booking.start.slice(0, 10);
        const current = map.get(key) ?? [];
        current.push(booking);
        map.set(key, current);
      });
    return Array.from(map.entries());
  }, [safeBookings]);

  const groupedBlocks = useMemo(() => {
    const map = new Map<string, AvailabilityBlockResponse[]>();
    [...safeBlocks]
      .sort((left, right) => left.start.localeCompare(right.start))
      .forEach((block) => {
        const key = blockDate(block);
        const current = map.get(key) ?? [];
        current.push(block);
        map.set(key, current);
      });
    return Array.from(map.entries());
  }, [safeBlocks]);

  const activeDays = draftDays.filter((day) => day.selected);
  const previewQuery = useQuery({
    queryKey: ['admin-block-preview', blockMode, JSON.stringify(activeDays)],
    queryFn: () => previewAdminBlocks({
      mode: blockMode,
      entries: activeDays.map((day) => ({ date: day.date, times: day.times })),
    }),
    enabled: open && mode === 'block' && activeDays.length > 0 && (blockMode === 'full-day' || activeDays.some((day) => day.times.length > 0)),
    staleTime: 0,
    retry: 0,
  });

  if (!open || !mode) return null;

  const selectedBookings = selectedBookingIds.length;
  const title = mode === 'block' ? 'Bloquear seleção' : mode === 'cancel' ? 'Cancelar agendamentos' : 'Resumo da seleção';
  const description = mode === 'block'
    ? 'Revise os dias selecionados, consulte conflitos e confirme o bloqueio.'
    : mode === 'cancel'
      ? 'Os cards já vêm marcados. Desmarque o que deve permanecer ativo.'
      : 'Veja agendamentos e bloqueios que já ocupam os dias selecionados.';

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

            <div className="admin-selection-preview">
              <div className="admin-selection-preview__header">
                <strong>Prévia do bloqueio</strong>
                {previewQuery.isLoading ? <span>Calculando conflitos…</span> : null}
              </div>

              {previewQuery.isError ? (
                <div className="admin-selection-modal__empty">
                  <strong>Não foi possível gerar a prévia</strong>
                  <span>{previewQuery.error instanceof Error ? previewQuery.error.message : 'Falha ao consultar conflitos.'}</span>
                </div>
              ) : null}

              {!previewQuery.isError && !previewQuery.isLoading && (previewQuery.data?.length ?? 0) === 0 ? (
                <div className="admin-selection-modal__empty">
                  <strong>Sem conflitos encontrados</strong>
                  <span>Os dias selecionados estão livres dentro das regras atuais.</span>
                </div>
              ) : null}

              {previewQuery.data?.map((item) => (
                <article key={item.key} className="admin-selection-preview__card">
                  <div className="admin-selection-preview__top">
                    <strong>{formatDate(item.date)}</strong>
                    <span>{item.startTime ? `${item.startTime} — ${item.endTime}` : 'Dia inteiro'}</span>
                  </div>
                  <small>{item.preview.conflictCount} conflito(s) detectado(s)</small>
                  {item.preview.conflicts.length > 0 ? (
                    <div className="admin-selection-preview__conflicts">
                      {item.preview.conflicts.map((conflict) => (
                        <div key={conflict.eventId} className="admin-selection-preview__conflict">
                          <strong>{`${conflict.clientFirstName} ${conflict.clientLastName}`.trim() || conflict.serviceType}</strong>
                          <span>{formatDateTime(conflict.start)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
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
        ) : mode === 'cancel' ? (
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
                Cancelar agendamentos
              </button>
            </footer>
          </>
        ) : (
          <div className="admin-selection-overview">
            <section className="admin-selection-overview__section">
              <header className="admin-selection-overview__header">
                <strong>Bloqueios existentes</strong>
                <span>{blocks.length} encontrado(s)</span>
              </header>

              {groupedBlocks.length === 0 ? (
                <div className="admin-selection-modal__empty">
                  <strong>Nenhum bloqueio encontrado</strong>
                  <span>Os dias selecionados ainda não possuem regras administrativas cadastradas.</span>
                </div>
              ) : groupedBlocks.map(([date, items]) => (
                <section key={date} className="admin-selection-booking-group">
                  <header className="admin-selection-booking-group__header">
                    <strong>{formatDate(date)}</strong>
                  </header>
                  <div className="admin-selection-booking-group__list">
                    {items.map((block) => (
                      <article key={block.blockId} className="admin-selection-booking-card admin-selection-booking-card--block">
                        <div className="admin-selection-booking-card__top">
                          <strong>{block.type === 'DAY' ? 'Dia inteiro' : `${block.start.slice(11, 16)} — ${block.end.slice(11, 16)}`}</strong>
                          <button
                            type="button"
                            className="admin-selection-booking-card__danger"
                            disabled={deletingBlockId === block.blockId}
                            onClick={async () => {
                              setDeletingBlockId(block.blockId);
                              try {
                                await onDeleteBlock(block.blockId);
                              } finally {
                                setDeletingBlockId('');
                              }
                            }}
                          >
                            {deletingBlockId === block.blockId ? 'Removendo…' : 'Remover'}
                          </button>
                        </div>
                        <span>{block.reason || 'Bloqueio administrativo'}</span>
                        <small>Criado em {block.createdAt ? formatDateTime(block.createdAt) : formatDateTime(block.start)}</small>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </section>

            <section className="admin-selection-overview__section">
              <header className="admin-selection-overview__header">
                <strong>Agendamentos no período</strong>
                <span>{bookings.length} encontrado(s)</span>
              </header>

              {groupedBookings.length === 0 ? (
                <div className="admin-selection-modal__empty">
                  <strong>Nenhum agendamento encontrado</strong>
                  <span>Não existem atendimentos dentro dos dias selecionados.</span>
                </div>
              ) : groupedBookings.map(([date, items]) => (
                <section key={date} className="admin-selection-booking-group">
                  <header className="admin-selection-booking-group__header">
                    <strong>{formatDate(date)}</strong>
                  </header>
                  <div className="admin-selection-booking-group__list">
                    {items.map((booking) => (
                      <article key={booking.eventId} className="admin-selection-booking-card">
                        <div className="admin-selection-booking-card__top">
                          <strong>{bookingName(booking)}</strong>
                          <span>{booking.start.slice(11, 16)}</span>
                        </div>
                        <span>{booking.clientAddressLine || booking.clientCity}</span>
                        <small>{booking.serviceType}</small>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </section>

            <footer className="admin-selection-modal__footer">
              <button type="button" className="admin-selection-modal__secondary" onClick={onClose}>Fechar</button>
            </footer>
          </div>
        )}
      </section>
    </div>
  );
}
