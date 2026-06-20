import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFinanceHealth } from '../api/get-finance-health';
import { getStatement } from '../api/get-statement';
import type { ServicoResponse } from '../../../types/api';
import type { AdminStatementItem } from '../../../types/finance';

type StatementSheetProps = {
  open: boolean;
  onClose: () => void;
  bookings?: ServicoResponse[];
};

type DisplayEntry = {
  id: string;
  date: string;
  description: string;
  amount: string;
  booking?: ServicoResponse | null;
};

function formatDateLabel(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(date);
  const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(date);
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date);
  return `${weekday}, ${day} de ${month}`;
}

function bookingName(booking: ServicoResponse) {
  return `${booking.clientFirstName ?? ''} ${booking.clientLastName ?? ''}`.trim() || booking.serviceType || 'Atendimento';
}

function associateStatementToBookings(items: AdminStatementItem[], bookings: ServicoResponse[]): DisplayEntry[] {
  return items.map((item) => {
    const exactDate = bookings.find((booking) => booking.start.slice(0, 10) === item.date) ?? null;

    let nearest = exactDate;
    if (!nearest) {
      nearest = bookings.find((booking) => {
        const bookingDate = new Date(`${booking.start.slice(0, 10)}T12:00:00`).getTime();
        const statementDate = new Date(`${item.date}T12:00:00`).getTime();
        const diffDays = Math.abs(bookingDate - statementDate) / (1000 * 60 * 60 * 24);
        return diffDays <= 2;
      }) ?? null;
    }

    return {
      id: item.id,
      date: item.date,
      description: item.description,
      amount: item.amount ?? "R$ 0,00",
      booking: nearest,
    };
  });
}

export default function StatementSheet({ open, onClose, bookings = [] }: StatementSheetProps) {
  const statementQuery = useQuery({
    queryKey: ['admin', 'finance', 'statement'],
    queryFn: () => getStatement(),
    enabled: open,
    retry: 0,
  });

  const healthQuery = useQuery({
    queryKey: ['admin', 'finance', 'health'],
    queryFn: getFinanceHealth,
    enabled: open,
    retry: 0,
  });

  const entries = useMemo(() => {
    const apiItems = statementQuery.data?.items ?? [];
    return associateStatementToBookings(apiItems, bookings);
  }, [statementQuery.data?.items, bookings]);

  const groupedEntries = useMemo(() => {
    const map = new Map<string, DisplayEntry[]>();
    entries.forEach((entry) => {
      const list = map.get(entry.date) ?? [];
      list.push(entry);
      map.set(entry.date, list);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  if (!open) return null;

  return (
    <div className="admin-bottom-sheet admin-bottom-sheet--statement" role="dialog" aria-modal="false">
      <button
        type="button"
        className="admin-bottom-sheet__backdrop"
        aria-label="Fechar extrato"
        onClick={onClose}
      />
      <section className="admin-bottom-sheet__card statement-sheet">
        <header className="admin-bottom-sheet__header">
          <div>
            <span className="admin-bottom-sheet__eyebrow">Admin</span>
            <h3 className="admin-bottom-sheet__title">Extrato</h3>
          </div>
          <button type="button" className="admin-bottom-sheet__close" onClick={onClose}>×</button>
        </header>

        <div className="statement-sheet__health">
          <strong>{healthQuery.data?.ok ? 'Financeiro online' : 'Financeiro indisponível'}</strong>
          <span>{healthQuery.data?.provider ?? 'Backend financeiro não retornou status'}</span>
          <small>{healthQuery.data?.message ?? 'Nenhum lançamento financeiro foi carregado.'}</small>
        </div>

        <div className="admin-bottom-sheet__body statement-sheet__list">
          {statementQuery.isLoading ? (
            <div className="timeline-card timeline-card--empty">
              <strong>Carregando extrato</strong>
              <span>Buscando lançamentos do financeiro.</span>
            </div>
          ) : null}

          {!statementQuery.isLoading && groupedEntries.length === 0 ? (
            <div className="timeline-card timeline-card--empty">
              <strong>Sem lançamentos</strong>
              <span>Nenhuma movimentacao encontrada.</span>
            </div>
          ) : null}

          {groupedEntries.map(([date, items]) => (
            <section key={date} className="statement-sheet__date-group">
              <h4 className="statement-sheet__date-title">{formatDateLabel(date)}</h4>

              {items.map((item) => (
                <article key={item.id} className="statement-sheet__entry">
                  <div className="statement-sheet__entry-icon" aria-hidden="true">⛽</div>

                  <div className="statement-sheet__entry-content">
                    <strong>{item.booking ? bookingName(item.booking) : item.description}</strong>
                    <p>{item.description}</p>
                    {item.booking ? (
                      <small>{item.booking.start.slice(11, 16)} • {item.booking.clientCity ?? 'Cidade não informada'}</small>
                    ) : null}
                  </div>

                  <div className="statement-sheet__entry-meta">
                    <strong className="statement-sheet__amount">{item.amount || 'R$ 0,00'}</strong>
                    {item.booking ? <span>associado</span> : <span>sem vínculo</span>}
                  </div>
                </article>
              ))}
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}
