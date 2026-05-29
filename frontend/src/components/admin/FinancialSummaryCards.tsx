import totalIcon from '../../assets/wireframes/icons/admin-finance-total.svg';
import walletIcon from '../../assets/wireframes/icons/admin-finance-wallet.svg';
import entryIcon from '../../assets/wireframes/icons/admin-finance-entry.svg';
import exitIcon from '../../assets/wireframes/icons/admin-finance-exit.svg';
import calendarIcon from '../../assets/wireframes/icons/admin-finance-calendar.svg';
import type { FinancialDashboardDTO } from '../../features/finance/types';

type FinancialSummaryCardsProps = {
  data: FinancialDashboardDTO;
  imported?: boolean;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function FinancialSummaryCards({ data, imported = false }: FinancialSummaryCardsProps) {
  const sourceHint = imported ? 'Importado do OFX' : 'Dados do extrato';

  return (
    <section className="admin-financial-summary" aria-label="Resumo financeiro mensal">
      <article className="admin-financial-summary-card admin-financial-summary-card--blue">
        <span className="admin-financial-summary-card__icon"><img src={totalIcon} alt="" /></span>
        <div>
          <small>Total do mês</small>
          <strong>{formatCurrency(data.totalEntries)}</strong>
          <em>{sourceHint}</em>
        </div>
      </article>
      <article className="admin-financial-summary-card admin-financial-summary-card--green">
        <span className="admin-financial-summary-card__icon"><img src={walletIcon} alt="" /></span>
        <div>
          <small>Saldo disponível</small>
          <strong>{formatCurrency(data.availableBalance)}</strong>
          <em>Entradas menos saídas</em>
        </div>
      </article>
      <article className="admin-financial-summary-card admin-financial-summary-card--green">
        <span className="admin-financial-summary-card__icon"><img src={entryIcon} alt="" /></span>
        <div>
          <small>Entradas</small>
          <strong>{formatCurrency(data.totalEntries)}</strong>
          <em>Recebimentos do período</em>
        </div>
      </article>
      <article className="admin-financial-summary-card admin-financial-summary-card--red">
        <span className="admin-financial-summary-card__icon"><img src={exitIcon} alt="" /></span>
        <div>
          <small>Saídas</small>
          <strong>{formatCurrency(data.totalExits)}</strong>
          <em>Despesas do período</em>
        </div>
      </article>
      <article className="admin-financial-summary-card admin-financial-summary-card--purple">
        <span className="admin-financial-summary-card__icon"><img src={calendarIcon} alt="" /></span>
        <div>
          <small>Total de agendamentos</small>
          <strong>{data.totalAppointments}</strong>
          <em>Atendimentos no período</em>
        </div>
      </article>
    </section>
  );
}
