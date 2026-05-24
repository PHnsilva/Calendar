import type { FinancialMockData } from '../../data/mockFinancialData';

type FinancialSummaryCardsProps = {
  data: FinancialMockData;
  imported?: boolean;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function FinancialSummaryCards({ data, imported = false }: FinancialSummaryCardsProps) {
  const baseHint = imported ? 'Mock OFX processado' : 'Dados mockados do mês';

  return (
    <section className="admin-financial-summary" aria-label="Resumo financeiro mensal">
      <article className="admin-financial-summary-card admin-financial-summary-card--blue">
        <span className="admin-financial-summary-card__icon">R$</span>
        <div>
          <small>Total do mês</small>
          <strong>{formatCurrency(data.totalEntries)}</strong>
          <em>{baseHint}</em>
        </div>
      </article>
      <article className="admin-financial-summary-card admin-financial-summary-card--green">
        <span className="admin-financial-summary-card__icon">+</span>
        <div>
          <small>Saldo disponível</small>
          <strong>{formatCurrency(data.availableBalance)}</strong>
          <em>Entradas menos saídas</em>
        </div>
      </article>
      <article className="admin-financial-summary-card admin-financial-summary-card--purple">
        <span className="admin-financial-summary-card__icon">#</span>
        <div>
          <small>Total de agendamentos</small>
          <strong>{data.totalAppointments}</strong>
          <em>Atendimentos no período</em>
        </div>
      </article>
      <article className="admin-financial-summary-card admin-financial-summary-card--orange">
        <span className="admin-financial-summary-card__icon">12%</span>
        <div>
          <small>Pix SG</small>
          <strong>{formatCurrency(data.pixCommissionAmount)}</strong>
          <em>Comissão sobre entradas</em>
        </div>
      </article>
    </section>
  );
}
