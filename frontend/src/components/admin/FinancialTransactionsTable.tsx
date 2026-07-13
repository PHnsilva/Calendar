import type { FinancialTransaction } from '../../features/finance/types';
import { AdminIcon, AdminStatusBadge } from './AdminWorkspaceUi';
import styles from './AdminWorkspaceUi.module.css';

type FinancialTransactionsTableProps = {
  transactions: FinancialTransaction[];
  compact?: boolean;
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
  if (transactions.length === 0) return null;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table} aria-label="Movimentações financeiras" data-compact={compact || undefined}>
        <thead>
          <tr>
            <th style={{ width: '12%' }}>Data</th>
            <th style={{ width: '24%' }}>Descrição</th>
            <th style={{ width: '10%' }}>Tipo</th>
            <th>Categoria</th>
            <th style={{ width: '13%' }}>Agendamento</th>
            <th style={{ width: '12%' }}>Status</th>
            <th className={styles.alignRight} style={{ width: '13%' }}>Valor</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction, index) => (
            <tr key={`${transaction.date}-${transaction.description}-${transaction.amount}-${index}`}>
              <td data-label="Data"><span className={styles.tablePrimary}><AdminIcon className={styles.cellIcon} name="calendar" size={16} />{formatDate(transaction.date)}</span></td>
              <td data-label="Descrição"><strong className={styles.tablePrimary}>{transaction.description}</strong></td>
              <td data-label="Tipo" className={transaction.type === 'ENTRY' ? styles.amountEntry : styles.amountExit}>
                <span className={styles.tablePrimary}><AdminIcon name={transaction.type === 'ENTRY' ? 'entry' : 'exit'} size={16} />{transaction.type === 'ENTRY' ? 'Entrada' : 'Saída'}</span>
              </td>
              <td data-label="Categoria">{transaction.category || 'Não informada'}</td>
              <td data-label="Agendamento">{transaction.appointmentCode || 'Não vinculado'}</td>
              <td data-label="Status"><AdminStatusBadge tone="success">Confirmada</AdminStatusBadge></td>
              <td data-label="Valor" className={`${styles.alignRight} ${transaction.type === 'ENTRY' ? styles.amountEntry : styles.amountExit}`}><strong>{formatTransactionAmount(transaction)}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
