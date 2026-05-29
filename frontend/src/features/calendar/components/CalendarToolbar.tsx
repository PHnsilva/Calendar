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
  currentAllowedMonth: string;
  nextAllowedMonth: string;
  onMonthChange: (month: string) => void;
  onHelpOpen: () => void;
};

function monthLabel(monthStart: string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(toLocalDate(monthStart));
}

export default function CalendarToolbar({
  currentMonth,
  currentAllowedMonth,
  nextAllowedMonth,
  onMonthChange,
  onHelpOpen,
}: CalendarToolbarProps) {
  const currentMonthLabel = monthLabel(currentMonth);
  const currentYear = currentMonth.slice(0, 4);
  const previousMonth = shiftMonth(currentMonth, -1);
  const nextMonth = shiftMonth(currentMonth, 1);
  const canGoPrev = currentMonth > currentAllowedMonth;
  const canGoNext = currentMonth < nextAllowedMonth;

  return (
    <div className="calendar-toolbar calendar-toolbar--month-switcher">
      <button
        type="button"
        className="calendar-toolbar__help"
        onClick={onHelpOpen}
        aria-label="Abrir ajuda do calendário"
        title="Ajuda"
      >
        ?
      </button>

      <strong className="calendar-toolbar__title"><span className="calendar-toolbar__title-month">{currentMonthLabel}</span><span className="calendar-toolbar__title-separator" aria-hidden="true"> </span><span className="calendar-toolbar__title-year">{currentYear}</span></strong>

      <div className="calendar-toolbar__nav-group">
        {canGoPrev ? (
          <button
            type="button"
            className="calendar-toolbar__month-nav calendar-toolbar__month-nav--prev"
            onClick={() => onMonthChange(previousMonth)}
          >
            {monthLabel(previousMonth)}
          </button>
        ) : (
          <span className="calendar-toolbar__month-chip">mês atual</span>
        )}

        {canGoNext ? (
          <button
            type="button"
            className="calendar-toolbar__month-nav calendar-toolbar__month-nav--next"
            onClick={() => onMonthChange(nextMonth)}
          >
            {monthLabel(nextMonth)}
          </button>
        ) : (
          <span className="calendar-toolbar__month-chip">mês atual</span>
        )}
      </div>
    </div>
  );
}
