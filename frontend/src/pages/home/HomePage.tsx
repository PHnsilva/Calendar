import { useMemo } from "react";
import HomeCalendarSection from "../../features/home/components/HomeCalendarSection";
import HomeSidebar from "../../features/home/components/HomeSidebar";
import BookingFormModal from "../../features/booking-form/components/BookingFormModal";
import { useHomeCalendarView } from "../../features/home/hooks/useHomeCalendarView";
import type { CalendarEvent } from "../../features/calendar/types";

function toLocalDate(dateString: string): Date {
  return new Date(`${dateString}T12:00:00`);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
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
    {
      day: 3,
      title: "Revisão leve",
      startTime: "08:30",
      endTime: "09:00",
      city: "Itabirito",
    },
    {
      day: 3,
      title: "Troca de óleo",
      startTime: "10:00",
      endTime: "10:30",
      city: "Itabirito",
    },
    {
      day: 7,
      title: "Check-up geral",
      startTime: "09:30",
      endTime: "10:00",
      city: "Ouro Preto",
    },
    {
      day: 13,
      title: "Diagnóstico",
      startTime: "13:30",
      endTime: "14:00",
      city: "Moeda",
    },
    {
      day: 18,
      title: "Inspeção elétrica",
      startTime: "15:00",
      endTime: "15:30",
      city: "Itabirito",
    },
    {
      day: 18,
      title: "Revisão preventiva",
      startTime: "16:00",
      endTime: "16:30",
      city: "Itabirito",
    },
    {
      day: 25,
      title: "Check-list final",
      startTime: "09:30",
      endTime: "10:00",
      city: "Ouro Preto",
    },
  ];

  return entries
    .filter((entry) => entry.day <= daysInMonth)
    .map((entry, index) => ({
      id: `${monthStart}-${index}`,
      title: entry.title,
      date: buildMonthDate(monthStart, entry.day),
      startTime: entry.startTime,
      endTime: entry.endTime,
      city: entry.city,
      status: "booked" as const,
    }));
}

function buildUnavailableDates(monthStart: string): string[] {
  const reference = toLocalDate(monthStart);
  const daysInMonth = new Date(
    reference.getFullYear(),
    reference.getMonth() + 1,
    0,
  ).getDate();

  const today = new Date();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  const values = new Set<string>();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(reference.getFullYear(), reference.getMonth(), day);
    const iso = toIsoDate(date);

    if (date.getDay() === 0) {
      values.add(iso);
    }

    if (
      reference.getFullYear() === todayYear &&
      reference.getMonth() === todayMonth &&
      day < today.getDate()
    ) {
      values.add(iso);
    }
  }

  [6, 12, 19, 26].forEach((day) => {
    if (day <= daysInMonth) {
      values.add(buildMonthDate(monthStart, day));
    }
  });

  return Array.from(values);
}

export default function HomePage() {
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

  const events = useMemo(() => buildMonthMockEvents(currentMonth), [currentMonth]);
  const unavailableDates = useMemo(
    () => buildUnavailableDates(currentMonth),
    [currentMonth],
  );

  const handleCalendarDateSelect = (
    date: string,
    options?: { unavailable?: boolean },
  ) => {
    handleDateSelect(date);

    const isMobile = window.matchMedia("(max-width: 860px)").matches;
    const isUnavailable = Boolean(options?.unavailable);

    if (isMobile) {
      window.requestAnimationFrame(() => {
        document
          .getElementById("day-agenda-panel")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }

    if (!isUnavailable) {
      openBookingModal();
    }
  };

  const handleMiniCalendarDateSelect = (date: string) => {
    handleDateSelect(date);

    const isMobile = window.matchMedia("(max-width: 860px)").matches;
    if (isMobile) {
      window.requestAnimationFrame(() => {
        document
          .getElementById("day-agenda-panel")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const selectedDateUnavailable = unavailableDates.includes(selectedDate);

  return (
    <div className="home-page">
      <section className="home-page__hero">
        <span className="home-page__eyebrow">Agenda inteligente</span>
      </section>

      <div className="home-grid">
        <HomeCalendarSection
          selectedDate={selectedDate}
          currentMonth={currentMonth}
          events={events}
          unavailableDates={unavailableDates}
          onDateSelect={handleCalendarDateSelect}
          onMonthChange={setCurrentMonth}
        />

        <HomeSidebar
          selectedDate={selectedDate}
          currentMonth={currentMonth}
          events={events}
          unavailableDates={unavailableDates}
          onDateSelect={handleMiniCalendarDateSelect}
          onOpenBookingModal={openBookingModal}
        />
      </div>

      <BookingFormModal
        open={isBookingModalOpen}
        selectedDate={selectedDate}
        selectedSlot={selectedSlot}
        events={events}
        unavailableDates={unavailableDates}
        onClose={closeBookingModal}
      />

      {selectedDateUnavailable ? null : null}
    </div>
  );
}