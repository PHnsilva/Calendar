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
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  bookingPickMode?: boolean;
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
  collapsed = false,
  onToggleCollapsed,
  bookingPickMode = false,
}: HomeSidebarProps) {
  return (
    <aside className={["home-sidebar", collapsed ? "home-sidebar--collapsed" : ""].filter(Boolean).join(" ")}>
      {collapsed ? (
        <button
          type="button"
          className="home-sidebar__toggle"
          onClick={onToggleCollapsed}
          aria-label="Expandir agendamentos"
          title="Expandir agendamentos"
        >
          <span aria-hidden="true">◀</span>
        </button>
      ) : (
        <>
          {bookingPickMode && onToggleCollapsed ? (
            <button
              type="button"
              className="home-sidebar__toggle home-sidebar__toggle--inline"
              onClick={onToggleCollapsed}
              aria-label="Recolher agendamentos"
              title="Recolher agendamentos"
            >
              <span aria-hidden="true">▶</span>
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
            eyebrow={eyebrow}
            title={title}
            hideQuickBooking={hideQuickBooking}
          />
        </>
      )}
    </aside>
  );
}
