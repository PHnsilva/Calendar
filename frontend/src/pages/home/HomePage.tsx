import { useEffect, useMemo, useRef, useState } from "react";
import "../../app/home-layout.css";
import "../../app/booking-sidebar.css";
import HomeCalendarSection from "../../features/home/components/HomeCalendarSection";
import HomeSidebar from "../../features/home/components/HomeSidebar";
import BookingFormModal from "../../features/booking-form/components/BookingFormModal";
import BookingStartHintModal from "../../components/ui/BookingStartHintModal";
import { useHomeCalendarView } from "../../features/home/hooks/useHomeCalendarView";
import { useHomeBookingSelection } from "../../app/home-booking-provider";
import type { CalendarEvent } from "../../features/calendar/types";
import { getLocalCalendarEvents, getStoredAdminToken } from "../../lib/storage";
import { useAvailableMonthDates } from "../../features/calendar/hooks/useAvailableMonthDates";
import { useAdminBookings } from "../../features/admin/hooks/useAdminBookings";

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

function getMonthDates(monthStart: string): string[] {
  const reference = toLocalDate(monthStart);
  const daysInMonth = new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) =>
    toIsoDate(new Date(reference.getFullYear(), reference.getMonth(), index + 1)),
  );
}

function build4x4UnavailableDates(monthStart: string, anchorDateString: string): string[] {
  const anchorDate = toLocalDate(anchorDateString);

  return getMonthDates(monthStart).filter((dateString) => {
    const currentDate = toLocalDate(dateString);
    const diffInDays = Math.floor((currentDate.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24));
    const normalized = ((diffInDays % 8) + 8) % 8;
    return normalized >= 4;
  });
}

function buildUnavailableFromAvailability(monthStart: string, availableDates: string[]): string[] {
  const available = new Set(availableDates);
  return getMonthDates(monthStart).filter((date) => !available.has(date));
}

function mergeEvents(events: CalendarEvent[]) {
  const map = new Map<string, CalendarEvent>();
  for (const event of events) map.set(event.id, event);
  return Array.from(map.values()).sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    return byDate !== 0 ? byDate : a.startTime.localeCompare(b.startTime);
  });
}

type HomePageProps = {
  mode?: "public" | "admin";
};

