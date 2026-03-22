import type { CalendarEvent } from "../../calendar/types";
import HomeBookingsTimeline from "../../bookings/components/HomeBookingsTimeline";

type HomeSidebarProps = {
  selectedDate: string;
  events: CalendarEvent[];
  activeMonth: string;
  currentAllowedMonth: string;
  nextAllowedMonth: string;
  onChangeTimelineMonth: (monthStart: string) => void;
  onQuickBooking: () => void;
  hideQuickBooking?: boolean;
  eyebrow?: string;
  title?: string;
};

export default function HomeSidebar({
  selectedDate,
  events,
  activeMonth,
  currentAllowedMonth,
  nextAllowedMonth,
  onChangeTimelineMonth,
  onQuickBooking,
  hideQuickBooking = false,
  eyebrow,
  title,
}: HomeSidebarProps) {
  return (
    <aside className="home-sidebar">
      <HomeBookingsTimeline
        selectedDate={selectedDate}
        events={events}
        activeMonth={activeMonth}
        currentAllowedMonth={currentAllowedMonth}
        nextAllowedMonth={nextAllowedMonth}
        onChangeMonth={onChangeTimelineMonth}
        onQuickBooking={onQuickBooking}
        hideQuickBooking={hideQuickBooking}
        eyebrow={eyebrow}
        title={title}
      />
    </aside>
  );
}
