import CalendarToolbar from "../../calendar/components/CalendarToolbar";
import BigCalendar from "../../calendar/components/BigCalendar";
import type { CalendarEvent } from "../../calendar/types";

function toMonthStart(dateString: string): string {
  return `${dateString.slice(0, 7)}-01`;
}

type HomeCalendarSectionProps = {
  selectedDate: string;
  currentMonth: string;
  events: CalendarEvent[];
  unavailableDates: string[];
  onDateSelect: (date: string, options?: { unavailable?: boolean }) => void;
  onMonthChange: (month: string) => void;
};

export default function HomeCalendarSection({
  selectedDate,
  currentMonth,
  events,
  unavailableDates,
  onDateSelect,
  onMonthChange,
}: HomeCalendarSectionProps) {
  const handleCalendarDateSelect = (
    date: string,
    options?: { unavailable?: boolean },
  ) => {
    onDateSelect(date, options);

    const targetMonth = toMonthStart(date);
    if (targetMonth !== currentMonth) {
      onMonthChange(targetMonth);
    }
  };

  return (
    <section className="panel home-main-panel">
      <CalendarToolbar currentMonth={currentMonth} onMonthChange={onMonthChange} />

      <BigCalendar
        currentMonth={currentMonth}
        selectedDate={selectedDate}
        events={events}
        unavailableDates={unavailableDates}
        onDateSelect={handleCalendarDateSelect}
      />
    </section>
  );
}