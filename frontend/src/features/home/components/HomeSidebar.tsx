import MiniCalendar from "../../calendar/components/MiniCalendar";
import CalendarLegend from "../../calendar/components/CalendarLegend";
import CalendarDayAgenda from "../../calendar/components/CalendarDayAgenda";
import type { CalendarEvent } from "../../calendar/types";

type HomeSidebarProps = {
  selectedDate: string;
  currentMonth: string;
  events: CalendarEvent[];
  unavailableDates: string[];
  onDateSelect: (date: string) => void;
  onOpenBookingModal: () => void;
};

export default function HomeSidebar({
  selectedDate,
  currentMonth,
  events,
  unavailableDates,
  onDateSelect,
  onOpenBookingModal,
}: HomeSidebarProps) {
  const datesWithEvents = Array.from(new Set(events.map((event) => event.date)));

  return (
    <aside className="home-sidebar">
      <section className="panel home-sidebar__panel">
        <MiniCalendar
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          unavailableDates={unavailableDates}
          datesWithEvents={datesWithEvents}
          onDateSelect={onDateSelect}
        />

        <CalendarLegend compact />
      </section>

      <section className="panel home-sidebar__panel home-sidebar__panel--agenda">
        <CalendarDayAgenda
          selectedDate={selectedDate}
          events={events}
          unavailableDates={unavailableDates}
          onOpenBookingModal={onOpenBookingModal}
        />
      </section>
    </aside>
  );
}