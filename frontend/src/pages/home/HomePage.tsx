import { useEffect, useMemo, useRef, useState } from "react";
import HomeCalendarSection from "../../features/home/components/HomeCalendarSection";
import HomeSidebar from "../../features/home/components/HomeSidebar";
import BookingFormModal from "../../features/booking-form/components/BookingFormModal";
import BookingStartHintModal from "../../components/ui/BookingStartHintModal";
import { useHomeCalendarView } from "../../features/home/hooks/useHomeCalendarView";
import { useHomeBookingSelection } from "../../app/home-booking-provider";
import type { CalendarEvent } from "../../features/calendar/types";
import { getLocalCalendarEvents } from "../../lib/storage";
import "../../app/home-layout.css";

function toLocalDate(dateString: string): Date {
  return new Date(`${dateString}T12:00:00`);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMonthStart(dateString: string): string {
  return `${dateString.slice(0, 7)}-01`;
}

function shiftMonth(monthStart: string, delta: number): string {
  const base = new Date(`${monthStart}T12:00:00`);
  const next = new Date(base.getFullYear(), base.getMonth() + delta, 1);
  return `${next.getFullYear()}-${`${next.getMonth() + 1}`.padStart(2, "0")}-01`;
}

function buildMonthDate(monthStart: string, day: number): string {
  const reference = toLocalDate(monthStart);
  return toIsoDate(new Date(reference.getFullYear(), reference.getMonth(), day));
}

function buildMonthMockEvents(monthStart: string): CalendarEvent[] {
  const reference = toLocalDate(monthStart);
  const daysInMonth = new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate();

  const entries = [
    { day: 2, name: "Carlos Souza", address: "Rua dos Inconfidentes, 120 - Itabirito", startTime: "08:00", endTime: "09:00", city: "Itabirito" },
    { day: 2, name: "Marina Alves", address: "Av. Queiroz Júnior, 88 - Itabirito", startTime: "11:00", endTime: "12:00", city: "Itabirito" },
    { day: 7, name: "Rafael Lima", address: "Rua Conselheiro Quintiliano, 41 - Ouro Preto", startTime: "09:00", endTime: "10:00", city: "Ouro Preto" },
    { day: 12, name: "Bianca Rocha", address: "Rua do Rosário, 210 - Moeda", startTime: "13:00", endTime: "14:00", city: "Moeda" },
    { day: 12, name: "Fernanda Reis", address: "Rua Primeiro de Maio, 56 - Moeda", startTime: "16:00", endTime: "17:00", city: "Moeda" },
    { day: 18, name: "Lucas Pereira", address: "Rua João Pinheiro, 320 - Itabirito", startTime: "15:00", endTime: "16:00", city: "Itabirito" },
    { day: 21, name: "Patrícia Gomes", address: "Rua das Flores, 77 - Ouro Preto", startTime: "10:00", endTime: "11:00", city: "Ouro Preto" },
    { day: 28, name: "Thiago Costa", address: "Rua José Farid Rahme, 64 - Itabirito", startTime: "17:00", endTime: "18:00", city: "Itabirito" },
  ];

  return entries
    .filter((entry) => entry.day <= daysInMonth)
    .map((entry, index) => ({
      id: `demo-${monthStart}-${index}`,
      title: entry.name,
      date: buildMonthDate(monthStart, entry.day),
      startTime: entry.startTime,
      endTime: entry.endTime,
      city: entry.city,
      customerName: entry.name,
      customerAddress: entry.address,
      customerEmail: `${entry.name.toLowerCase().replace(/\s+/g, ".")}@email.com`,
      customerPhone: "31999999999",
      serviceLabel: "Visita técnica",
      status: "booked" as const,
    }));
}

function build4x4UnavailableDates(monthStart: string, anchorMonth: string): string[] {
  const reference = toLocalDate(monthStart);
  const daysInMonth = new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate();
  const anchorDate = toLocalDate(anchorMonth);
  const values = new Set<string>();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(reference.getFullYear(), reference.getMonth(), day);
    const iso = toIsoDate(date);
    const diffInDays = Math.floor((date.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24));
    const normalized = ((diffInDays % 8) + 8) % 8;
    if (normalized >= 4) values.add(iso);
  }

  return Array.from(values);
}

