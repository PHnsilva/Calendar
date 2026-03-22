import { useEffect, useMemo, useRef, useState } from "react";
import HomeCalendarSection from "../../features/home/components/HomeCalendarSection";
import HomeSidebar from "../../features/home/components/HomeSidebar";
import BookingFormModal from "../../features/booking-form/components/BookingFormModal";
import BookingStartHintModal from "../../components/ui/BookingStartHintModal";
import { useHomeCalendarView } from "../../features/home/hooks/useHomeCalendarView";
import { useHomeBookingSelection } from "../../app/home-booking-provider";
import type { CalendarEvent } from "../../features/calendar/types";
import { getLocalCalendarEvents } from "../../lib/storage";

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
  for (const event of [...baseEvents, ...localEvents]) map.set(event.id, event);
  return Array.from(map.values()).sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    return byDate !== 0 ? byDate : a.startTime.localeCompare(b.startTime);
  });
}

export default function HomePage() {
  const today = new Date();
  const todayIso = toIsoDate(today);
  const currentAllowedMonth = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, "0")}-01`;
  const nextAllowedMonth = shiftMonth(currentAllowedMonth, 1);
  const calendarRef = useRef<HTMLDivElement | null>(null);

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
  const [isBookingGuideOpen, setIsBookingGuideOpen] = useState(false);
  const [isBookingPickMode, setIsBookingPickMode] = useState(false);
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>(() =>
    getLocalCalendarEvents().filter((event) => event.date >= todayIso),
  );

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

  const focusCalendar = () => {
    const node = calendarRef.current ?? document.querySelector<HTMLElement>(".home-calendar-stack");
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
    node?.classList.add("calendar-focus-pulse");
    window.setTimeout(() => node?.classList.remove("calendar-focus-pulse"), 950);
  };

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
    setIsBookingPickMode(true);
    setIsBookingGuideOpen(true);

    if (window.matchMedia("(max-width: 860px)").matches) {
      window.requestAnimationFrame(() => focusCalendar());
    }
  }, [quickBookingRequestId, clearSelection]);

  const handleCalendarDateSelect = (date: string, options?: { unavailable?: boolean }) => {
    if (options?.unavailable) return;
    handleDateSelect(date);

    if (isBookingPickMode) {
      setIsBookingGuideOpen(false);
      setIsBookingPickMode(false);
      openBookingModal();
    }

    if (window.matchMedia("(max-width: 860px)").matches) {
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>(".timeline-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const handleOpenDayBooking = (date: string) => {
    handleDateSelect(date);
    setIsBookingGuideOpen(false);
    setIsBookingPickMode(false);
    openBookingModal();
  };

  const handleCalendarMonthChange = (month: string) => {
    closeBookingModal();
    clearSelection();
    setIsBookingGuideOpen(false);
    setIsBookingPickMode(false);
    setCurrentMonth(month);
    setTimelineMonth(month);
  };

  const handleTimelineMonthChange = (month: string) => {
    closeBookingModal();
    clearSelection();
    setIsBookingGuideOpen(false);
    setIsBookingPickMode(false);
    setTimelineMonth(month);
    setCurrentMonth(month);
  };

  const handleCloseBookingGuide = () => {
    setIsBookingGuideOpen(false);
    setIsBookingPickMode(false);
  };

  const handleBookingCreated = (event: CalendarEvent) => {
    setLocalEvents((current) => mergeEvents(current, [event]));
    setTimelineMonth(toMonthStart(event.date));
    handleDateSelect(event.date);
  };

  return (
    <div className="home-page">
      <section className="home-page__hero">
        <span className="home-page__eyebrow">Agenda inteligente</span>
      </section>

      <div className={`home-grid${isBookingPickMode ? " home-grid--pick-mode" : ""}`}>
        <div ref={calendarRef}>
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

        <HomeSidebar
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
        />
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
