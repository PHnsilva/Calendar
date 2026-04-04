import { useMemo } from "react";
import { getCityTone } from "../../../data/allowed-cities";
import type { CalendarEvent } from "../../calendar/types";
import HomeBookingsTimeline from "../../bookings/components/HomeBookingsTimeline";

function toLocalDate(dateString: string): Date {
  return new Date(`${dateString}T12:00:00`);
}

function getTodayIso() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type HomeSidebarProps = {
  selectedDate: string;
  events: CalendarEvent[];
  activeMonth: string;
  currentAllowedMonth: string;
  nextAllowedMonth: string;
  onChangeTimelineMonth: (monthStart: string) => void;
  onQuickBooking: () => void;
  onOpenDayBooking: (date: string) => void;
  onToggleExpanded: () => void;
  onSelectRailDate: (date: string) => void;
  isExpanded: boolean;
  isDesktop: boolean;
  isAdminMode?: boolean;
  focusRequestId?: number;
};

export default function HomeSidebar({
  selectedDate,
  events,
  activeMonth,
  currentAllowedMonth,
  nextAllowedMonth,
  onChangeTimelineMonth,
  onQuickBooking,
  onOpenDayBooking,
  onToggleExpanded,
  onSelectRailDate,
  isExpanded,
  isDesktop,
  isAdminMode = false,
  focusRequestId = 0,
}: HomeSidebarProps) {
  const todayIso = getTodayIso();

  const railDays = useMemo(() => {
    const map = new Map<string, { date: string; tone: string }>();

    events
      .filter((event) => event.date >= todayIso)
      .filter((event) => event.date.slice(0, 7) === activeMonth.slice(0, 7))
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
      .forEach((event) => {
        if (!map.has(event.date)) {
          map.set(event.date, {
            date: event.date,
            tone: getCityTone(event.city),
          });
        }
      });

    return Array.from(map.values());
  }, [events, activeMonth, todayIso]);

  const monthLabel = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(toLocalDate(activeMonth));

  return (
    <aside
      className={[
        "home-sidebar",
        isDesktop ? "home-sidebar--desktop" : "home-sidebar--mobile",
        isExpanded ? "home-sidebar--expanded" : "home-sidebar--collapsed",
      ].join(" ")}
    >
      {isDesktop ? (
        <div
          className={[
            "booking-sidebar-rail",
            isExpanded ? "booking-sidebar-rail--expanded" : "",
          ].join(" ")}
          aria-label="Dias com agendamento"
        >
          <button
            type="button"
            className={[
              "booking-sidebar-rail__toggle",
              isExpanded ? "booking-sidebar-rail__toggle--expanded" : "",
            ].join(" ")}
            onClick={onToggleExpanded}
            aria-label={isExpanded ? "Recolher meus agendamentos" : "Expandir meus agendamentos"}
            title={isExpanded ? "Recolher meus agendamentos" : "Expandir meus agendamentos"}
          >
            <span className="booking-sidebar-rail__toggle-face" aria-hidden="true">
              {isExpanded ? (
                <svg
                  className="booking-sidebar-rail__toggle-icon booking-sidebar-rail__toggle-icon--close"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M7 7L17 17" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
                  <path d="M17 7L7 17" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
                </svg>
              ) : (
                <span className="booking-sidebar-rail__toggle-icon-shell">
                  <svg
                    className="booking-sidebar-rail__toggle-icon booking-sidebar-rail__toggle-icon--arrow"
                    viewBox="0 0 30 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 6L5 12L12 18" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M6.5 12H24" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
                  </svg>
                </span>
              )}
            </span>
          </button>

          {!isExpanded ? (
            <div className="booking-sidebar-rail__days">
              {railDays.map((entry) => {
                const label = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", weekday: "short" }).formatToParts(toLocalDate(entry.date));
                const isToday = entry.date === todayIso;
                const day = isToday
                  ? "HOJE"
                  : label.find((part) => part.type === "day")?.value ?? entry.date.slice(8, 10);
                const week = (label.find((part) => part.type === "weekday")?.value ?? "").replace(".", "");
                const isSelected = selectedDate === entry.date;

                return (
                  <button
                    key={entry.date}
                    type="button"
                    className={[
                      "booking-sidebar-rail__day",
                      `booking-sidebar-rail__day--${entry.tone}`,
                      isSelected ? "booking-sidebar-rail__day--selected" : "",
                    ].join(" ")}
                    onClick={() => onSelectRailDate(entry.date)}
                    title={entry.date}
                  >
                    <strong>{day}</strong>
                    <span>{week}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="booking-sidebar-rail__spacer" aria-hidden="true" />
          )}

          {!isExpanded && !isAdminMode ? (
            <button
              type="button"
              className="booking-sidebar-rail__quick-add"
              onClick={onQuickBooking}
              aria-label="Novo agendamento"
              title="Novo agendamento"
            >
              +
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="booking-sidebar-panel">
        <HomeBookingsTimeline
          selectedDate={selectedDate}
          events={events}
          activeMonth={activeMonth}
          currentAllowedMonth={currentAllowedMonth}
          nextAllowedMonth={nextAllowedMonth}
          onChangeMonth={onChangeTimelineMonth}
          onQuickBooking={onQuickBooking}
          onOpenDayBooking={onOpenDayBooking}
          hideQuickBooking={isAdminMode}
          eyebrow={isAdminMode ? "AGENDA ADMIN" : "MEUS AGENDAMENTOS"}
          title={monthLabel}
          isAdminMode={isAdminMode}
          focusRequestId={focusRequestId}
        />
      </div>
    </aside>
  );
}