function mergeEvents(baseEvents: CalendarEvent[], localEvents: CalendarEvent[]) {
  const map = new Map<string, CalendarEvent>();
  for (const event of [...baseEvents, ...localEvents]) {
    map.set(event.id, event);
  }

  return Array.from(map.values()).sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    return byDate !== 0 ? byDate : a.startTime.localeCompare(b.startTime);
  });
}

function getViewportWidth(): number {
  if (typeof window === "undefined") return 1440;
  return Math.round(window.innerWidth);
}

function resolveDesktopColumns(width: number): string {
  if (width >= 1560) return "minmax(0, 2.16fr) minmax(320px, 22vw, 420px)";
  if (width >= 1280) return "minmax(0, 2.02fr) minmax(300px, 24vw, 390px)";
  if (width >= 1100) return "minmax(0, 1.92fr) minmax(286px, 25vw, 360px)";
  if (width >= 920) return "minmax(0, 1.84fr) minmax(264px, 27vw, 332px)";
  return "minmax(0, 1.74fr) minmax(238px, 29vw, 292px)";
}

function resolveCollapsedColumns(width: number): string {
  if (width >= 1280) return "minmax(0, 1fr) 118px";
  if (width >= 920) return "minmax(0, 1fr) 108px";
  return "minmax(0, 1fr) 96px";
}

