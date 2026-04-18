import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { getCityTone } from '../../../data/allowed-cities';
import CalendarDateCell from './CalendarDateCell';
import type { CalendarEvent } from '../types';

function toLocalDate(dateString: string): Date {
  return new Date(`${dateString}T12:00:00`);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthDays(monthStart: string): Array<{ date: string; isCurrentMonth: boolean }> {
  const reference = toLocalDate(monthStart);
  const firstDay = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const sundayOffset = firstDay.getDay();
  const gridStart = new Date(reference.getFullYear(), reference.getMonth(), 1 - sundayOffset);

  return Array.from({ length: 35 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      date: toIsoDate(date),
      isCurrentMonth: date.getMonth() === reference.getMonth(),
    };
  });
}

function getWeekdayIndex(dateString: string): number {
  return toLocalDate(dateString).getDay();
}

function sortEventsByStartTime(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort(
    (left, right) =>
      left.startTime.localeCompare(right.startTime) ||
      left.endTime.localeCompare(right.endTime) ||
      left.id.localeCompare(right.id),
  );
}

function buildRange(orderedDates: string[], startDate: string, endDate: string): string[] {
  const startIndex = orderedDates.indexOf(startDate);
  const endIndex = orderedDates.indexOf(endDate);

  if (startIndex === -1 || endIndex === -1) return [];

  const lower = Math.min(startIndex, endIndex);
  const upper = Math.max(startIndex, endIndex);
  return orderedDates.slice(lower, upper + 1);
}

type BigCalendarProps = {
  currentMonth: string;
  selectedDate: string;
  events: CalendarEvent[];
  unavailableDates: string[];
  bookingPickMode?: boolean;
  compactMode?: boolean;
  adminSelectionEnabled?: boolean;
  adminSelectedDates?: string[];
  onDateSelect: (date: string, options?: { unavailable?: boolean }) => void;
  onAdminSelectedDatesChange?: (dates: string[]) => void;
};

const weekLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function BigCalendar({
  currentMonth,
  selectedDate,
  events,
  unavailableDates,
  bookingPickMode = false,
  compactMode = false,
  adminSelectionEnabled = false,
  adminSelectedDates = [],
  onDateSelect,
  onAdminSelectedDatesChange,
}: BigCalendarProps) {
  const today = toIsoDate(new Date());
  const days = getMonthDays(currentMonth);
  const weekdayReference = selectedDate || today;
  const activeWeekday = getWeekdayIndex(weekdayReference);
  const [dragAnchor, setDragAnchor] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectionBoxStyle, setSelectionBoxStyle] = useState<CSSProperties | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const selectableDates = useMemo(
    () => days.filter((day) => day.isCurrentMonth && day.date >= today).map((day) => day.date),
    [days, today],
  );

  useEffect(() => {
    if (!adminSelectionEnabled) {
      setDragAnchor('');
      setIsDragging(false);
      setSelectionBoxStyle(null);
    }
  }, [adminSelectionEnabled]);

  useEffect(() => {
    const updateSelectionBox = () => {
      if (!adminSelectionEnabled || compactMode || adminSelectedDates.length === 0 || !bodyRef.current) {
        setSelectionBoxStyle(null);
        return;
      }

      const cells = adminSelectedDates
        .map((date) => cellRefs.current[date])
        .filter(Boolean) as HTMLDivElement[];

      if (cells.length === 0) {
        setSelectionBoxStyle(null);
        return;
      }

      const bodyRect = bodyRef.current.getBoundingClientRect();
      let minTop = Number.POSITIVE_INFINITY;
      let minLeft = Number.POSITIVE_INFINITY;
      let maxRight = 0;
      let maxBottom = 0;

      cells.forEach((cell) => {
        const rect = cell.getBoundingClientRect();
        minTop = Math.min(minTop, rect.top);
        minLeft = Math.min(minLeft, rect.left);
        maxRight = Math.max(maxRight, rect.right);
        maxBottom = Math.max(maxBottom, rect.bottom);
      });

      setSelectionBoxStyle({
        top: `${Math.max(0, minTop - bodyRect.top + 6)}px`,
        left: `${Math.max(0, minLeft - bodyRect.left + 6)}px`,
        width: `${Math.max(0, maxRight - minLeft - 12)}px`,
        height: `${Math.max(0, maxBottom - minTop - 12)}px`,
      });
    };

    updateSelectionBox();
    window.addEventListener('resize', updateSelectionBox);
    return () => window.removeEventListener('resize', updateSelectionBox);
  }, [adminSelectedDates, adminSelectionEnabled, compactMode, currentMonth]);

  useEffect(() => {
    if (!isDragging) return;

    const finishDrag = () => setIsDragging(false);
    window.addEventListener('pointerup', finishDrag);
    return () => window.removeEventListener('pointerup', finishDrag);
  }, [isDragging]);

  function handleKeyboardSelect(
    event: KeyboardEvent<HTMLDivElement>,
    date: string,
    isClickable: boolean,
    isAdminSelectable: boolean,
  ): void {
    if (!isClickable && !isAdminSelectable) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();

      if (adminSelectionEnabled && isAdminSelectable) {
        onAdminSelectedDatesChange?.([date]);
        return;
      }

      onDateSelect(date, { unavailable: false });
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>, date: string, canSelect: boolean) {
    if (!adminSelectionEnabled || !canSelect) return;
    event.preventDefault();
    setDragAnchor(date);
    setIsDragging(true);
    onAdminSelectedDatesChange?.([date]);
  }

  function handlePointerEnter(date: string, canSelect: boolean) {
    if (!adminSelectionEnabled || !isDragging || !dragAnchor || !canSelect) return;
    onAdminSelectedDatesChange?.(buildRange(selectableDates, dragAnchor, date));
  }

  return (
    <div className={['calendar-grid', 'calendar-grid--slim', compactMode ? 'calendar-grid--compact' : ''].filter(Boolean).join(' ')}>
      <div className="calendar-grid__weekdays calendar-grid__weekdays--slim">
        {weekLabels.map((label, index) => (
          <span
            key={label}
            className={[
              'calendar-grid__weekday',
              activeWeekday === index ? 'calendar-grid__weekday--active' : '',
              `calendar-grid__weekday--tone-${index}`,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {label}
          </span>
        ))}
      </div>

      <div ref={bodyRef} className={['calendar-grid__body', 'calendar-grid__body--slim', adminSelectionEnabled ? 'calendar-grid__body--admin-selecting' : ''].filter(Boolean).join(' ')}>
        {selectionBoxStyle ? <div className="admin-calendar-selection-box" style={selectionBoxStyle} /> : null}
        {days.map((day, index) => {
          const dayEvents = sortEventsByStartTime(events.filter((event) => event.date === day.date));
          const earliestTone = dayEvents[0] ? getCityTone(dayEvents[0].city) : null;
          const cityTones = Array.from(
            new Set(dayEvents.map((event) => getCityTone(event.city)).filter(Boolean)),
          ).slice(0, 3);

          const isUnavailable = unavailableDates.includes(day.date);
          const isOutside = !day.isCurrentMonth;
          const isPast = day.date < today;
          const hasEvents = dayEvents.length > 0;
          const isSelected = selectedDate === day.date;
          const isClickable = !isOutside && !isUnavailable && !isPast;
          const isFloating = bookingPickMode && isClickable;
          const isAdminSelectable = adminSelectionEnabled && !isOutside && !isPast && !isUnavailable;
          const isAdminSelected = adminSelectedDates.includes(day.date);

          return (
            <div
              key={day.date}
              ref={(element) => {
                cellRefs.current[day.date] = element;
              }}
              className={[
                'calendar-grid__cell',
                'calendar-grid__cell--slim',
                isSelected ? 'calendar-grid__cell--selected' : '',
                isUnavailable ? 'calendar-grid__cell--unavailable' : '',
                isOutside ? 'calendar-grid__cell--outside' : '',
                isPast ? 'calendar-grid__cell--past' : '',
                !isClickable && !isAdminSelectable ? 'calendar-grid__cell--blocked' : '',
                bookingPickMode ? 'calendar-grid__cell--pick-mode' : '',
                isFloating ? 'calendar-grid__cell--floating' : '',
                adminSelectionEnabled ? 'calendar-grid__cell--admin-target' : '',
                isAdminSelected ? 'calendar-grid__cell--admin-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => {
                if (adminSelectionEnabled) return;
                if (!isClickable) return;
                onDateSelect(day.date, { unavailable: false });
              }}
              onPointerDown={(event) => handlePointerDown(event, day.date, isAdminSelectable)}
              onPointerEnter={() => handlePointerEnter(day.date, isAdminSelectable)}
              onKeyDown={(event) => handleKeyboardSelect(event, day.date, isClickable, isAdminSelectable)}
              aria-label={adminSelectionEnabled ? `Selecionar dia ${day.date}` : `Selecionar dia ${day.date}`}
              aria-disabled={!isClickable && !isAdminSelectable}
              role="button"
              tabIndex={isClickable || isAdminSelectable ? 0 : -1}
              style={{ '--cell-order': index % 7 } as CSSProperties}
            >
              <div className="calendar-grid__date-row">
                <CalendarDateCell
                  date={day.date}
                  variant={compactMode ? 'mini' : 'big'}
                  isToday={today === day.date}
                  isSelected={isSelected || isAdminSelected}
                  isUnavailable={isUnavailable || isPast}
                  hasEvents={hasEvents}
                  isCurrentMonth={day.isCurrentMonth}
                  isPast={isPast}
                  tone={earliestTone}
                />
              </div>

              <div className="calendar-grid__indicator-stack">
                {cityTones.length > 0 ? (
                  cityTones.map((tone, toneIndex) => (
                    <span
                      key={`${day.date}-${tone}-${toneIndex}`}
                      className={['calendar-indicator', 'calendar-indicator--booked', `calendar-indicator--${tone}`].join(' ')}
                    />
                  ))
                ) : (
                  <span className="calendar-indicator calendar-indicator--idle" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