export default function HomePage({ mode = "public" }: HomePageProps) {
  const isAdminMode = mode === "admin";
  const today = new Date();
  const todayIso = toIsoDate(today);
  const currentAllowedMonth = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, "0")}-01`;
  const nextAllowedMonth = shiftMonth(currentAllowedMonth, 1);
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement | null>(null);

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

  const { quickBookingRequestId, openBookingsRequestId, requestQuickBooking } = useHomeBookingSelection();
  const lastQuickRequestRef = useRef(0);
  const lastOpenSidebarRequestRef = useRef(0);
  const [timelineMonth, setTimelineMonth] = useState(currentAllowedMonth);
  const [isBookingGuideOpen, setIsBookingGuideOpen] = useState(false);
  const [isBookingPickMode, setIsBookingPickMode] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(() => window.innerWidth);
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>(() =>
    getLocalCalendarEvents().filter((event) => event.date >= todayIso),
  );

  const isDesktop = viewportWidth > 730;
  const adminBookings = useAdminBookings({}, isAdminMode && Boolean(getStoredAdminToken()));

  const currentMonthAvailability = useAvailableMonthDates(currentAllowedMonth, !isAdminMode);
  const nextMonthAvailability = useAvailableMonthDates(nextAllowedMonth, !isAdminMode);

  const allEvents = useMemo(
    () => (isAdminMode ? mergeEvents(adminBookings.calendarEvents) : mergeEvents(localEvents)),
    [adminBookings.calendarEvents, isAdminMode, localEvents],
  );

  const allUnavailableDates = useMemo(() => {
    if (isAdminMode) return [];

    const currentFallback = build4x4UnavailableDates(currentAllowedMonth, todayIso);
    const nextFallback = build4x4UnavailableDates(nextAllowedMonth, todayIso);

    const currentUnavailable = currentMonthAvailability.hasError || currentMonthAvailability.isLoading
      ? currentFallback
      : buildUnavailableFromAvailability(currentAllowedMonth, currentMonthAvailability.availableDates);

    const nextUnavailable = nextMonthAvailability.hasError || nextMonthAvailability.isLoading
      ? nextFallback
      : buildUnavailableFromAvailability(nextAllowedMonth, nextMonthAvailability.availableDates);

    return [...currentUnavailable, ...nextUnavailable];
  }, [
    currentAllowedMonth,
    currentMonthAvailability.availableDates,
    currentMonthAvailability.hasError,
    currentMonthAvailability.isLoading,
    isAdminMode,
    nextAllowedMonth,
    nextMonthAvailability.availableDates,
    nextMonthAvailability.hasError,
    nextMonthAvailability.isLoading,
    todayIso,
  ]);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    if (isDesktop) {
      html.classList.add("home-scroll-locked");
      body.classList.add("home-scroll-locked");
    } else {
      html.classList.remove("home-scroll-locked");
      body.classList.remove("home-scroll-locked");
    }

    return () => {
      html.classList.remove("home-scroll-locked");
      body.classList.remove("home-scroll-locked");
    };
  }, [isDesktop]);

  useEffect(() => {
    if (!isDesktop) {
      setIsSidebarExpanded(true);
      return;
    }
    setIsSidebarExpanded((current) => current && !isBookingPickMode);
  }, [isDesktop, isBookingPickMode]);

  useEffect(() => {
    if (!selectedDate) return;
    const selectedMonth = toMonthStart(selectedDate);
    if (selectedMonth === currentAllowedMonth || selectedMonth === nextAllowedMonth) {
      setTimelineMonth(selectedMonth);
    }
  }, [selectedDate, currentAllowedMonth, nextAllowedMonth]);

  useEffect(() => {
    if (isAdminMode) return;
    if (quickBookingRequestId === 0) return;
    if (quickBookingRequestId === lastQuickRequestRef.current) return;
    lastQuickRequestRef.current = quickBookingRequestId;

    clearSelection();
    closeBookingModal();
    setIsBookingPickMode(true);
    setIsBookingGuideOpen(true);
    setIsSidebarExpanded(false);

    if (!isDesktop) {
      window.requestAnimationFrame(() => {
        calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [quickBookingRequestId, clearSelection, closeBookingModal, isDesktop, isAdminMode]);

  useEffect(() => {
    if (openBookingsRequestId === 0) return;
    if (openBookingsRequestId === lastOpenSidebarRequestRef.current) return;
    lastOpenSidebarRequestRef.current = openBookingsRequestId;

    setIsBookingPickMode(false);
    setIsBookingGuideOpen(false);
    setIsSidebarExpanded(true);

    window.requestAnimationFrame(() => {
      sidebarRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "end" });
    });
  }, [openBookingsRequestId]);

  const handleCalendarDateSelect = (date: string, options?: { unavailable?: boolean }) => {
    if (options?.unavailable) return;

    handleDateSelect(date);

    if (!isAdminMode && isBookingPickMode) {
      setIsBookingGuideOpen(false);
      setIsBookingPickMode(false);
      setIsSidebarExpanded(true);
      openBookingModal();
    }

    if (!isDesktop) {
      window.requestAnimationFrame(() => {
        sidebarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const handleCalendarMonthChange = (month: string) => {
    clearSelection();
    closeBookingModal();
    setCurrentMonth(month);
    setTimelineMonth(month);
    setIsBookingGuideOpen(false);
    setIsBookingPickMode(false);
  };

  const handleTimelineMonthChange = (month: string) => {
    clearSelection();
    closeBookingModal();
    setTimelineMonth(month);
    setCurrentMonth(month);
    setIsBookingGuideOpen(false);
    setIsBookingPickMode(false);
  };

  const handleOpenDayBooking = (date: string) => {
    if (isAdminMode) {
      handleDateSelect(date);
      setIsSidebarExpanded(true);
      return;
    }

    clearSelection();
    handleDateSelect(date);
    setIsBookingGuideOpen(false);
    setIsBookingPickMode(false);
    setIsSidebarExpanded(true);
    openBookingModal();
  };

  const handleRailDateSelect = (date: string) => {
    handleDateSelect(date);
    setTimelineMonth(toMonthStart(date));
    if (isDesktop) setIsSidebarExpanded(true);
  };

  const handleCloseBookingGuide = () => {
    setIsBookingGuideOpen(false);
    setIsBookingPickMode(false);
  };

  const handleBookingCreated = (event: CalendarEvent) => {
    setLocalEvents((current) => mergeEvents([...current, event]));
    setTimelineMonth(toMonthStart(event.date));
    handleDateSelect(event.date);
    setIsSidebarExpanded(true);
  };

  return (
    <div className="home-page home-page--sidebar-layout">
      <div
        className={[
          "home-grid",
          isDesktop ? "home-grid--desktop" : "home-grid--mobile",
          isDesktop && isSidebarExpanded ? "home-grid--sidebar-open" : "",
          isDesktop && !isSidebarExpanded ? "home-grid--sidebar-collapsed" : "",
          !isAdminMode && isBookingPickMode ? "home-grid--pick-mode" : "",
        ].filter(Boolean).join(" ")}
      >
        <div ref={calendarRef} className="home-calendar-stack home-calendar-stack--shell">
          <HomeCalendarSection
            selectedDate={selectedDate}
            currentMonth={currentMonth}
            currentAllowedMonth={currentAllowedMonth}
            nextAllowedMonth={nextAllowedMonth}
            events={allEvents}
            unavailableDates={allUnavailableDates}
            bookingPickMode={!isAdminMode && isBookingPickMode}
            onDateSelect={handleCalendarDateSelect}
            onMonthChange={handleCalendarMonthChange}
            onOpenDayBooking={handleOpenDayBooking}
          />
        </div>

        <div ref={sidebarRef} className="home-sidebar-anchor">
          <HomeSidebar
            selectedDate={selectedDate}
            events={allEvents}
            activeMonth={timelineMonth}
            currentAllowedMonth={currentAllowedMonth}
            nextAllowedMonth={nextAllowedMonth}
            onChangeTimelineMonth={handleTimelineMonthChange}
            onQuickBooking={() => {
              if (isAdminMode) return;
              clearSelection();
              requestQuickBooking();
            }}
            onOpenDayBooking={handleOpenDayBooking}
            onToggleExpanded={() => setIsSidebarExpanded((current) => !current)}
            onSelectRailDate={handleRailDateSelect}
            isExpanded={isSidebarExpanded}
            isDesktop={isDesktop}
            isAdminMode={isAdminMode}
          />
        </div>
      </div>

      {!isAdminMode ? <BookingStartHintModal open={isBookingGuideOpen} onClose={handleCloseBookingGuide} /> : null}

      {!isAdminMode ? (
        <BookingFormModal
          open={isBookingModalOpen}
          selectedDate={selectedDate || todayIso}
          selectedSlot={selectedSlot}
          events={allEvents}
          unavailableDates={allUnavailableDates}
          onClose={closeBookingModal}
          onBookingCreated={handleBookingCreated}
        />
      ) : null}
    </div>
  );
}
