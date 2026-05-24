import { useMemo, useState } from 'react';
import historyIcon from '../../assets/wireframes/icons/admin-history-clock.png';
import {
  mockFinancialHistoryPeriods,
  type FinancialHistoryPeriod,
  type FinancialPeriodStatus,
} from '../../data/mockFinancialData';
import { FinancialChart } from './FinancialChart';
import { FinancialSummaryCards } from './FinancialSummaryCards';
import { FinancialTransactionsTable } from './FinancialTransactionsTable';

const statusLabel: Record<FinancialPeriodStatus, string> = {
  PAID: 'Pago',
  PENDING: 'Pendente',
  OVERDUE: 'Vencido',
  CANCELED: 'Ignorado',
};

const statusOptions: Array<{ value: 'ALL' | FinancialPeriodStatus; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PAID', label: 'Pagos' },
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'OVERDUE', label: 'Vencidos' },
  { value: 'CANCELED', label: 'Ignorados' },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return month;
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, monthNumber - 1, 1));
}

function formatDate(date?: string): string {
  if (!date) return 'Ainda não pago';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${date}T12:00:00`));
}

function periodMatchesSearch(period: FinancialHistoryPeriod, search: string): boolean {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return true;
  const transactionText = period.transactions
    .map((transaction) => `${transaction.description} ${transaction.appointmentCode ?? ''} ${transaction.category}`)
    .join(' ');
  return `${formatMonth(period.month)} ${statusLabel[period.pixStatus]} ${period.notes} ${transactionText}`.toLowerCase().includes(normalized);
}

export function HistoryPanel() {
  const [selectedId, setSelectedId] = useState(mockFinancialHistoryPeriods[0]?.id ?? '');
  const [statusFilter, setStatusFilter] = useState<'ALL' | FinancialPeriodStatus>('ALL');
  const [search, setSearch] = useState('');

  const periods = useMemo(() => mockFinancialHistoryPeriods, []);
  const filteredPeriods = useMemo(() => periods.filter((period) => {
    const statusMatches = statusFilter === 'ALL' || period.pixStatus === statusFilter;
    return statusMatches && periodMatchesSearch(period, search);
  }), [periods, search, statusFilter]);
  const selected = filteredPeriods.find((period) => period.id === selectedId) ?? filteredPeriods[0] ?? periods[0];

  return (
    <section className="wf-admin-section admin-history-panel" aria-label="Histórico financeiro">
      <header className="admin-panel-header">
        <span className="admin-panel-header__icon"><img src={historyIcon} alt="" /></span>
        <div>
          <small>Admin histórico</small>
          <h1>Histórico</h1>
          <p>Fechamentos mensais mockados com Pix, totais, agendamentos e transações do período.</p>
        </div>
        <div className="admin-panel-actions">
          <label className="admin-inline-field">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | FinancialPeriodStatus)}>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="admin-inline-field admin-inline-field--search">
            <span>Busca</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar período, Pix ou transação" />
          </label>
        </div>
      </header>

      <div className="admin-history-layout">
        <aside className="admin-history-periods">
          <div className="admin-section-heading">
            <div>
              <h2>Períodos anteriores</h2>
              <p>{filteredPeriods.length} fechamento(s) mockado(s)</p>
            </div>
          </div>
          <div className="admin-period-list">
            {filteredPeriods.length === 0 ? <p className="admin-transaction-empty">Nenhum período encontrado.</p> : null}
            {filteredPeriods.map((period) => (
              <button
                key={period.id}
                type="button"
                className={period.id === selected.id ? 'is-active' : ''}
                onClick={() => setSelectedId(period.id)}
              >
                <span className={`admin-period-status admin-period-status--${period.pixStatus.toLowerCase()}`}>{statusLabel[period.pixStatus]}</span>
                <strong>{formatMonth(period.month)}</strong>
                <small>Total: {formatCurrency(period.totalEntries)}</small>
                <small>Agendamentos: {period.totalAppointments}</small>
                <b>Pix: {formatCurrency(period.pixCommissionAmount)}</b>
              </button>
            ))}
          </div>
        </aside>

        {selected ? (
          <section className="admin-history-detail">
            <div className="admin-history-detail__top">
              <div>
                <small>Detalhes do período</small>
                <h2>{formatMonth(selected.month)}</h2>
                <p>{selected.notes}</p>
              </div>
              <span className={`admin-period-status admin-period-status--${selected.pixStatus.toLowerCase()}`}>{statusLabel[selected.pixStatus]}</span>
            </div>

            <FinancialSummaryCards data={selected} imported />

            <div className="admin-history-detail-grid">
              <article className="admin-financial-card admin-history-pix-card">
                <h3>Pix do fechamento</h3>
                <dl>
                  <dt>Valor gerado</dt>
                  <dd>{formatCurrency(selected.pixCommissionAmount)}</dd>
                  <dt>Status</dt>
                  <dd>{statusLabel[selected.pixStatus]}</dd>
                  <dt>Pago em</dt>
                  <dd>{formatDate(selected.pixPaidAt)}</dd>
                  <dt>Base mensal</dt>
                  <dd>{formatCurrency(selected.totalEntries)}</dd>
                </dl>
              </article>

              <article className="admin-financial-card admin-history-mini-chart">
                <div className="admin-section-heading">
                  <div>
                    <h3>Movimento do período</h3>
                    <p>Gráfico interativo mockado.</p>
                  </div>
                </div>
                <FinancialChart data={selected.chart} />
              </article>
            </div>

            <article className="admin-financial-card admin-transactions-card">
              <div className="admin-section-heading">
                <div>
                  <h2>Histórico de transações</h2>
                  <p>Movimentações vinculadas ao fechamento selecionado.</p>
                </div>
                <strong>{selected.transactions.length} registros</strong>
              </div>
              <FinancialTransactionsTable transactions={selected.transactions} />
            </article>
          </section>
        ) : null}
      </div>
    </section>
  );
}