export default function HomePage() {
  const today = new Date();
  const todayIso = toIsoDate(today);
  const currentAllowedMonth = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, "0")}-01`;
  const nextAllowedMonth = shiftMonth(currentAllowedMonth, 1);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const spotlightTimeoutRef = useRef<number | null>(null);

  const {
    selectedDate,
    selectedSlot,
    currentMonth,
    isBookingModalOpen,
    setCurrentMonth,
    handleDateSelect,
    clearSelection,
    openBookingModal,
    closeBookingModal,
  } = useHomeCalendarView();

  const { quickBookingRequestId, requestQuickBooking } = useHomeBookingSelection();
  const lastQuickRequestRef = useRef(0);
  const [timelineMonth, setTimelineMonth] = useState(currentAllowedMonth);
  const [viewportWidth, setViewportWidth] = useState(getViewportWidth);
  const [isBookingGuideOpen, setIsBookingGuideOpen] = useState(false);
  const [isBookingPickMode, setIsBookingPickMode] = useState(false);
  const [isSidebarPreviewOpen, setIsSidebarPreviewOpen] = useState(false);
  const [isSidebarFocused, setIsSidebarFocused] = useState(false);
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>(() =>
    getLocalCalendarEvents().filter((event) => event.date >= todayIso),
  );

  const isDesktopLayout = viewportWidth >= 730;

  const demoEvents = useMemo(
    () => [...buildMonthMockEvents(currentAllowedMonth), ...buildMonthMockEvents(nextAllowedMonth)].filter((event) => event.date >= todayIso),
    [currentAllowedMonth, nextAllowedMonth, todayIso],
  );

  const allEvents = useMemo(() => mergeEvents(demoEvents, localEvents), [demoEvents, localEvents]);
  const allUnavailableDates = useMemo(
    () => [
      ...build4x4UnavailableDates(currentAllowedMonth, currentAllowedMonth),
      ...build4x4UnavailableDates(nextAllowedMonth, currentAllowedMonth),
    ],
    [currentAllowedMonth, nextAllowedMonth],
  );

  const sidebarMonthLabel = useMemo(
    () => new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(toLocalDate(timelineMonth)).toUpperCase(),
    [timelineMonth],
  );

  const gridTemplateColumns = useMemo(() => {
    if (!isDesktopLayout) return "1fr";
    if (isBookingPickMode && !isSidebarPreviewOpen) return resolveCollapsedColumns(viewportWidth);
    return resolveDesktopColumns(viewportWidth);
  }, [isDesktopLayout, isBookingPickMode, isSidebarPreviewOpen, viewportWidth]);

  const pulseSidebar = () => {
    setIsSidebarFocused(true);
    if (spotlightTimeoutRef.current) window.clearTimeout(spotlightTimeoutRef.current);
    spotlightTimeoutRef.current = window.setTimeout(() => setIsSidebarFocused(false), 380);
  };

  const focusCalendar = () => {
    const node = calendarRef.current ?? document.querySelector<HTMLElement>(".home-calendar-stack");
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
    node?.classList.add("calendar-focus-pulse");
    window.setTimeout(() => node?.classList.remove("calendar-focus-pulse"), 620);
  };

  const focusSidebar = (withSpotlight = true) => {
    setIsBookingGuideOpen(false);
    setIsBookingPickMode(false);
    setIsSidebarPreviewOpen(false);

    const node = sidebarRef.current ?? document.querySelector<HTMLElement>(".home-sidebar");
    node?.scrollIntoView({ behavior: "smooth", block: isDesktopLayout ? "nearest" : "start", inline: "nearest" });
    if (withSpotlight) pulseSidebar();
  };

  useEffect(() => {
    const handleResize = () => setViewportWidth(getViewportWidth());
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    document.body.classList.add("home-page-active");
    document.body.classList.toggle("home-page-desktop", isDesktopLayout);
    document.body.classList.toggle("home-page-mobile", !isDesktopLayout);
    return () => {
      document.body.classList.remove("home-page-active", "home-page-desktop", "home-page-mobile");
    };
  }, [isDesktopLayout]);

  useEffect(() => {
    if (!isDesktopLayout) {
      setIsSidebarPreviewOpen(false);
      setIsSidebarFocused(false);
    }
  }, [isDesktopLayout]);

  useEffect(() => {
    const button = document.querySelector<HTMLElement>(".header-booking-action");
    if (!button) return;

    const spans = button.querySelectorAll("span");
    const labelNode = spans.item(spans.length - 1);
    if (labelNode) labelNode.textContent = "Meus agendamentos";
    button.setAttribute("aria-label", "Meus agendamentos");
    button.setAttribute("title", "Meus agendamentos");

    const handleHeaderAction = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      focusSidebar(true);
    };

    button.addEventListener("click", handleHeaderAction);
    return () => button.removeEventListener("click", handleHeaderAction);
  }, [isDesktopLayout]);

  useEffect(() => {
    if (!selectedDate) return;
    const selectedMonth = toMonthStart(selectedDate);
    if (selectedMonth === currentAllowedMonth || selectedMonth === nextAllowedMonth) {
      setTimelineMonth(selectedMonth);
    }
  }, [selectedDate, currentAllowedMonth, nextAllowedMonth]);

  useEffect(() => {
    if (quickBookingRequestId === 0) return;
    if (quickBookingRequestId === lastQuickRequestRef.current) return;

    lastQuickRequestRef.current = quickBookingRequestId;
    clearSelection();
    setIsSidebarFocused(false);
    setIsBookingPickMode(true);
    setIsSidebarPreviewOpen(false);
    setIsBookingGuideOpen(true);

    window.requestAnimationFrame(() => focusCalendar());
  }, [quickBookingRequestId, clearSelection]);

  useEffect(() => {
    return () => {
      if (spotlightTimeoutRef.current) window.clearTimeout(spotlightTimeoutRef.current);
    };
  }, []);

  const handleCalendarDateSelect = (date: string, options?: { unavailable?: boolean }) => {
    if (options?.unavailable) return;

    handleDateSelect(date);

    if (isBookingPickMode) {
      setIsBookingGuideOpen(false);
      setIsBookingPickMode(false);
      setIsSidebarPreviewOpen(false);
      openBookingModal();
      if (isDesktopLayout) {
        window.requestAnimationFrame(() => pulseSidebar());
      }
    }
  };

  const handleCalendarMonthChange = (month: string) => {
    clearSelection();
    closeBookingModal();
    setCurrentMonth(month);
    setTimelineMonth(month);
    setIsBookingGuideOpen(false);
    setIsBookingPickMode(false);
    setIsSidebarPreviewOpen(false);
    setIsSidebarFocused(false);
  };

  const handleTimelineMonthChange = (month: string) => {
    clearSelection();
    closeBookingModal();
    setTimelineMonth(month);
    setCurrentMonth(month);
    setIsBookingGuideOpen(false);
    setIsBookingPickMode(false);
    setIsSidebarPreviewOpen(false);
    setIsSidebarFocused(false);
  };

  const handleOpenDayBooking = (date: string) => {
    clearSelection();
    handleDateSelect(date);
    setIsBookingGuideOpen(false);
    setIsBookingPickMode(false);
    setIsSidebarPreviewOpen(false);
    openBookingModal();
    if (isDesktopLayout) pulseSidebar();
  };

  const handleCloseBookingGuide = () => {
    setIsBookingGuideOpen(false);
    setIsBookingPickMode(false);
    setIsSidebarPreviewOpen(false);
  };

  const handleBookingCreated = (event: CalendarEvent) => {
    setLocalEvents((current) => mergeEvents(current, [event]));
    setTimelineMonth(toMonthStart(event.date));
    handleDateSelect(event.date);
    if (isDesktopLayout) pulseSidebar();
  };

  const homePageStyle = isDesktopLayout
    ? { height: "100%", minHeight: 0, overflow: "hidden" as const }
    : { height: "auto", minHeight: 0, overflow: "visible" as const };

  const gridStyle = isDesktopLayout
    ? {
        display: "grid",
        gridTemplateColumns,
        gap: viewportWidth >= 1100 ? "16px" : viewportWidth >= 860 ? "14px" : "12px",
        height: "100%",
        minHeight: 0,
        alignItems: "stretch",
        overflow: "hidden" as const,
      }
    : {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "12px",
        height: "auto",
        minHeight: 0,
        overflow: "visible" as const,
      };

  const calendarWrapStyle = isDesktopLayout
    ? { minWidth: 0, minHeight: 0, height: "100%", overflow: "hidden" as const }
    : { minWidth: 0, minHeight: 0, height: "auto", overflow: "visible" as const };

  const sidebarWrapStyle = isDesktopLayout
    ? { minWidth: 0, minHeight: 0, height: "100%", overflow: "hidden" as const }
    : { minWidth: 0, minHeight: 0, height: "auto", overflow: "visible" as const };

  const sidebarClassName = [
    "home-sidebar",
    isDesktopLayout && isBookingPickMode && !isSidebarPreviewOpen ? "home-sidebar--collapsed" : "",
    isDesktopLayout && isSidebarPreviewOpen ? "home-sidebar--preview" : "",
    isSidebarFocused ? "home-sidebar--focused" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const rootClassName = [
    "home-page",
    isDesktopLayout ? "home-page--desktop" : "home-page--mobile",
    isDesktopLayout && isBookingPickMode ? "home-page--pick-mode" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName} style={homePageStyle}>
      <div className="home-grid" style={gridStyle}>
        <div ref={calendarRef} className="home-page__calendar-wrap" style={calendarWrapStyle}>
          <HomeCalendarSection
            selectedDate={selectedDate}
            currentMonth={currentMonth}
            currentAllowedMonth={currentAllowedMonth}
            nextAllowedMonth={nextAllowedMonth}
            events={allEvents}
            unavailableDates={allUnavailableDates}
            bookingPickMode={isBookingPickMode}
            onDateSelect={handleCalendarDateSelect}
            onMonthChange={handleCalendarMonthChange}
            onOpenDayBooking={handleOpenDayBooking}
          />
        </div>

        <div ref={sidebarRef} className="home-page__sidebar-wrap" style={sidebarWrapStyle}>
          <HomeSidebar
            className={sidebarClassName}
            selectedDate={selectedDate}
            events={allEvents}
            activeMonth={timelineMonth}
            currentAllowedMonth={currentAllowedMonth}
            nextAllowedMonth={nextAllowedMonth}
            onChangeTimelineMonth={handleTimelineMonthChange}
            onQuickBooking={() => {
              clearSelection();
              requestQuickBooking();
            }}
            bookingPickMode={isBookingPickMode}
            isCollapsed={isDesktopLayout && isBookingPickMode && !isSidebarPreviewOpen}
            onOpenDayBooking={handleOpenDayBooking}
            onMouseEnter={() => {
              if (isDesktopLayout && isBookingPickMode) setIsSidebarPreviewOpen(true);
            }}
            onMouseLeave={() => {
              if (isDesktopLayout && isBookingPickMode) setIsSidebarPreviewOpen(false);
            }}
            eyebrow={sidebarMonthLabel}
            title="MEUS AGENDAMENTOS"
          />
        </div>
      </div>

      <BookingStartHintModal open={isBookingGuideOpen} onClose={handleCloseBookingGuide} />

      <BookingFormModal
        open={isBookingModalOpen}
        selectedDate={selectedDate || todayIso}
        selectedSlot={selectedSlot}
        events={allEvents}
        unavailableDates={allUnavailableDates}
        onClose={closeBookingModal}
        onBookingCreated={handleBookingCreated}
      />
    </div>
  );
}
