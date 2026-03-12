function toLocalDate(dateString: string): Date {
  return new Date(`${dateString}T12:00:00`);
}

function toMonthStart(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}-01`;
}

function shiftMonth(monthStart: string, delta: number): string {
  const base = toLocalDate(monthStart);
  return toMonthStart(new Date(base.getFullYear(), base.getMonth() + delta, 1));
}

type CalendarToolbarProps = {
  currentMonth: string;
  onMonthChange: (month: string) => void;
};

export default function CalendarToolbar({
  currentMonth,
  onMonthChange,
}: CalendarToolbarProps) {
  const currentMonthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(toLocalDate(currentMonth));

  const today = new Date();
  const currentAllowedMonth = toMonthStart(today);
  const nextAllowedMonth = toMonthStart(
    new Date(today.getFullYear(), today.getMonth() + 1, 1),
  );

  const canGoPrev = currentMonth !== currentAllowedMonth;
  const canGoNext = currentMonth !== nextAllowedMonth;

  return (
    <div className="calendar-toolbar">
      <div className="calendar-toolbar__group">
        <span className="calendar-toolbar__eyebrow">Agenda inteligente</span>
        <strong className="calendar-toolbar__title">{currentMonthLabel}</strong>
      </div>

      <div className="calendar-toolbar__controls">
        <div className="calendar-toolbar__group-buttons">
          <button
            type="button"
            className="toolbar-button"
            onClick={() => onMonthChange(shiftMonth(currentMonth, -1))}
            disabled={!canGoPrev}
            aria-label="Ir para o mês anterior permitido"
          >
            ←
          </button>

          <button
            type="button"
            className="toolbar-button"
            onClick={() => onMonthChange(shiftMonth(currentMonth, 1))}
            disabled={!canGoNext}
            aria-label="Ir para o próximo mês permitido"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}