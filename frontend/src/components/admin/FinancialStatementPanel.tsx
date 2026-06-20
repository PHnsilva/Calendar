import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
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

function formatAmountInput(value: number | null): string {
  if (!value || value <= 0) return '';
  return value.toFixed(2).replace('.', ',');
}

function parseAmountInput(value: string): number | null {
  const normalized = value.replace(/[^\d,.-]/g, '').replace(/\.(?=.*\.)/g, '').replace(',', '.').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? Number(parsed.toFixed(2)) : null;
}

function buildQrCodeImageUrl(payload: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(payload)}`;
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
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixAmountInput, setPixAmountInput] = useState('');
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
  const commissionAmount = useMemo(() => Number((dashboard.totalEntries * 0.12).toFixed(2)), [dashboard.totalEntries]);
  const interEnabled = Boolean(configQuery.data?.features.interPjEnabled);
  const pixConfig = useMemo(() => ({
    key: configQuery.data?.pix.key || '16055164655',
    recipientName: configQuery.data?.pix.recipientName || 'SG Pequenos Reparos',
    recipientCity: configQuery.data?.pix.recipientCity || 'Belo Horizonte',
    description: configQuery.data?.pix.description || 'Comissao socio',
  }), [configQuery.data?.pix]);
  const pixAmount = parseAmountInput(pixAmountInput);
  const pixCode = useMemo(() => buildPixPayload(pixConfig, pixAmount), [pixAmount, pixConfig]);
  const qrCodeImageUrl = pixCode ? buildQrCodeImageUrl(pixCode) : '';

  const exportStatement = () => {
    const blob = new Blob([JSON.stringify(statementQuery.data?.items ?? dashboard.transactions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `extrato-${dashboard.month}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const openPixModal = () => {
    setPixAmountInput(formatAmountInput(commissionAmount));
    setCopied(false);
    setPixModalOpen(true);
  };

  const copyPixCode = async () => {
    const code = pixCode;
    if (!code) {
      window.alert('Informe um valor valido ou deixe em branco para gerar um QR com valor livre.');
      return;
    }
    try {
      await navigator.clipboard?.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.alert(code || 'Nao foi possivel gerar o codigo Pix.');
    }
  };

  return (
    <section className="wf-admin-section admin-financial-panel admin-financial-panel--wireframe" aria-label="Comissoes e repasses">
      <header className="admin-panel-header admin-panel-header--plain admin-financial-title">
        <span className="admin-panel-header__icon"><img src={financeIcon} alt="" /></span>
        <div>
          <h1>Comissoes e repasses</h1>
          <p>Acompanhe as entradas do mes, confira a base de calculo e gere o Pix da comissao.</p>
        </div>
        <div className="admin-panel-actions">
          <button type="button" className="admin-outline-button" onClick={onOpenOfx}>Upload de arquivo OFX</button>
          <button type="button" className="admin-outline-button" onClick={exportStatement}>Exportar</button>
          <button type="button" className="admin-primary-button admin-primary-button--orange" onClick={openPixModal}>Gerar QR Pix</button>
        </div>
      </header>

      <div className="admin-financial-status-row">
        <span className={imported ? 'is-processed' : ''}>{imported ? 'OFX importado nesta sessao' : healthQuery.data?.message || 'Resumo financeiro carregado.'}</span>
        <strong>Base da comissao: {formatCurrency(dashboard.totalEntries)}</strong>
      </div>

      <FinancialSummaryCards data={dashboard} imported={imported} />

      <div className="admin-financial-layout">
        <article className="admin-financial-card admin-financial-chart-card">
          <div className="admin-section-heading">
            <div>
              <h2>Resumo financeiro</h2>
              <p>Entradas, saidas e saldo acumulado do mes.</p>
            </div>
            <strong>Este mes</strong>
          </div>
          <FinancialChart data={dashboard.chart} dualYAxis />
        </article>

        <aside className="admin-financial-side">
          <article className="admin-financial-card admin-commission-card">
            <div className="admin-section-heading">
              <div>
                <h2>Comissao do socio</h2>
                <p>QR Pix calculado sobre 12% das entradas do periodo atual.</p>
              </div>
            </div>
            <div className="admin-pix-card">
              <div className="admin-pix-amount">
                <small>12% sobre {formatCurrency(dashboard.totalEntries)}</small>
                <strong>{formatCurrency(commissionAmount)}</strong>
              </div>
              <p className="admin-commission-card__hint">Se quiser, voce pode ajustar o valor no modal antes de gerar o QR. A chave usada e {pixConfig.key}.</p>
              <button type="button" className="admin-primary-button admin-primary-button--orange" onClick={openPixModal}>Realizar Pix</button>
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

          <article className={`admin-financial-card admin-integration-card${interEnabled ? '' : ' admin-integration-card--disabled'}`} aria-disabled={!interEnabled}>
            <div className="admin-section-heading">
              <div>
                <h2>InterPJ</h2>
                <p>{interEnabled ? 'Integracao bancaria pronta para uso.' : 'Integracao bancaria indisponivel nesta configuracao.'}</p>
              </div>
              <strong>{interEnabled && healthQuery.data?.ok ? 'Online' : 'Indisponivel'}</strong>
            </div>
            <p>{interEnabled ? 'Conecte sua conta para automatizar a conciliacao.' : 'Use a importacao de OFX enquanto a integracao estiver desligada.'}</p>
          </article>
        </aside>

        <article className="admin-financial-card admin-transactions-card">
          <div className="admin-section-heading">
            <div>
              <h2>Ultimas movimentacoes</h2>
              <p>Movimentacoes carregadas do extrato automatico ou importadas por OFX.</p>
            </div>
            <strong>{monthLabel}</strong>
          </div>
          {statementQuery.isFetching ? <p className="admin-transaction-empty">Carregando movimentacoes financeiras.</p> : null}
          {!hasAdminToken ? <p className="admin-transaction-empty">Faca login administrativo para carregar o extrato.</p> : null}
          <FinancialTransactionsTable transactions={dashboard.transactions.slice(0, 8)} />
        </article>
      </div>
      {pixModalOpen ? createPortal(
        <div className="wf-modal-backdrop admin-pix-modal-backdrop" data-modal="finance-pix" onMouseDown={() => setPixModalOpen(false)}>
          <section className="admin-pix-modal" role="dialog" aria-modal="true" aria-labelledby="admin-pix-modal-title" onMouseDown={(event) => event.stopPropagation()}>
            <header className="admin-pix-modal__header">
              <div>
                <span>Pix da comissao</span>
                <h2 id="admin-pix-modal-title">Gerar QR Pix</h2>
                <p>Use o valor padrao de 12% ou ajuste antes de copiar o codigo.</p>
              </div>
              <button type="button" className="admin-pix-modal__close" onClick={() => setPixModalOpen(false)} aria-label="Fechar">×</button>
            </header>
            <label className="admin-inline-field admin-pix-modal__field">
              <span>Valor da cobranca</span>
              <input value={pixAmountInput} onChange={(event) => setPixAmountInput(event.target.value)} inputMode="decimal" placeholder="Ex.: 245,90" />
              <small>Se deixar em branco, o QR sera gerado com valor livre para quem for pagar.</small>
            </label>
            <div className="admin-pix-modal__body">
              <div className="admin-pix-modal__qr">
                {qrCodeImageUrl ? <img src={qrCodeImageUrl} alt="QR Code Pix da comissao" /> : <div className="admin-pix-modal__qr-empty">Informe um valor valido ou deixe em branco para gerar o QR livre.</div>}
              </div>
              <div className="admin-pix-code">
                <small>Chave Pix</small>
                <strong>{pixConfig.key}</strong>
                <textarea readOnly value={pixCode} placeholder="O codigo Pix aparecera aqui." />
              </div>
            </div>
            <div className="admin-pix-modal__actions">
              <button type="button" className="admin-outline-button" onClick={() => setPixModalOpen(false)}>Fechar</button>
              <button type="button" className="admin-primary-button admin-primary-button--orange" onClick={() => void copyPixCode()}>{copied ? 'Codigo copiado' : 'Copiar codigo Pix'}</button>
            </div>
          </section>
        </div>,
        document.body,
      ) : null}
    </section>
  );
}
