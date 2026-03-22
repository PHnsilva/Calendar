import type { CalendarEvent } from "../../calendar/types";
import HomeBookingsTimeline from "../../bookings/components/HomeBookingsTimeline";

type HomeSidebarProps = {
  selectedDate: string;
  events: CalendarEvent[];
  activeMonth: string;
  currentAllowedMonth: string;
  nextAllowedMonth: string;
  onChangeTimelineMonth: (monthStart: string) => void;
  onQuickBooking?: () => void;
  eyebrow?: string;
  title?: string;
  hideQuickBooking?: boolean;
};

export default function HomeSidebar({
  selectedDate,
  events,
  activeMonth,
  currentAllowedMonth,
  nextAllowedMonth,
  onChangeTimelineMonth,
  onQuickBooking,
  eyebrow,
  title,
  hideQuickBooking = false,
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
        eyebrow={eyebrow}
        title={title}
        hideQuickBooking={hideQuickBooking}
      />
    </aside>
  );
}
