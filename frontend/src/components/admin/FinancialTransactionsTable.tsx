import type { FinancialTransaction } from '../../data/mockFinancialData';

type FinancialTransactionsTableProps = {
  transactions: FinancialTransaction[];
  compact?: boolean;
};

const statusLabel: Record<FinancialTransaction['status'], string> = {
  CONFIRMED: 'Confirmada',
  PENDING: 'Pendente',
  CANCELED: 'Cancelada',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${date}T12:00:00`));
}

function formatTransactionAmount(transaction: FinancialTransaction): string {
  const amount = transaction.type === 'EXIT' ? -Math.abs(transaction.amount) : transaction.amount;
  return formatCurrency(amount);
}

export function FinancialTransactionsTable({ transactions, compact = false }: FinancialTransactionsTableProps) {
  return (
    <div className="admin-transaction-table" role="table" aria-label="Movimentações financeiras">
      <div className="admin-transaction-row admin-transaction-row--head" role="row">
        <span>Data</span>
        <span>Descrição</span>
        <span>Tipo</span>
        <span>Categoria</span>
        <span>Agendamento</span>
        <span>Status</span>
        <span>Valor</span>
      </div>
      {transactions.length === 0 ? (
        <p className="admin-transaction-empty">Nenhuma movimentação mockada para este período.</p>
      ) : null}
      {transactions.map((transaction) => (
        <article key={transaction.id} className="admin-transaction-row" role="row">
          <span data-label="Data">{formatDate(transaction.date)}</span>
          <strong data-label="Descrição">{transaction.description}</strong>
          <span data-label="Tipo" className={transaction.type === 'ENTRY' ? 'is-entry' : 'is-exit'}>{transaction.type === 'ENTRY' ? 'Entrada' : 'Saída'}</span>
          <span data-label="Categoria">{transaction.category}</span>
          <span data-label="Agendamento">{transaction.appointmentCode ?? '-'}</span>
          <span data-label="Status" className={`admin-status-pill admin-status-pill--${transaction.status.toLowerCase()}`}>{statusLabel[transaction.status]}</span>
          <b data-label="Valor" className={transaction.type === 'ENTRY' ? 'is-entry' : 'is-exit'}>{formatTransactionAmount(transaction)}</b>
          {compact ? <small>{transaction.category}</small> : null}
        </article>
      ))}
    </div>
  );
}
