import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
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
import {
  AdminButton,
  AdminIcon,
  AdminPageHeader,
  AdminSectionHeader,
  AdminState,
  AdminStatusBadge,
} from './AdminWorkspaceUi';
import styles from './AdminWorkspaceUi.module.css';

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
  const [qrImageError, setQrImageError] = useState(false);
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
    description: configQuery.data?.pix.description || 'Comissão do sócio',
  }), [configQuery.data?.pix]);
  const pixAmount = parseAmountInput(pixAmountInput);
  const pixCode = useMemo(() => buildPixPayload(pixConfig, pixAmount), [pixAmount, pixConfig]);
  const qrCodeImageUrl = pixCode ? buildQrCodeImageUrl(pixCode) : '';
  const hasStatementData = imported || Boolean(statementQuery.data);
  const isInitialLoading = !imported && statementQuery.isFetching && !statementQuery.data;

  useEffect(() => {
    if (!pixModalOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPixModalOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [pixModalOpen]);

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
    setQrImageError(false);
    setPixModalOpen(true);
  };

  const copyPixCode = async () => {
    if (!pixCode) {
      window.alert('Informe um valor válido ou deixe em branco para gerar um QR com valor livre.');
      return;
    }
    try {
      await navigator.clipboard?.writeText(pixCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.alert(pixCode || 'Não foi possível gerar o código Pix.');
    }
  };

  const refreshFinance = () => {
    void Promise.all([statementQuery.refetch(), healthQuery.refetch(), configQuery.refetch(), bookingsQuery.refetch()]);
  };

  return (
    <section className={styles.page} aria-labelledby="admin-statement-title">
      <div id="admin-statement-title">
        <AdminPageHeader
          icon="wallet"
          title="Extrato"
          description="Acompanhe entradas, saídas, saldo, repasses e movimentações financeiras em um só lugar."
          actions={(
            <>
              <AdminButton icon="upload" onClick={onOpenOfx}>Importar OFX</AdminButton>
              <AdminButton icon="download" onClick={exportStatement} disabled={!hasStatementData && !imported}>Exportar</AdminButton>
              <AdminButton icon="pix" tone="primary" onClick={openPixModal}>Gerar QR Pix</AdminButton>
            </>
          )}
        />
      </div>

      {!hasAdminToken ? <AdminState tone="error" title="Não foi possível abrir o extrato" description="Entre novamente para acessar esta área administrativa." /> : null}
      {hasAdminToken && isInitialLoading ? <AdminState tone="loading" title="Carregando extrato" description="Buscando as movimentações financeiras do período." /> : null}
      {hasAdminToken && statementQuery.isError && !imported ? (
        <AdminState
          tone="error"
          title="Extrato indisponível"
          description="Não foi possível carregar as movimentações agora. Você ainda pode importar um arquivo OFX."
          action={<AdminButton icon="refresh" onClick={refreshFinance}>Tentar novamente</AdminButton>}
        />
      ) : null}

      {hasAdminToken ? (
        <>
          <div className={styles.statusStrip} role="status">
            <span><AdminIcon name={imported ? 'check' : healthQuery.isError ? 'warning' : 'refresh'} size={16} />{imported ? 'Arquivo OFX importado nesta sessão' : healthQuery.data?.message || (healthQuery.isError ? 'Atualização bancária indisponível no momento' : 'Extrato atualizado')}</span>
            <strong><AdminIcon name="chart" size={16} />Base da comissão: {formatCurrency(dashboard.totalEntries)}</strong>
          </div>

          <FinancialSummaryCards data={dashboard} imported={imported} />

          <div className={styles.financialLayout}>
            <article className={`${styles.panel} ${styles.financialMain}`}>
              <AdminSectionHeader icon="chart" title="Resumo financeiro" description="Entradas, saídas e saldo acumulado no mês." meta={<AdminStatusBadge tone="info">{monthLabel}</AdminStatusBadge>} />
              <FinancialChart data={dashboard.chart} dualYAxis />
            </article>

            <aside className={styles.financialSide}>
              <article className={`${styles.panel} ${styles.financialMain}`}>
                <AdminSectionHeader icon="pix" title="Comissão do sócio" description="Cálculo de 12% sobre as entradas do período." />
                <div className={styles.amountBox}>
                  <small>12% sobre {formatCurrency(dashboard.totalEntries)}</small>
                  <strong>{formatCurrency(commissionAmount)}</strong>
                </div>
                <p className={styles.cardCopy}>O valor pode ser ajustado antes de gerar o código de pagamento.</p>
                <AdminButton icon="pix" tone="primary" onClick={openPixModal}>Gerar pagamento Pix</AdminButton>
              </article>

              <article className={`${styles.panel} ${styles.financialMain}`}>
                <AdminSectionHeader icon="upload" title="Importar OFX" description="Atualize o extrato com um arquivo do banco." />
                <button type="button" className={styles.actionTile} onClick={onOpenOfx}>
                  <AdminIcon name="upload" size={22} />
                  <span><strong>Selecionar arquivo OFX</strong><small>Arquivo de até 10 MB</small></span>
                  <AdminIcon name="chevron-right" size={18} />
                </button>
              </article>

              <article className={`${styles.panel} ${styles.financialMain}`} aria-disabled={!interEnabled}>
                <AdminSectionHeader
                  icon="bank"
                  title="Inter PJ"
                  description={interEnabled ? 'Integração bancária configurada.' : 'Conexão bancária indisponível nesta configuração.'}
                  meta={<AdminStatusBadge tone={interEnabled && healthQuery.data?.ok ? 'success' : 'neutral'}>{interEnabled && healthQuery.data?.ok ? 'Online' : 'Indisponível'}</AdminStatusBadge>}
                />
                <p className={styles.cardCopy}>{interEnabled ? 'A conciliação automática está disponível para a conta conectada.' : 'Use a importação OFX enquanto a conexão estiver desligada.'}</p>
              </article>
            </aside>

            <article className={`${styles.panel} ${styles.transactionsPanel}`}>
              <AdminSectionHeader icon="wallet" title="Últimas movimentações" description="Entradas e saídas carregadas automaticamente ou via OFX." meta={<AdminStatusBadge tone="info">{monthLabel}</AdminStatusBadge>} />
              {statementQuery.isFetching && hasStatementData ? <AdminState tone="loading" title="Atualizando movimentações" description="Mantendo os dados atuais enquanto buscamos novidades." /> : null}
              {!statementQuery.isFetching && dashboard.transactions.length === 0 ? <AdminState title="Nenhuma movimentação encontrada" description="Importe um arquivo OFX ou tente atualizar o extrato mais tarde." action={<AdminButton icon="upload" onClick={onOpenOfx}>Importar OFX</AdminButton>} /> : null}
              <FinancialTransactionsTable transactions={dashboard.transactions.slice(0, 8)} />
            </article>
          </div>
        </>
      ) : null}

      {pixModalOpen ? createPortal(
        <div className={styles.pixBackdrop} data-modal="finance-pix" onMouseDown={() => setPixModalOpen(false)}>
          <section className={styles.pixModal} role="dialog" aria-modal="true" aria-labelledby="admin-pix-modal-title" aria-describedby="admin-pix-modal-description" onMouseDown={(event) => event.stopPropagation()}>
            <header className={styles.pixHeader}>
              <span className={styles.summaryIcon}><AdminIcon name="pix" size={21} /></span>
              <div>
                <h2 id="admin-pix-modal-title">Gerar QR Pix</h2>
                <p id="admin-pix-modal-description">Use o valor calculado ou ajuste antes de copiar o código.</p>
              </div>
              <button type="button" className={styles.pixClose} onClick={() => setPixModalOpen(false)} aria-label="Fechar modal Pix">
                <AdminIcon name="close" size={20} />
              </button>
            </header>

            <label className={styles.field}>
              <span className={styles.fieldLabel}><AdminIcon name="wallet" size={15} /> Valor da cobrança</span>
              <input className={styles.fieldControl} value={pixAmountInput} onChange={(event) => { setPixAmountInput(event.target.value); setQrImageError(false); }} inputMode="decimal" placeholder="Ex.: 245,90" />
              <small>Deixe em branco para gerar um código sem valor definido.</small>
            </label>

            <div className={styles.pixBody}>
              <div className={styles.qrBox}>
                {qrCodeImageUrl && !qrImageError ? <img src={qrCodeImageUrl} alt="QR Code Pix da comissão" onError={() => setQrImageError(true)} /> : <AdminState tone={qrImageError ? 'error' : 'empty'} title={qrImageError ? 'QR indisponível' : 'QR sem valor definido'} description={qrImageError ? 'Não foi possível carregar a imagem. O código Pix ainda pode ser copiado.' : 'O código será gerado sem valor fixo.'} />}
              </div>
              <div className={styles.pixCode}>
                <span className={styles.fieldLabel}><AdminIcon name="pix" size={15} /> Chave Pix</span>
                <strong>{pixConfig.key}</strong>
                <label className={styles.field}>
                  <span>Código Pix</span>
                  <textarea readOnly value={pixCode} aria-label="Código Pix para copiar" />
                </label>
                {copied ? <AdminState tone="success" title="Código copiado" description="O código Pix foi enviado para a área de transferência." /> : null}
              </div>
            </div>

            <div className={styles.modalActions}>
              <AdminButton onClick={() => setPixModalOpen(false)}>Cancelar</AdminButton>
              <AdminButton icon="copy" tone="primary" onClick={() => void copyPixCode()}>{copied ? 'Código copiado' : 'Copiar código Pix'}</AdminButton>
            </div>
          </section>
        </div>,
        document.body,
      ) : null}
    </section>
  );
}
