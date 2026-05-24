import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import financeIcon from '../../assets/wireframes/icons/admin-finance-chart.png';
import {
  generateFakePixCode,
  mockFinancialData,
  mockProcessedFinancialData,
  type FinancialMockData,
} from '../../data/mockFinancialData';
import { FinancialChart } from './FinancialChart';
import { FinancialSummaryCards } from './FinancialSummaryCards';
import { FinancialTransactionsTable } from './FinancialTransactionsTable';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return month;
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, monthNumber - 1, 1));
}

function usePixMock(data: FinancialMockData) {
  return useMemo(() => ({
    amount: data.pixCommissionAmount,
    code: generateFakePixCode(data),
    rateLabel: `${Math.round(data.pixCommissionRate * 100)}%`,
  }), [data]);
}

export function FinancialStatementPanel() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [data, setData] = useState<FinancialMockData>(mockFinancialData);
  const [processed, setProcessed] = useState(false);
  const [copied, setCopied] = useState(false);
  const pix = usePixMock(data);
  const monthLabel = formatMonth(data.month);

  const processMockOfx = () => {
    setData(mockProcessedFinancialData);
    setProcessed(true);
    setCopied(false);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) processMockOfx();
    event.target.value = '';
  };

  const copyPixCode = async () => {
    try {
      await navigator.clipboard?.writeText(pix.code);
    } catch {
      // Clipboard availability depends on browser permissions; the visual state still confirms the action.
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="wf-admin-section admin-financial-panel" aria-label="Extrato financeiro">
      <header className="admin-panel-header">
        <span className="admin-panel-header__icon"><img src={financeIcon} alt="" /></span>
        <div>
          <small>Admin financeiro</small>
          <h1>Extrato / Financeiro</h1>
          <p>Resumo mockado de entradas, saídas, agendamentos e comissão Pix de {monthLabel}.</p>
        </div>
        <div className="admin-panel-actions">
          <input ref={inputRef} className="admin-hidden-file" type="file" accept=".ofx,application/ofx,application/x-ofx,text/plain" onChange={handleFileChange} />
          <button type="button" className="admin-outline-button" onClick={() => inputRef.current?.click()}>Upload OFX</button>
          <button type="button" className="admin-outline-button" onClick={processMockOfx}>Processar mock</button>
          <button type="button" className="admin-primary-button" onClick={copyPixCode}>Copiar Pix</button>
        </div>
      </header>

      <div className="admin-financial-status-row">
        <span className={processed ? 'is-processed' : ''}>{processed ? 'Mock OFX processado' : 'Aguardando upload mockado'}</span>
        <strong>Base da comissão: {formatCurrency(data.totalEntries)}</strong>
      </div>

      <FinancialSummaryCards data={data} imported={processed} />

      <div className="admin-financial-layout">
        <article className="admin-financial-card admin-financial-chart-card">
          <div className="admin-section-heading">
            <div>
              <h2>Resumo financeiro</h2>
              <p>Entradas, saídas e saldo acumulado do mês.</p>
            </div>
            <strong>{monthLabel}</strong>
          </div>
          <FinancialChart data={data.chart} dualYAxis />
        </article>

        <aside className="admin-financial-side">
          <article className="admin-financial-card admin-pix-card">
            <div className="admin-section-heading">
              <div>
                <h2>Pix SG</h2>
                <p>Comissão mockada calculada sobre as entradas.</p>
              </div>
              <strong>{pix.rateLabel}</strong>
            </div>
            <div className="admin-pix-amount">
              <small>Valor Pix gerado</small>
              <strong>{formatCurrency(pix.amount)}</strong>
            </div>
            <label className="admin-pix-code">
              Código copia e cola
              <textarea readOnly value={pix.code} rows={4} />
            </label>
            <button type="button" className="admin-primary-button admin-primary-button--wide" onClick={copyPixCode}>
              {copied ? 'Código copiado' : 'Copiar código Pix'}
            </button>
          </article>

          <article className="admin-financial-card admin-integration-card" aria-disabled="true">
            <div className="admin-section-heading">
              <div>
                <h2>Inter PJ</h2>
                <p>Área opcional preparada para integração bancária futura.</p>
              </div>
              <strong>Opcional</strong>
            </div>
            <button type="button" className="admin-outline-button" disabled>Conectar depois</button>
          </article>
        </aside>

        <article className="admin-financial-card admin-transactions-card">
          <div className="admin-section-heading">
            <div>
              <h2>Movimentações</h2>
              <p>Lista mockada pronta para receber transações do OFX/API.</p>
            </div>
            <strong>{data.transactions.length} registros</strong>
          </div>
          <FinancialTransactionsTable transactions={data.transactions} />
        </article>
      </div>
    </section>
  );
}
