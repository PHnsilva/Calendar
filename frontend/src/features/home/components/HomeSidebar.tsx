import type { CalendarEvent } from "../../calendar/types";
import HomeBookingsTimeline from "../../bookings/components/HomeBookingsTimeline";

type HomeSidebarProps = {
  compressed?: boolean;
  selectedDate: string;
  events: CalendarEvent[];
  activeMonth: string;
  currentAllowedMonth: string;
  nextAllowedMonth: string;
  onChangeTimelineMonth: (monthStart: string) => void;
  onQuickBooking: () => void;
};

export default function HomeSidebar({
  compressed = false,
  selectedDate,
  events,
  activeMonth,
  currentAllowedMonth,
  nextAllowedMonth,
  onChangeTimelineMonth,
  onQuickBooking,
}: HomeSidebarProps) {
  return (
    <aside className={["home-sidebar", compressed ? "home-sidebar--compressed" : ""].filter(Boolean).join(" ")}>
      <HomeBookingsTimeline
        selectedDate={selectedDate}
        events={events}
        activeMonth={activeMonth}
        currentAllowedMonth={currentAllowedMonth}
        nextAllowedMonth={nextAllowedMonth}
        onChangeMonth={onChangeTimelineMonth}
        onQuickBooking={onQuickBooking}
      />
    </aside>
  );
}