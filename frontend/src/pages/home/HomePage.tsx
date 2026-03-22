import { useEffect, useMemo, useRef, useState } from "react";
import HomeCalendarSection from "../../features/home/components/HomeCalendarSection";
import HomeSidebar from "../../features/home/components/HomeSidebar";
import BookingFormModal from "../../features/booking-form/components/BookingFormModal";
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
  const daysInMonth = new Date(
    reference.getFullYear(),
    reference.getMonth() + 1,
    0,
  ).getDate();

  const entries = [
    { day: 2, name: "Mariana Souza", address: "Rua A, 120 - Centro", email: "mariana@email.com", phone: "31999990001", startTime: "08:00", endTime: "09:00", city: "Itabirito" },
    { day: 7, name: "Felipe Lima", address: "Av. B, 420 - Pilar", email: "felipe@email.com", phone: "31999990002", startTime: "09:00", endTime: "10:00", city: "Ouro Preto" },
    { day: 12, name: "Ana Ribeiro", address: "Rua C, 85 - Centro", email: "ana@email.com", phone: "31999990003", startTime: "13:00", endTime: "14:00", city: "Moeda" },
    { day: 18, name: "Carlos Mendes", address: "Rua D, 41 - Novo Horizonte", email: "carlos@email.com", phone: "31999990004", startTime: "15:00", endTime: "16:00", city: "Itabirito" },
    { day: 21, name: "Paula Costa", address: "Rua E, 210 - Rosário", email: "paula@email.com", phone: "31999990005", startTime: "10:00", endTime: "11:00", city: "Ouro Preto" },
    { day: 28, name: "João Silva", address: "Rua F, 300 - Centro", email: "joao@email.com", phone: "31999990006", startTime: "18:00", endTime: "19:00", city: "Itabirito" },
  ];

  return entries
    .filter((entry) => entry.day <= daysInMonth)
    .map((entry, index) => ({
      id: `${monthStart}-${index}`,
      title: "Visita técnica",
      date: buildMonthDate(monthStart, entry.day),
      startTime: entry.startTime,
      endTime: entry.endTime,
      city: entry.city,
      customerName: entry.name,
      addressLine: entry.address,
      email: entry.email,
      phone: entry.phone,
      status: "booked" as const,
    }));
}

function build4x4UnavailableDates(monthStart: string, anchorMonth: string): string[] {
  const reference = toLocalDate(monthStart);
  const daysInMonth = new Date(
    reference.getFullYear(),
    reference.getMonth() + 1,
    0,
  ).getDate();

  const anchorDate = toLocalDate(anchorMonth);
  const values = new Set<string>();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(reference.getFullYear(), reference.getMonth(), day);
    const iso = toIsoDate(date);

    const diffInDays = Math.floor(
      (date.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const normalized = ((diffInDays % 8) + 8) % 8;
    if (normalized >= 4) {
      values.add(iso);
    }
  }

  return Array.from(values);
}

function findFirstAvailableDate(
  monthStart: string,
  unavailableDates: string[],
): string {
  const reference = toLocalDate(monthStart);
  const daysInMonth = new Date(
    reference.getFullYear(),
    reference.getMonth() + 1,
    0,
  ).getDate();
  const todayIso = toIsoDate(new Date());

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = buildMonthDate(monthStart, day);
    if (date < todayIso) continue;
    if (!unavailableDates.includes(date)) {
      return date;
    }
  }

  return todayIso;
}

function mergeEvents(baseEvents: CalendarEvent[], localEvents: CalendarEvent[]) {
  const map = new Map<string, CalendarEvent>();
  for (const event of [...baseEvents, ...localEvents]) {
    map.set(event.id, event);
  }
  return Array.from(map.values()).sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return a.startTime.localeCompare(b.startTime);
  });
}

export default function HomePage() {
  const today = new Date();
  const todayIso = toIsoDate(today);
  const currentAllowedMonth = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, "0")}-01`;
  const nextAllowedMonth = shiftMonth(currentAllowedMonth, 1);

  const {
    selectedDate,
    selectedSlot,
    currentMonth,
    isBookingModalOpen,
    setCurrentMonth,
    handleDateSelect,
    openBookingModal,
    closeBookingModal,
  } = useHomeCalendarView();

  const { quickBookingRequestId, requestQuickBooking } = useHomeBookingSelection();
  const lastQuickRequestRef = useRef(0);
  const [timelineMonth, setTimelineMonth] = useState(currentAllowedMonth);
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>(() =>
    getLocalCalendarEvents().filter((event) => event.date >= todayIso),
  );

  const demoEvents = useMemo(
    () => [
      ...buildMonthMockEvents(currentAllowedMonth),
      ...buildMonthMockEvents(nextAllowedMonth),
    ].filter((event) => event.date >= todayIso),
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

  useEffect(() => {
    const selectedMonth = toMonthStart(selectedDate);
    if (
      selectedMonth === currentAllowedMonth ||
      selectedMonth === nextAllowedMonth
    ) {
      setTimelineMonth(selectedMonth);
    }
  }, [selectedDate, currentAllowedMonth, nextAllowedMonth]);

  useEffect(() => {
    if (quickBookingRequestId === 0) return;
    if (quickBookingRequestId === lastQuickRequestRef.current) return;

    lastQuickRequestRef.current = quickBookingRequestId;

    const firstAvailable = findFirstAvailableDate(currentMonth, allUnavailableDates);
    handleDateSelect(firstAvailable);
    openBookingModal();
  }, [
    quickBookingRequestId,
    currentMonth,
    allUnavailableDates,
    handleDateSelect,
    openBookingModal,
  ]);

  const handleCalendarDateSelect = (
    date: string,
    options?: { unavailable?: boolean },
  ) => {
    if (options?.unavailable) return;
    handleDateSelect(date);

    const isMobile = window.matchMedia("(max-width: 860px)").matches;
    if (isMobile) {
      window.requestAnimationFrame(() => {
        document
          .querySelector(".timeline-panel")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const handleOpenDayBooking = (date: string) => {
    handleDateSelect(date);
    openBookingModal();
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

      <div className="home-grid">
        <HomeSidebar
          selectedDate={selectedDate}
          events={allEvents}
          activeMonth={timelineMonth}
          currentAllowedMonth={currentAllowedMonth}
          nextAllowedMonth={nextAllowedMonth}
          onChangeTimelineMonth={setTimelineMonth}
          onQuickBooking={requestQuickBooking}
        />

        <HomeCalendarSection
          selectedDate={selectedDate}
          currentMonth={currentMonth}
          currentAllowedMonth={currentAllowedMonth}
          nextAllowedMonth={nextAllowedMonth}
          events={allEvents}
          unavailableDates={allUnavailableDates}
          onDateSelect={handleCalendarDateSelect}
          onMonthChange={setCurrentMonth}
          onOpenDayBooking={handleOpenDayBooking}
        />
      </div>

      <BookingFormModal
        open={isBookingModalOpen}
        selectedDate={selectedDate}
        selectedSlot={selectedSlot}
        events={allEvents}
        unavailableDates={allUnavailableDates}
        onClose={closeBookingModal}
        onBookingCreated={handleBookingCreated}
      />
    </div>
  );
}
