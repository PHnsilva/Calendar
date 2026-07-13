import type { FinancialDashboardDTO } from '../../features/finance/types';
import { AdminIcon, type AdminIconName } from './AdminWorkspaceUi';
import styles from './AdminWorkspaceUi.module.css';

type FinancialSummaryCardsProps = {
  data: FinancialDashboardDTO;
  imported?: boolean;
};

type SummaryCardProps = {
  hint: string;
  icon: AdminIconName;
  label: string;
  tone?: 'green' | 'purple' | 'red';
  value: string;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function SummaryCard({ hint, icon, label, tone, value }: SummaryCardProps) {
  const toneClass = tone ? styles[`summary${tone[0].toUpperCase()}${tone.slice(1)}`] : '';
  return (
    <article className={`${styles.summaryCard} ${toneClass}`}>
      <span className={styles.summaryIcon}><AdminIcon name={icon} size={21} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{hint}</em>
      </div>
    </article>
  );
}

export function FinancialSummaryCards({ data, imported = false }: FinancialSummaryCardsProps) {
  const sourceHint = imported ? 'Importado do OFX' : 'Dados do extrato';

  return (
    <section className={styles.summaryGrid} aria-label="Resumo financeiro mensal">
      <SummaryCard icon="chart" label="Total do mês" value={formatCurrency(data.totalEntries)} hint={sourceHint} />
      <SummaryCard icon="wallet" label="Saldo disponível" value={formatCurrency(data.availableBalance)} hint="Entradas menos saídas" tone="green" />
      <SummaryCard icon="entry" label="Entradas" value={formatCurrency(data.totalEntries)} hint="Recebimentos do período" tone="green" />
      <SummaryCard icon="exit" label="Saídas" value={formatCurrency(data.totalExits)} hint="Despesas do período" tone="red" />
      <SummaryCard icon="calendar" label="Agendamentos" value={`${data.totalAppointments}`} hint="Atendimentos no período" tone="purple" />
    </section>
  );
}
