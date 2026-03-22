import { useMemo, useState } from "react";
import CalendarToolbar from "../../calendar/components/CalendarToolbar";
import BigCalendar from "../../calendar/components/BigCalendar";
import CalendarMonthPreview from "../../calendar/components/CalendarMonthPreview";
import CalendarHelpModal from "../../../components/ui/CalendarHelpModal";
import type { CalendarEvent } from "../../calendar/types";

function shiftMonth(monthStart: string, delta: number): string {
  const base = new Date(`${monthStart}T12:00:00`);
  const next = new Date(base.getFullYear(), base.getMonth() + delta, 1);
  return `${next.getFullYear()}-${`${next.getMonth() + 1}`.padStart(2, "0")}-01`;
}

type HomeCalendarSectionProps = {
  selectedDate: string;
  currentMonth: string;
  currentAllowedMonth: string;
  nextAllowedMonth: string;
  events: CalendarEvent[];
  unavailableDates: string[];
  onDateSelect: (date: string, options?: { unavailable?: boolean }) => void;
  onMonthChange: (month: string) => void;
  onOpenDayBooking: (date: string) => void;
  showInlineBookingAction?: boolean;
};

export default function HomeCalendarSection({
  selectedDate,
  currentMonth,
  currentAllowedMonth,
  nextAllowedMonth,
  events,
  unavailableDates,
  onDateSelect,
  onMonthChange,
  onOpenDayBooking,
  showInlineBookingAction = true,
}: HomeCalendarSectionProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const previewMonth = useMemo(() => shiftMonth(currentMonth, 1), [currentMonth]);
  const previewDisabled = previewMonth > nextAllowedMonth;

  return (
    <>
      <section className="home-calendar-stack">
        <section className="panel home-main-panel home-main-panel--calendar">
          <CalendarToolbar
            currentMonth={currentMonth}
            onMonthChange={onMonthChange}
            onHelpOpen={() => setIsHelpOpen(true)}
          />

          <div key={currentMonth} className="calendar-fade-wrap">
            <BigCalendar
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              events={events}
              unavailableDates={unavailableDates}
              onDateSelect={onDateSelect}
              onOpenDayBooking={onOpenDayBooking}
              showInlineBookingAction={showInlineBookingAction}
            />
          </div>
        </section>

        <CalendarMonthPreview
          monthStart={previewMonth}
          selectedDate={selectedDate}
          events={events}
          unavailableDates={unavailableDates}
          disabled={previewDisabled || currentMonth === nextAllowedMonth}
          onMonthActivate={onMonthChange}
        />
      </section>

      <CalendarHelpModal
        open={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </>
  );
}
