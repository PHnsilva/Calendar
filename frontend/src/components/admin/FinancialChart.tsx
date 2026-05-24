import { useMemo, useRef, useState, type PointerEvent } from 'react';
import type { FinancialChartPoint } from '../../data/mockFinancialData';

type FinancialChartProps = {
  data: FinancialChartPoint[];
  dualYAxis?: boolean;
};

const chartWidth = 760;
const chartHeight = 255;
const baseMargin = { top: 18, right: 28, bottom: 34, left: 78 };

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatAxisCurrency(value: number): string {
  if (value === 0) return 'R$ 0';
  const sign = value < 0 ? '-' : '';
  const absolute = Math.abs(value);
  if (absolute < 1000) return `${sign}R$ ${absolute.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
  return `${sign}R$ ${(absolute / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
}

function niceCeil(value: number): number {
  if (value <= 0) return 1000;
  if (value <= 1000) return Math.ceil(value / 250) * 250;
  if (value <= 5000) return Math.ceil(value / 500) * 500;
  return Math.ceil(value / 10000) * 10000;
}

function buildTicks(min: number, max: number, includeZero = true): number[] {
  const middle = min + (max - min) / 2;
  const candidates = includeZero ? [min, 0, middle, max] : [min, middle, max];
  return Array.from(new Set(candidates.map((tick) => Math.round(tick / 250) * 250))).sort((a, b) => a - b);
}

export function FinancialChart({ data, dualYAxis = false }: FinancialChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const model = useMemo(() => {
    const margin = { ...baseMargin, right: dualYAxis ? 86 : baseMargin.right };
    const plotWidth = chartWidth - margin.left - margin.right;
    const plotHeight = chartHeight - margin.top - margin.bottom;
    const entryMax = Math.max(0, ...data.map((point) => point.entries));
    const exitMax = Math.max(0, ...data.map((point) => point.exits));
    const balanceValues = data.map((point) => point.balance);
    const balanceMinRaw = balanceValues.length ? Math.min(...balanceValues) : 0;
    const balanceMaxRaw = balanceValues.length ? Math.max(...balanceValues) : 0;
    const singlePositiveMax = Math.max(entryMax, balanceMaxRaw);
    const singleNegativeMax = Math.max(exitMax, Math.abs(Math.min(0, balanceMinRaw)));
    const amountMax = dualYAxis ? niceCeil(Math.max(1000, entryMax * 1.18)) : niceCeil(singlePositiveMax);
    const amountMin = dualYAxis && exitMax > 0 ? -niceCeil(exitMax * 1.45) : singleNegativeMax > 0 ? -niceCeil(singleNegativeMax) : 0;
    const amountDomain = Math.max(1, amountMax - amountMin);
    const balanceRange = Math.max(1, balanceMaxRaw - balanceMinRaw);
    const balancePadding = dualYAxis ? Math.max(250, balanceRange * 0.12) : 0;
    const balanceMin = dualYAxis ? balanceMinRaw >= 0 ? Math.max(0, balanceMinRaw - balancePadding) : balanceMinRaw - balancePadding : amountMin;
    const balanceMax = dualYAxis ? balanceMaxRaw + balancePadding : amountMax;
    const balanceDomain = Math.max(1, balanceMax - balanceMin);
    const xStep = data.length > 1 ? plotWidth / (data.length - 1) : plotWidth;
    const barWidth = dualYAxis ? Math.max(12, Math.min(22, xStep * 0.28)) : Math.max(4, Math.min(12, plotWidth / Math.max(data.length, 1) * 0.34));
    const amountY = (value: number) => margin.top + ((amountMax - value) / amountDomain) * plotHeight;
    const balanceY = (value: number) => margin.top + ((balanceMax - value) / balanceDomain) * plotHeight;
    const x = (index: number) => margin.left + index * xStep;
    const amountTicks = buildTicks(amountMin, amountMax);
    const balanceTicks = dualYAxis ? buildTicks(balanceMin, balanceMax, false) : [];

    return { margin, plotWidth, x, amountY, balanceY, amountTicks, balanceTicks, barWidth, zeroY: amountY(0) };
  }, [data, dualYAxis]);

  const linePath = data
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${model.x(index).toFixed(2)} ${model.balanceY(point.balance).toFixed(2)}`)
    .join(' ');
  const visibleXLabels = data.filter((_, index) => index === 0 || index === data.length - 1 || index % Math.ceil(data.length / 7) === 0);
  const activePoint = activeIndex === null ? null : data[activeIndex];
  const activeX = activeIndex === null ? 0 : model.x(activeIndex);
  const activeY = activePoint ? model.balanceY(activePoint.balance) : 0;

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current || data.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * chartWidth;
    const index = Math.round((relativeX - model.margin.left) / (model.plotWidth / Math.max(data.length - 1, 1)));
    setActiveIndex(Math.max(0, Math.min(data.length - 1, index)));
  };

  return (
    <div className="wf-financial-chart admin-financial-chart">
      <div className="wf-financial-chart__legend" aria-hidden="true">
        <span className="is-entry">Entradas</span>
        <span className="is-exit">Saídas</span>
        <span className="is-balance">Saldo acumulado</span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label="Resumo financeiro com entradas, saídas e saldo acumulado"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setActiveIndex(null)}
      >
        <g className="wf-financial-chart__grid">
          {model.amountTicks.map((tick) => (
            <g key={tick}>
              <line x1={model.margin.left} x2={chartWidth - model.margin.right} y1={model.amountY(tick)} y2={model.amountY(tick)} />
              <text x={model.margin.left - 12} y={model.amountY(tick) + 4}>{formatAxisCurrency(tick)}</text>
            </g>
          ))}
        </g>
        {dualYAxis ? (
          <g className="wf-financial-chart__balance-axis">
            {model.balanceTicks.map((tick) => (
              <text key={tick} x={chartWidth - model.margin.right + 12} y={model.balanceY(tick) + 4}>{formatAxisCurrency(tick)}</text>
            ))}
          </g>
        ) : null}
        <line className="wf-financial-chart__zero" x1={model.margin.left} x2={chartWidth - model.margin.right} y1={model.zeroY} y2={model.zeroY} />
        <g className="wf-financial-chart__bars">
          {data.map((point, index) => {
            const x = model.x(index);
            const entryHeight = Math.max(0, model.zeroY - model.amountY(point.entries));
            const exitHeight = Math.max(0, model.amountY(-point.exits) - model.zeroY);
            return (
              <g key={point.day}>
                <rect className="is-entry" x={x - model.barWidth - 2} y={model.amountY(point.entries)} width={model.barWidth} height={entryHeight} rx="5" />
                <rect className="is-exit" x={x + 2} y={model.zeroY} width={model.barWidth} height={exitHeight} rx="5" />
              </g>
            );
          })}
        </g>
        <path className="wf-financial-chart__line" d={linePath} />
        <g className="wf-financial-chart__points">
          {data.map((point, index) => <circle key={point.day} cx={model.x(index)} cy={model.balanceY(point.balance)} r={index === activeIndex ? 5 : 3.5} />)}
        </g>
        <g className="wf-financial-chart__x-axis">
          {visibleXLabels.map((point) => {
            const index = data.indexOf(point);
            return <text key={point.day} x={model.x(index)} y={chartHeight - 8}>{point.day}</text>;
          })}
        </g>
      </svg>
      {activePoint ? (
        <div className="wf-financial-chart__tooltip" style={{ left: `${(activeX / chartWidth) * 100}%`, top: `${Math.max(16, activeY - 8)}px` }}>
          <strong>{activePoint.day}</strong>
          <span>Entradas: {formatCurrency(activePoint.entries)}</span>
          <span>Saídas: {formatCurrency(activePoint.exits)}</span>
          <span>Saldo acumulado: {formatCurrency(activePoint.balance)}</span>
        </div>
      ) : null}
    </div>
  );
}
