import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import financeIcon from '../../assets/wireframes/icons/admin-finance-chart.png';
import { getFinanceConfig } from '../../features/finance/api/get-finance-config';
import { getFinanceHealth } from '../../features/finance/api/get-finance-health';
import { getStatement } from '../../features/finance/api/get-statement';
import { useAdminBookings } from '../../features/admin/hooks/useAdminBookings';
import { buildFinancialDashboardFromEntries } from '../../features/finance/services/ofx-parser';
import { buildPixPayload } from '../../features/finance/services/pix-br-code';
import type { FinancialDashboardDTO } from '../../features/finance/types';
import { getStoredAdminToken } from '../../lib/storage';
import type { AdminStatementItem } from '../../types/finance';
import { FinancialChart } from './FinancialChart';
import { FinancialSummaryCards } from './FinancialSummaryCards';
import { FinancialTransactionsTable } from './FinancialTransactionsTable';

type FinancialStatementPanelProps = {
  importedDashboard?: FinancialDashboardDTO | null;
  onOpenOfx: () => void;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return month;
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, monthNumber - 1, 1));
}

function amountFromStatementItem(item: AdminStatementItem): number {
  const cents = Number(item.amountCents ?? 0);
  const amount = Number.isFinite(cents) ? cents / 100 : 0;
  return item.kind === 'debit' ? -Math.abs(amount) : Math.abs(amount);
}

function dashboardFromStatement(items: AdminStatementItem[]): FinancialDashboardDTO {
  return buildFinancialDashboardFromEntries(items.map((item) => ({
    amount: amountFromStatementItem(item),
    category: item.subtitle || item.kind,
    date: item.date,
    id: item.id,
    time: '',
    title: item.title || item.description || 'Movimentação financeira',
  })));
}

