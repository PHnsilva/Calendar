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


// Mock descartável para pré-visualizar a paleta por cidade no calendário.
const ENABLE_CITY_COLOR_PREVIEW_MOCK = true;

function addDays(baseDate: Date, days: number): Date {
  const next = new Date(baseDate);
  next.setDate(baseDate.getDate() + days);
  return next;
}

function buildPreviewMockEvents(today: Date): CalendarEvent[] {
  const previewConfigs = [
    {
      id: "mock-city-preview-1",
      date: addDays(today, 1),
      startTime: "08:00",
      endTime: "09:00",
      city: "Itabirito",
      customerName: "Carlos A.",
      customerAddress: "Rua José Antônio, 120 - Centro - Itabirito/MG CEP: 35450-000",
      serviceLabel: "Instalação elétrica",
    },
    {
      id: "mock-city-preview-2",
      date: addDays(today, 3),
      startTime: "10:30",
      endTime: "11:30",
      city: "Ouro Preto",
      customerName: "Mariana P.",
      customerAddress: "Rua das Mercês, 88 - Antônio Dias - Ouro Preto/MG CEP: 35400-000",
      serviceLabel: "Reparo hidráulico",
    },
    {
      id: "mock-city-preview-3",
      date: addDays(today, 5),
      startTime: "14:00",
      endTime: "15:00",
      city: "Moeda",
      customerName: "Rafael M.",
      customerAddress: "Av. Principal, 45 - Centro - Moeda/MG CEP: 35470-000",
      serviceLabel: "Pintura interna",
    },
    {
      id: "mock-city-preview-4",
      date: addDays(today, 8),
      startTime: "16:30",
      endTime: "17:30",
      city: "Nova Lima",
      customerName: "Juliana S.",
      customerAddress: "Alameda das Flores, 310 - Jardim Canadá - Nova Lima/MG CEP: 34007-000",
      serviceLabel: "Montagem",
    },
    {
      id: "mock-city-preview-5",
      date: addDays(today, 11),
      startTime: "09:00",
      endTime: "10:00",
      city: "Congonhas",
      customerName: "Eduardo T.",
      customerAddress: "Rua Barão de Congonhas, 210 - Centro - Congonhas/MG CEP: 36415-000",
      serviceLabel: "Limpeza técnica",
    },
    {
      id: "mock-city-preview-6",
      date: addDays(today, 14),
      startTime: "13:30",
      endTime: "14:30",
      city: "Rio Acima",
      customerName: "Patrícia L.",
      customerAddress: "Rua da Serra, 56 - Centro - Rio Acima/MG CEP: 34300-000",
      serviceLabel: "Manutenção",
    },
    {
      id: "mock-city-preview-7",
      date: addDays(today, 18),
      startTime: "11:00",
      endTime: "12:00",
      city: "Belo Horizonte",
      customerName: "Fernanda C.",
      customerAddress: "Rua dos Timbiras, 1500 - Lourdes - Belo Horizonte/MG CEP: 30140-061",
      serviceLabel: "Instalação",
    },
    {
      id: "mock-city-preview-8",
      date: addDays(today, 22),
      startTime: "15:30",
      endTime: "16:30",
      city: "Brumadinho",
      customerName: "Lucas R.",
      customerAddress: "Rua das Acácias, 95 - Centro - Brumadinho/MG CEP: 35460-000",
      serviceLabel: "Revisão geral",
    },
  ];

  return previewConfigs.map((item) => ({
    id: item.id,
    title: item.serviceLabel,
    date: toIsoDate(item.date),
    startTime: item.startTime,
    endTime: item.endTime,
    city: item.city,
    customerName: item.customerName,
    customerAddress: item.customerAddress,
    serviceLabel: item.serviceLabel,
    status: "booked" as const,
  }));
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
  const previewMockEvents = useMemo(
    () => (ENABLE_CITY_COLOR_PREVIEW_MOCK ? buildPreviewMockEvents(toLocalDate(todayIso)) : []),
    [todayIso],
  );

  const currentMonthAvailability = useAvailableMonthDates(currentAllowedMonth, !isAdminMode);
  const nextMonthAvailability = useAvailableMonthDates(nextAllowedMonth, !isAdminMode);

  const allEvents = useMemo(
    () => mergeEvents([...(isAdminMode ? adminBookings.calendarEvents : localEvents), ...previewMockEvents]),
    [adminBookings.calendarEvents, isAdminMode, localEvents, previewMockEvents],
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
