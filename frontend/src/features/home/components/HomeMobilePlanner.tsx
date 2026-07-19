import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type TouchEvent, type UIEvent } from 'react';
import { getCityTone } from '../../../data/allowed-cities';
import logo from '../../../assets/brand/logo.png';
import type { CalendarEvent } from '../../calendar/types';

type HomeMobilePlannerProps = {
  selectedDate: string;
  currentMonth: string;
  currentAllowedMonth: string;
  nextAllowedMonth: string;
  events: CalendarEvent[];
  unavailableDates: string[];
  onDateSelect: (date: string, options?: { unavailable?: boolean }) => void;
  onMonthChange: (month: string) => void;
  onEventSelect: (event: CalendarEvent) => void;
  agendaFocusRequestId?: number;
};

type DayCell = {
  date: string;
  label: number;
  weekday: string;
};

function toLocalDate(dateString: string): Date {
  return new Date(`${dateString}T12:00:00`);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function weekdayLabel(dateString: string) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
    .format(toLocalDate(dateString))
    .replace('.', '')
    .slice(0, 3)
    .toUpperCase();
}

function shiftDay(dateString: string, delta: number) {
  const base = toLocalDate(dateString);
  base.setDate(base.getDate() + delta);
  return toIsoDate(base);
}

function startOfWeek(dateString: string) {
  const date = toLocalDate(dateString);
  const weekday = date.getDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  date.setDate(date.getDate() + offset);
  return toIsoDate(date);
}

function endOfWeek(dateString: string) {
  return shiftDay(startOfWeek(dateString), 6);
}

function endOfMonth(monthStart: string) {
  const reference = toLocalDate(monthStart);
  return toIsoDate(new Date(reference.getFullYear(), reference.getMonth() + 1, 0));
}

function buildWeekCells(startDate: string, endDate: string): DayCell[][] {
  const pages: DayCell[][] = [];
  let cursor = startOfWeek(startDate);
  const limit = endOfWeek(endDate);

  while (cursor <= limit) {
    const week = Array.from({ length: 7 }, (_, index) => {
      const date = shiftDay(cursor, index);
      return {
        date,
        label: Number(date.slice(8, 10)),
        weekday: weekdayLabel(date),
      } satisfies DayCell;
    });

    pages.push(week);
    cursor = shiftDay(cursor, 7);
  }

  return pages;
}

function formatAgendaLabel(dateString: string, todayIso: string) {
  if (dateString === todayIso) return `HOJE ${dateString.slice(8, 10)}/${dateString.slice(5, 7)}`;
  if (dateString === shiftDay(todayIso, 1)) return `AMANHÃ ${dateString.slice(8, 10)}/${dateString.slice(5, 7)}`;

  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })
    .format(toLocalDate(dateString))
    .replace('-feira', '')
    .toUpperCase();

  return `${weekday} ${dateString.slice(8, 10)}/${dateString.slice(5, 7)}`;
}

function getTodayIso() {
  return toIsoDate(new Date());
}

function isDateOutsideRange(date: string, start: string, end: string) {
  return date < start || date > endOfMonth(end);
}

function monthBadgeLabel(dateString: string) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(toLocalDate(dateString))
    .replace('.', '')
    .slice(0, 3)
    .toUpperCase();
}

function yearLabel(dateString: string) {
  return dateString.slice(0, 4).split('').join(' ');
}

function EmptyArrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4v13m0 0-5-5m5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


