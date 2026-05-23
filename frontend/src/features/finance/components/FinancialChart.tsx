import { useMemo, useRef, useState, type PointerEvent } from "react";
import type { FinancialChartPoint } from "../types";

type FinancialChartProps = {
  data: FinancialChartPoint[];
};

const chartWidth = 760;
const chartHeight = 255;
const margin = { top: 18, right: 28, bottom: 34, left: 78 };

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatAxisCurrency(value: number): string {
  if (value === 0) return "R$ 0";
  const sign = value < 0 ? "-" : "";
  return `${sign}R$ ${Math.abs(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
}

function niceCeil(value: number): number {
  if (value <= 0) return 1000;
  if (value <= 5000) return Math.ceil(value / 1000) * 1000;
  return Math.ceil(value / 10000) * 10000;
}

export function FinancialChart({ data }: FinancialChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const model = useMemo(() => {
    const plotWidth = chartWidth - margin.left - margin.right;
    const plotHeight = chartHeight - margin.top - margin.bottom;
    const positiveMax = Math.max(0, ...data.map((point) => Math.max(point.entries, point.balance)));
    const negativeMax = Math.max(0, ...data.map((point) => Math.max(point.exits, -point.balance)));
    const maxY = niceCeil(positiveMax);
    const minY = negativeMax > 0 ? -niceCeil(negativeMax) : 0;
    const domain = Math.max(1, maxY - minY);
    const xStep = data.length > 1 ? plotWidth / (data.length - 1) : plotWidth;
    const barWidth = Math.max(4, Math.min(11, plotWidth / Math.max(data.length, 1) * 0.34));
    const y = (value: number) => margin.top + ((maxY - value) / domain) * plotHeight;
    const x = (index: number) => margin.left + index * xStep;
    const ticks = Array.from(new Set([minY, 0, maxY / 3, (maxY / 3) * 2, maxY].map((tick) => Math.round(tick / 1000) * 1000))).sort((a, b) => a - b);

    return { plotWidth, plotHeight, maxY, minY, x, y, ticks, barWidth, zeroY: y(0) };
  }, [data]);

  const linePath = data
    .map((point, index) => `${index === 0 ? "M" : "L"} ${model.x(index).toFixed(2)} ${model.y(point.balance).toFixed(2)}`)
    .join(" ");

  const visibleXLabels = data.filter((_, index) => index === 0 || index === data.length - 1 || index % Math.ceil(data.length / 7) === 0);
  const activePoint = activeIndex === null ? null : data[activeIndex];
  const activeX = activeIndex === null ? 0 : model.x(activeIndex);
  const activeY = activePoint ? model.y(activePoint.balance) : 0;

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current || data.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * chartWidth;
    const index = Math.round((relativeX - margin.left) / (model.plotWidth / Math.max(data.length - 1, 1)));
    setActiveIndex(Math.max(0, Math.min(data.length - 1, index)));
  };

  return (
    <div className="wf-financial-chart">
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
          {model.ticks.map((tick) => (
            <g key={tick}>
              <line x1={margin.left} x2={chartWidth - margin.right} y1={model.y(tick)} y2={model.y(tick)} />
              <text x={margin.left - 12} y={model.y(tick) + 4}>{formatAxisCurrency(tick)}</text>
            </g>
          ))}
        </g>
        <line className="wf-financial-chart__zero" x1={margin.left} x2={chartWidth - margin.right} y1={model.zeroY} y2={model.zeroY} />
        <g className="wf-financial-chart__bars">
          {data.map((point, index) => {
            const x = model.x(index);
            const entryHeight = Math.max(0, model.zeroY - model.y(point.entries));
            const exitHeight = Math.max(0, model.y(-point.exits) - model.zeroY);
            return (
              <g key={point.day}>
                <rect className="is-entry" x={x - model.barWidth - 1} y={model.y(point.entries)} width={model.barWidth} height={entryHeight} rx="2" />
                <rect className="is-exit" x={x + 1} y={model.zeroY} width={model.barWidth} height={exitHeight} rx="2" />
              </g>
            );
          })}
        </g>
        <path className="wf-financial-chart__line" d={linePath} />
        <g className="wf-financial-chart__points">
          {data.map((point, index) => <circle key={point.day} cx={model.x(index)} cy={model.y(point.balance)} r={index === activeIndex ? 5 : 3.5} />)}
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
