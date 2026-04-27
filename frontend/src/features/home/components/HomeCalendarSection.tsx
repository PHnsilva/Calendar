import { useEffect, useMemo, useRef, useState } from 'react';
import CalendarToolbar from '../../calendar/components/CalendarToolbar';
import BigCalendar from '../../calendar/components/BigCalendar';
import CalendarMonthPreview from '../../calendar/components/CalendarMonthPreview';
import CalendarHelpModal from '../../../components/ui/CalendarHelpModal';
import BookingStartHintModal from '../../../components/ui/BookingStartHintModal';
import type { CalendarEvent } from '../../calendar/types';

function shiftMonth(monthStart: string, delta: number): string {
  const base = new Date(`${monthStart}T12:00:00`);
  const next = new Date(base.getFullYear(), base.getMonth() + delta, 1);
  return `${next.getFullYear()}-${`${next.getMonth() + 1}`.padStart(2, '0')}-01`;
}

function formatMonthLabel(monthStart: string) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(`${monthStart}T12:00:00`));
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
  bookingPickMode?: boolean;
  compactMode?: boolean;
  showMonthPreview?: boolean;
  onCancelBookingPick?: () => void;
  adminSelectionEnabled?: boolean;
  adminSelectedDates?: string[];
  onAdminSelectedDatesChange?: (dates: string[]) => void;
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
  bookingPickMode = false,
  compactMode = false,
  showMonthPreview = true,
  onCancelBookingPick,
  adminSelectionEnabled = false,
  adminSelectedDates = [],
  onAdminSelectedDatesChange,
}: HomeCalendarSectionProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const previewMonth = useMemo(() => shiftMonth(currentMonth, 1), [currentMonth]);
  const previewDisabled = previewMonth > nextAllowedMonth;
  const mobileMonths = useMemo(() => [currentAllowedMonth, nextAllowedMonth], [currentAllowedMonth, nextAllowedMonth]);
  const mobileScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileMonthRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (!compactMode || !mobileScrollRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        const visibleMonth = visibleEntry?.target.getAttribute('data-month');
        if (!visibleMonth || visibleMonth === currentMonth) return;
        onMonthChange(visibleMonth);
      },
      {
        root: mobileScrollRef.current,
        threshold: [0.55, 0.8],
      },
    );

    mobileMonths.forEach((month) => {
      const section = mobileMonthRefs.current[month];
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, [compactMode, currentMonth, mobileMonths, onMonthChange]);

  const handleToolbarMonthChange = (month: string) => {
    if (!compactMode) {
      onMonthChange(month);
      return;
    }

    mobileMonthRefs.current[month]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (month !== currentMonth) {
      onMonthChange(month);
    }
  };

  return (
    <>
      <section className={['home-calendar-stack', bookingPickMode ? 'home-calendar-stack--booking-pick' : ''].filter(Boolean).join(' ')}>
        <section className="panel home-main-panel home-main-panel--calendar">
          <CalendarToolbar
            currentMonth={currentMonth}
            currentAllowedMonth={currentAllowedMonth}
            nextAllowedMonth={nextAllowedMonth}
            onMonthChange={handleToolbarMonthChange}
            onHelpOpen={() => setIsHelpOpen(true)}
          />

          {compactMode ? (
            <div ref={mobileScrollRef} className="calendar-mobile-months" aria-label="Calendário dos meses disponíveis">
              {mobileMonths.map((month, index) => (
                <section
                  key={month}
                  data-month={month}
                  ref={(element) => {
                    mobileMonthRefs.current[month] = element;
                  }}
                  className={[
                    'calendar-mobile-months__section',
                    currentMonth === month ? 'calendar-mobile-months__section--active' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <header className="calendar-mobile-months__header">
                    <span>{index === 0 ? 'Mês atual' : 'Próximo mês'}</span>
                    <strong>{formatMonthLabel(month)}</strong>
                  </header>

                  <BigCalendar
                    currentMonth={month}
                    selectedDate={selectedDate}
                    events={events}
                    unavailableDates={unavailableDates}
                    onDateSelect={onDateSelect}
                    bookingPickMode={bookingPickMode}
                    compactMode
                    adminSelectionEnabled={adminSelectionEnabled}
                    adminSelectedDates={adminSelectedDates}
                    onAdminSelectedDatesChange={onAdminSelectedDatesChange}
                  />
                </section>
              ))}
            </div>
          ) : (
            <div key={currentMonth} className="calendar-fade-wrap">
              <BigCalendar
                currentMonth={currentMonth}
                selectedDate={selectedDate}
                events={events}
                unavailableDates={unavailableDates}
                onDateSelect={onDateSelect}
                bookingPickMode={bookingPickMode}
                compactMode={compactMode}
                adminSelectionEnabled={adminSelectionEnabled}
                adminSelectedDates={adminSelectedDates}
                onAdminSelectedDatesChange={onAdminSelectedDatesChange}
              />
            </div>
          )}
        </section>

        {showMonthPreview && !compactMode ? (
          <CalendarMonthPreview
            monthStart={previewMonth}
            selectedDate={selectedDate}
            events={events}
            unavailableDates={unavailableDates}
            disabled={previewDisabled || currentMonth === nextAllowedMonth}
            onMonthActivate={onMonthChange}
          />
        ) : null}
      </section>

      <CalendarHelpModal open={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <BookingStartHintModal open={bookingPickMode} onClose={() => onCancelBookingPick?.()} />
    </>
  );
}
