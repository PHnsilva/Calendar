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
  const next = new Date(base.getFullYear(), base.getMonth() + delta, 1);
  return toMonthStart(next);
}

type CalendarToolbarProps = {
  currentMonth: string;
  onMonthChange: (month: string) => void;
  onHelpOpen: () => void;
};

export default function CalendarToolbar({
  currentMonth,
  onMonthChange,
  onHelpOpen,
}: CalendarToolbarProps) {
  const currentMonthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
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
      <button
        type="button"
        className="calendar-toolbar__help"
        onClick={onHelpOpen}
        aria-label="Abrir ajuda do calendário"
        title="Ajuda"
      >
        ?
      </button>

      <strong className="calendar-toolbar__title">{currentMonthLabel}</strong>

      <div className="calendar-toolbar__nav-group">
        <button
          type="button"
          className="calendar-toolbar__nav"
          onClick={() => onMonthChange(shiftMonth(currentMonth, -1))}
          disabled={!canGoPrev}
        >
          Ant
        </button>

        <button
          type="button"
          className="calendar-toolbar__nav"
          onClick={() => onMonthChange(shiftMonth(currentMonth, 1))}
          disabled={!canGoNext}
        >
          Próx
        </button>
      </div>
    </div>
  );
}