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
  bookingPickMode?: boolean;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
  onOpenDayBooking: (date: string) => void;
  showSelectedDayCta?: boolean;
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
  bookingPickMode = false,
  isCollapsed = false,
  onToggleCollapsed,
  onOpenDayBooking,
  showSelectedDayCta = true,
}: HomeSidebarProps) {
  return (
    <aside
      className={[
        "home-sidebar",
        bookingPickMode ? "home-sidebar--pick-mode" : "",
        isCollapsed ? "home-sidebar--collapsed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {bookingPickMode ? (
        <button
          type="button"
          className="home-sidebar__rail-toggle"
          onClick={onToggleCollapsed}
          aria-label={isCollapsed ? "Expandir agendamentos" : "Recolher agendamentos"}
          title={isCollapsed ? "Expandir agendamentos" : "Recolher agendamentos"}
        >
          <span className="home-sidebar__rail-toggle-badge">{isCollapsed ? ">" : "<"}</span>
        </button>
      ) : null}

      <HomeBookingsTimeline
        selectedDate={selectedDate}
        events={events}
        activeMonth={activeMonth}
        currentAllowedMonth={currentAllowedMonth}
        nextAllowedMonth={nextAllowedMonth}
        onChangeMonth={onChangeTimelineMonth}
        onQuickBooking={onQuickBooking}
        bookingPickMode={bookingPickMode}
        isCollapsed={isCollapsed}
        onOpenDayBooking={onOpenDayBooking}
        showSelectedDayCta={showSelectedDayCta}
      />
    </aside>
  );
}