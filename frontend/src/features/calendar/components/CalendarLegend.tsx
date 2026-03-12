type CalendarLegendProps = {
  compact?: boolean;
};

const items = [
  { key: "available", label: "Disponível" },
  { key: "unavailable", label: "Indisponível" },
  { key: "booked", label: "Com agendamento" },
  { key: "selected", label: "Selecionado" },
  { key: "today", label: "Hoje" },
] as const;

export default function CalendarLegend({ compact = false }: CalendarLegendProps) {
  return (
    <div className={`calendar-legend ${compact ? "calendar-legend--compact" : ""}`}>
      {items.map((item) => (
        <div key={item.key} className="calendar-legend__item">
          <span
            className={`legend-swatch legend-swatch--${item.key}`}
            aria-hidden="true"
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}