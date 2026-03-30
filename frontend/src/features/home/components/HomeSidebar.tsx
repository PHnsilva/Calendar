import type { MouseEventHandler } from "react";
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
  bookingPickMode?: boolean;
  isCollapsed?: boolean;
  onOpenDayBooking: (date: string) => void;
  eyebrow?: string;
  title?: string;
  className?: string;
  onMouseEnter?: MouseEventHandler<HTMLElement>;
  onMouseLeave?: MouseEventHandler<HTMLElement>;
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
  bookingPickMode = false,
  isCollapsed = false,
  onOpenDayBooking,
  eyebrow = "MÊS",
  title = "MEUS AGENDAMENTOS",
  className = "home-sidebar",
  onMouseEnter,
  onMouseLeave,
}: HomeSidebarProps) {
  return (
    <aside
      className={className}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label="Meus agendamentos"
      data-home-sidebar="true"
    >
      <HomeBookingsTimeline
        selectedDate={selectedDate}
        events={events}
        activeMonth={activeMonth}
        currentAllowedMonth={currentAllowedMonth}
        nextAllowedMonth={nextAllowedMonth}
        onChangeMonth={onChangeTimelineMonth}
        onQuickBooking={onQuickBooking}
        hideQuickBooking={hideQuickBooking}
        bookingPickMode={bookingPickMode}
        isCollapsed={isCollapsed}
        onOpenDayBooking={onOpenDayBooking}
        eyebrow={eyebrow}
        title={title}
      />
    </aside>
  );
}
