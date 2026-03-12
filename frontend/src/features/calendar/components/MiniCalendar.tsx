import CalendarDateCell from "./CalendarDateCell";

function toLocalDate(dateString: string): Date {
  return new Date(`${dateString}T12:00:00`);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthDays(monthStart: string): Array<{
  date: string;
  isCurrentMonth: boolean;
}> {
  const reference = toLocalDate(monthStart);
  const firstDay = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const mondayBasedOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    1 - mondayBasedOffset,
  );

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      date: toIsoDate(date),
      isCurrentMonth: date.getMonth() === reference.getMonth(),
    };
  });
}

type MiniCalendarProps = {
  currentMonth: string;
  selectedDate: string;
  unavailableDates: string[];
  datesWithEvents?: string[];
  onDateSelect: (date: string) => void;
};

const weekLabels = ["S", "T", "Q", "Q", "S", "S", "D"];

export default function MiniCalendar({
  currentMonth,
  selectedDate,
  unavailableDates,
  datesWithEvents = [],
  onDateSelect,
}: MiniCalendarProps) {
  const today = toIsoDate(new Date());
  const days = getMonthDays(currentMonth);

  return (
    <div className="mini-calendar">
      <div className="mini-calendar__header">
        <span className="mini-calendar__title">Visão rápida</span>
      </div>

      <div className="mini-calendar__weekdays">
        {weekLabels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>

      <div className="mini-calendar__grid">
        {days.map((day) => {
          const isDisabled = !day.isCurrentMonth;

          return (
            <button
              key={day.date}
              type="button"
              className="mini-calendar__day-button"
              disabled={isDisabled}
              onClick={() => onDateSelect(day.date)}
              aria-label={`Selecionar dia ${new Date(
                `${day.date}T12:00:00`,
              ).getDate()}`}
            >
              <CalendarDateCell
                date={day.date}
                variant="mini"
                isToday={today === day.date}
                isSelected={selectedDate === day.date}
                isUnavailable={unavailableDates.includes(day.date)}
                hasEvents={datesWithEvents.includes(day.date)}
                isCurrentMonth={day.isCurrentMonth}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}