export default function HomeMobilePlanner({
  selectedDate,
  currentMonth,
  currentAllowedMonth,
  nextAllowedMonth,
  events,
  unavailableDates,
  onDateSelect,
  onMonthChange,
  onEventSelect,
  agendaFocusRequestId = 0,
}: HomeMobilePlannerProps) {
  const agendaRef = useRef<HTMLDivElement | null>(null);
  const weekStripRef = useRef<HTMLDivElement | null>(null);
  const weekRefs = useRef<(HTMLElement | null)[]>([]);
  const handleDragStartRef = useRef<number | null>(null);
  const handleDragCloseRef = useRef(false);
  const todayIso = getTodayIso();
  const [activeDate, setActiveDate] = useState(selectedDate || todayIso);
  const [isAllAgendaOpen, setIsAllAgendaOpen] = useState(false);
  const [overviewDate, setOverviewDate] = useState(selectedDate || todayIso);
  const [lastSelectedDate, setLastSelectedDate] = useState(selectedDate);
  const unavailableSet = useMemo(() => new Set(unavailableDates), [unavailableDates]);
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list.sort((left, right) => left.startTime.localeCompare(right.startTime)));
    });
    return map;
  }, [events]);

  if (selectedDate && selectedDate !== lastSelectedDate) {
    setLastSelectedDate(selectedDate);
    setActiveDate(selectedDate);
    if (!isAllAgendaOpen) setOverviewDate(selectedDate);
  }

  const weekPages = useMemo(
    () => buildWeekCells(todayIso, endOfMonth(nextAllowedMonth)),
    [nextAllowedMonth, todayIso],
  );
  const activeWeekIndex = useMemo(() => {
    const index = weekPages.findIndex((week) => week.some((cell) => cell.date === activeDate));
    return index >= 0 ? index : 0;
  }, [activeDate, weekPages]);
  const activeDayEvents = useMemo(() => eventsByDate.get(activeDate) ?? [], [activeDate, eventsByDate]);
  const isActiveUnavailable = activeDate < todayIso
    || unavailableSet.has(activeDate)
    || isDateOutsideRange(activeDate, currentAllowedMonth, nextAllowedMonth);
  const dayAgendaItems = useMemo<[string, CalendarEvent[]][]>(() => {
    if (isActiveUnavailable || activeDayEvents.length === 0) return [];
    return [[activeDate, activeDayEvents]];
  }, [activeDate, activeDayEvents, isActiveUnavailable]);

  const allAgendaItems = useMemo(() => {
    const limitDate = endOfMonth(nextAllowedMonth);

    return Array.from(eventsByDate.entries())
      .filter(([date, items]) => date >= todayIso && date <= limitDate && items.length > 0)
      .sort(([left], [right]) => left.localeCompare(right));
  }, [eventsByDate, nextAllowedMonth, todayIso]);

  const agendaItems = isAllAgendaOpen ? allAgendaItems : dayAgendaItems;

  const notifyOverviewState = useCallback((active: boolean) => {
    window.dispatchEvent(new CustomEvent('home-mobile-planner:overview-state', { detail: { active } }));
  }, []);

  const closeOverview = useCallback(() => {
    handleDragStartRef.current = null;
    handleDragCloseRef.current = false;
    setIsAllAgendaOpen(false);
    setOverviewDate(activeDate);
    notifyOverviewState(false);
    window.requestAnimationFrame(() => {
      agendaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, [activeDate, notifyOverviewState]);

  const openOverview = useCallback(() => {
    const firstAgendaDate = allAgendaItems.find(([date]) => date >= activeDate)?.[0]
      ?? allAgendaItems[0]?.[0]
      ?? activeDate;

    setOverviewDate(firstAgendaDate);
    setIsAllAgendaOpen(true);
    notifyOverviewState(true);

    window.requestAnimationFrame(() => {
      agendaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, [activeDate, allAgendaItems, notifyOverviewState]);


  const requestQuickBooking = useCallback(() => {
    onDateSelect(activeDate, { unavailable: isActiveUnavailable });
    window.dispatchEvent(new CustomEvent('home-mobile-planner:quick-booking', {
      detail: { date: activeDate, unavailable: isActiveUnavailable },
    }));
  }, [activeDate, isActiveUnavailable, onDateSelect]);

  const handleOverviewHandlePointerDown = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    handleDragStartRef.current = event.clientY;
    handleDragCloseRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const closeOverviewFromDrag = useCallback((clientY: number) => {
    const startY = handleDragStartRef.current;
    if (startY === null || handleDragCloseRef.current) return;

    const distance = clientY - startY;
    if (distance < 30) return;

    handleDragCloseRef.current = true;
    closeOverview();
  }, [closeOverview]);

  const handleOverviewHandlePointerMove = useCallback((event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    closeOverviewFromDrag(event.clientY);
  }, [closeOverviewFromDrag]);

  const handleOverviewHandlePointerUp = useCallback((event?: PointerEvent<HTMLButtonElement>) => {
    if (event?.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    handleDragStartRef.current = null;
    handleDragCloseRef.current = false;
  }, []);

  const handleOverviewHandleTouchStart = useCallback((event: TouchEvent<HTMLButtonElement>) => {
    handleDragStartRef.current = event.touches[0]?.clientY ?? null;
    handleDragCloseRef.current = false;
  }, []);

  const handleOverviewHandleTouchMove = useCallback((event: TouchEvent<HTMLButtonElement>) => {
    const touch = event.touches[0];
    if (!touch) return;

    event.preventDefault();
    closeOverviewFromDrag(touch.clientY);
  }, [closeOverviewFromDrag]);

  const handleOverviewHandleTouchEnd = useCallback(() => {
    handleDragStartRef.current = null;
    handleDragCloseRef.current = false;
  }, []);

  const handleDaySelect = useCallback((date: string, monthStart: string, isBlockedDay: boolean) => {
    setIsAllAgendaOpen(false);
    setOverviewDate(date);
    notifyOverviewState(false);
    setActiveDate(date);
    if (monthStart !== currentMonth) onMonthChange(monthStart);

    window.requestAnimationFrame(() => {
      agendaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });

    onDateSelect(date, { unavailable: isBlockedDay });
  }, [currentMonth, notifyOverviewState, onDateSelect, onMonthChange]);

  const handleAgendaScroll = useCallback((event: UIEvent<HTMLElement>) => {
    if (!isAllAgendaOpen) return;

    const container = event.currentTarget;
    const sections = Array.from(container.querySelectorAll<HTMLElement>('[data-agenda-date]'));
    if (sections.length === 0) return;

    const headerOffset = 96;
    const nextSection = sections.reduce((current, section) => {
      const sectionTop = section.offsetTop - container.scrollTop;
      if (sectionTop <= headerOffset) return section;
      return current;
    }, sections[0]);

    const nextDate = nextSection.dataset.agendaDate;
    if (nextDate && nextDate !== overviewDate) setOverviewDate(nextDate);
  }, [isAllAgendaOpen, overviewDate]);

  useEffect(() => {
    const handleReturnHome = () => closeOverview();
    const handleOpenOverview = () => openOverview();

    window.addEventListener('home-mobile-planner:home', handleReturnHome);
    window.addEventListener('home-mobile-planner:open-overview', handleOpenOverview);

    return () => {
      window.removeEventListener('home-mobile-planner:home', handleReturnHome);
      window.removeEventListener('home-mobile-planner:open-overview', handleOpenOverview);
    };
  }, [closeOverview, openOverview]);

  useEffect(() => {
    if (agendaFocusRequestId === 0) return;

    window.requestAnimationFrame(() => {
      agendaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, [agendaFocusRequestId]);

  useEffect(() => {
    const strip = weekStripRef.current;
    const target = weekRefs.current[activeWeekIndex];
    if (!strip || !target) return;

    strip.scrollTo({
      left: target.offsetLeft - strip.offsetLeft,
      behavior: 'smooth',
    });
  }, [activeWeekIndex]);

  return (
    <section className={['mobile-planner', isAllAgendaOpen ? 'mobile-planner--overview' : ''].filter(Boolean).join(' ')} aria-label="Agenda mobile">
      <div className="mobile-planner__top">
        <div ref={weekStripRef} className="mobile-planner__weeks" aria-label="Dias da semana">
          {weekPages.map((week, weekIndex) => (
            <section
              key={`week-${week[0]?.date ?? weekIndex}`}
              ref={(element) => {
                weekRefs.current[weekIndex] = element;
              }}
              className="mobile-planner__week"
            >
              {week.map((cell) => {
                const dayEvents = eventsByDate.get(cell.date) ?? [];
                const isSelected = activeDate === cell.date;
                const isToday = cell.date === todayIso;
                const isUnavailable = unavailableSet.has(cell.date);
                const isPast = cell.date < todayIso;
                const monthStart = `${cell.date.slice(0, 7)}-01`;
                const isOutsideAllowedRange = isDateOutsideRange(cell.date, currentAllowedMonth, nextAllowedMonth);

                return (
                  <button
                    key={cell.date}
                    type="button"
                    className={[
                      'mobile-planner__day',
                      isSelected ? 'mobile-planner__day--selected' : '',
                      isToday ? 'mobile-planner__day--today' : '',
                      isUnavailable ? 'mobile-planner__day--disabled' : '',
                      isPast ? 'mobile-planner__day--past' : '',
                      isOutsideAllowedRange ? 'mobile-planner__day--outside-range' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => {
                      const isBlockedDay = isUnavailable || isOutsideAllowedRange || isPast;
                      handleDaySelect(cell.date, monthStart, isBlockedDay);
                    }}
                    aria-pressed={isSelected}
                  >
                    <small>{cell.weekday}</small>
                    <span>{cell.label}</span>
                    <div className="mobile-planner__markers">
                      {dayEvents.slice(0, 2).map((event) => (
                        <i key={event.id} className={`mobile-planner__marker mobile-planner__marker--${getCityTone(event.city)}`} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </section>
          ))}
        </div>
      </div>

      <section ref={agendaRef} className="mobile-planner__agenda" aria-label="Lista de agendamentos" onScroll={handleAgendaScroll}>
        {isAllAgendaOpen ? (
          <>
            <button
              type="button"
              className="mobile-planner__overview-handle"
              onClick={closeOverview}
              onPointerDown={handleOverviewHandlePointerDown}
              onPointerMove={handleOverviewHandlePointerMove}
              onPointerUp={handleOverviewHandlePointerUp}
              onPointerCancel={handleOverviewHandlePointerUp}
              onTouchStart={handleOverviewHandleTouchStart}
              onTouchMove={handleOverviewHandleTouchMove}
              onTouchEnd={handleOverviewHandleTouchEnd}
              aria-label="Fechar visão completa da agenda"
              title="Voltar para o início"
            >
              <span aria-hidden="true" />
            </button>
            <header className="mobile-planner__overview-header" aria-label="Resumo da agenda">
            <div className="mobile-planner__overview-date" aria-hidden="true">
              <span>{monthBadgeLabel(overviewDate)}</span>
              <strong>{overviewDate.slice(8, 10)}</strong>
              <small>{yearLabel(overviewDate)}</small>
            </div>
            <div className="mobile-planner__overview-copy">
              <strong>Todos os agendamentos</strong>
              <span>Próximos serviços confirmados</span>
            </div>
            </header>
          </>
        ) : null}

        {!isAllAgendaOpen && isActiveUnavailable ? (
          <div className="mobile-planner__notice mobile-planner__notice--warning">
            <strong>Sem disponibilidade para esse dia.</strong>
            <span>Escolha outro dia na agenda.</span>
          </div>
        ) : agendaItems.length === 0 ? (
          <div className="mobile-planner__empty">
            <div className="mobile-planner__empty-logo" aria-hidden="true">
              <img src={logo} alt="" />
            </div>
            <div className="mobile-planner__empty-copy">
              <strong>{isAllAgendaOpen ? 'Não há agendamentos próximos' : 'Não há agendamentos para este dia'}</strong>
              <span>{isAllAgendaOpen ? 'Use o + para criar um novo serviço' : 'Toque no + para agendar um serviço'}</span>
            </div>
            <button
              type="button"
              className="mobile-planner__empty-arrow"
              onClick={requestQuickBooking}
              aria-label="Abrir novo agendamento"
              title="Abrir novo agendamento"
            >
              <EmptyArrow />
            </button>
          </div>
        ) : (
          agendaItems.map(([date, items]) => (
            <div key={date} className="mobile-planner__section" data-agenda-date={date}>
              <span className="mobile-planner__section-label">{formatAgendaLabel(date, todayIso)}</span>
              <div className="mobile-planner__section-items">
                {items.map((item) => {
                  const tone = getCityTone(item.city);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`mobile-planner__item mobile-planner__item--${tone}`}
                      onClick={() => onEventSelect(item)}
                    >
                      <i className="mobile-planner__item-dot" aria-hidden="true" />
                      <div className="mobile-planner__item-content">
                        <strong>{item.startTime} - {item.endTime}</strong>
                        <span>{item.customerName ?? item.title}</span>
                        <small>{item.serviceLabel ?? item.city ?? 'Agendamento'}</small>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </section>
    </section>
  );
}