export function FinancialStatementPanel({ importedDashboard, onOpenOfx }: FinancialStatementPanelProps) {
  const [copied, setCopied] = useState(false);
  const hasAdminToken = Boolean(getStoredAdminToken());
  const statementQuery = useQuery({
    queryKey: ['admin', 'finance', 'statement', 'wireframe'],
    queryFn: getStatement,
    enabled: hasAdminToken && !importedDashboard,
    retry: 0,
  });
  const healthQuery = useQuery({
    queryKey: ['admin', 'finance', 'health', 'wireframe'],
    queryFn: getFinanceHealth,
    enabled: hasAdminToken,
    retry: 0,
  });
  const configQuery = useQuery({
    queryKey: ['admin', 'finance', 'config', 'wireframe'],
    queryFn: getFinanceConfig,
    enabled: hasAdminToken,
    retry: 0,
  });
  const bookingsQuery = useAdminBookings({}, hasAdminToken);

  const statementDashboard = useMemo(() => dashboardFromStatement(statementQuery.data?.items ?? []), [statementQuery.data?.items]);
  const dashboard = useMemo(() => {
    const source = importedDashboard ?? statementDashboard;
    return {
      ...source,
      totalAppointments: bookingsQuery.data?.length ?? source.totalAppointments,
    };
  }, [bookingsQuery.data?.length, importedDashboard, statementDashboard]);
  const monthLabel = formatMonth(dashboard.month);
  const imported = Boolean(importedDashboard);

  const exportStatement = () => {
    const blob = new Blob([JSON.stringify(statementQuery.data?.items ?? dashboard.transactions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `extrato-${dashboard.month}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const copyPixCode = async () => {
    const config = configQuery.data?.pix;
    if (!config || dashboard.totalEntries <= 0) {
      window.alert('Configure o Pix e carregue movimentações financeiras antes de solicitar pagamento.');
      return;
    }
    const code = buildPixPayload(config, dashboard.totalEntries);
    try {
      await navigator.clipboard?.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.alert(code || 'Não foi possível gerar o código Pix.');
    }
  };

  return (
    <section className="wf-admin-section admin-financial-panel admin-financial-panel--wireframe" aria-label="Extrato financeiro">
      <header className="admin-panel-header admin-panel-header--plain admin-financial-title">
        <span className="admin-panel-header__icon"><img src={financeIcon} alt="" /></span>
        <div>
          <h1>Extrato / Financeiro</h1>
          <p>Acompanhe entradas, saídas e o desempenho financeiro do seu negócio.</p>
        </div>
        <div className="admin-panel-actions">
          <button type="button" className="admin-outline-button" onClick={onOpenOfx}>Upload de arquivo OFX</button>
          <button type="button" className="admin-outline-button" onClick={exportStatement}>Exportar</button>
          <button type="button" className="admin-primary-button admin-primary-button--orange" onClick={copyPixCode}>{copied ? 'Pix copiado' : 'Solicitar pagamento (PIX)'}</button>
        </div>
      </header>

      <div className="admin-financial-status-row">
        <span className={imported ? 'is-processed' : ''}>{imported ? 'OFX importado nesta sessão' : healthQuery.data?.message || 'Extrato carregado do backend financeiro'}</span>
        <strong>Base financeira: {formatCurrency(dashboard.totalEntries)}</strong>
      </div>

      <FinancialSummaryCards data={dashboard} imported={imported} />

      <div className="admin-financial-layout">
        <article className="admin-financial-card admin-financial-chart-card">
          <div className="admin-section-heading">
            <div>
              <h2>Resumo financeiro</h2>
              <p>Entradas, saídas e saldo acumulado do mês.</p>
            </div>
            <strong>Este mês</strong>
          </div>
          <FinancialChart data={dashboard.chart} dualYAxis />
        </article>

        <aside className="admin-financial-side">
          <article className="admin-financial-card admin-financial-actions-card">
            <div className="admin-section-heading">
              <div>
                <h2>Ações financeiras</h2>
                <p>Atalhos preparados para os fluxos financeiros.</p>
              </div>
            </div>
            <div className="admin-financial-action-grid">
              <button type="button" onClick={() => window.alert('Registro manual depende do fluxo financeiro real.')}><span>↓</span><strong>Registrar entrada</strong><small>Lançamento manual</small></button>
              <button type="button" onClick={() => window.alert('Registro manual depende do fluxo financeiro real.')}><span>↓</span><strong>Registrar saída</strong><small>Lançamento manual</small></button>
              <button type="button" onClick={() => window.alert('Transferência depende do fluxo financeiro real.')}><span>↔</span><strong>Transferência</strong><small>Entre contas</small></button>
              <button type="button" onClick={() => window.alert('Categorias dependem do fluxo financeiro real.')}><span>▥</span><strong>Categorias</strong><small>Gerenciar categorias</small></button>
            </div>
          </article>

          <article className="admin-financial-card admin-ofx-import-card">
            <div className="admin-section-heading">
              <div>
                <h2>Importar extrato (OFX)</h2>
              </div>
            </div>
            <button type="button" className="admin-ofx-drop-button" onClick={onOpenOfx}>
              <span>☁</span>
              <strong>Arraste e solte o arquivo OFX aqui</strong>
              <small>ou clique para selecionar</small>
              <em>Máx. 10MB • Arquivos OFX</em>
            </button>
          </article>

          <article className="admin-financial-card admin-integration-card" aria-disabled="true">
            <div className="admin-section-heading">
              <div>
                <h2>InterPJ (opcional)</h2>
                <p>{healthQuery.data?.provider || 'Integração contábil via InterPJ'}</p>
              </div>
              <strong>{healthQuery.data?.ok ? 'Online' : 'Em breve'}</strong>
            </div>
            <p>Conecte sua contabilidade e automatize a conciliação.</p>
          </article>
        </aside>

        <article className="admin-financial-card admin-transactions-card">
          <div className="admin-section-heading">
            <div>
              <h2>Últimas movimentações</h2>
              <p>Movimentações retornadas pelo extrato/API ou importadas por OFX.</p>
            </div>
            <strong>{monthLabel}</strong>
          </div>
          {statementQuery.isFetching ? <p className="admin-transaction-empty">Carregando movimentações financeiras.</p> : null}
          {!hasAdminToken ? <p className="admin-transaction-empty">Faça login administrativo para carregar o extrato.</p> : null}
          <FinancialTransactionsTable transactions={dashboard.transactions.slice(0, 8)} />
        </article>
      </div>
    </section>
  );
}
