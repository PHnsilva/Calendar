import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../types/api";
import AppShell from "../../layouts/AppShell";
import Logo from "../../components/branding/Logo";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import HomeSidebar from "../../features/home/components/HomeSidebar";
import HomeCalendarSection from "../../features/home/components/HomeCalendarSection";
import HistorySheet from "../../features/history/components/HistorySheet";
import StatementSheet from "../../features/finance/components/StatementSheet";
import { useAdminBookings } from "../../features/admin/hooks/useAdminBookings";
import { useAdminFilters } from "../../features/admin/hooks/useAdminFilters";
import { clearAdminToken, useAdminStore } from "../../stores/admin-store";
import type { CalendarEvent } from "../../features/calendar/types";

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftMonth(monthStart: string, delta: number): string {
  const base = new Date(`${monthStart}T12:00:00`);
  const next = new Date(base.getFullYear(), base.getMonth() + delta, 1);
  return `${next.getFullYear()}-${`${next.getMonth() + 1}`.padStart(2, "0")}-01`;
}

function maskToken(token: string): string {
  if (token.length <= 8) return token;
  return `${token.slice(0, 4)}••••${token.slice(-4)}`;
}

function bookingToCalendarEvent(booking: any): CalendarEvent {
  const start = new Date(booking.start);
  const end = new Date(booking.end);
  const formatTime = (value: Date) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(value);

  return {
    id: booking.eventId,
    title: booking.serviceType || "Visita técnica",
    date: booking.start.slice(0, 10),
    startTime: formatTime(start),
    endTime: formatTime(end),
    city: booking.clientCity,
    customerName: `${booking.clientFirstName ?? ""} ${booking.clientLastName ?? ""}`.trim() || "Cliente",
    addressLine: booking.clientAddressLine,
    email: booking.clientEmail,
    phone: booking.clientPhone,
    status: "booked",
  };
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { token, hasToken } = useAdminStore();
  const { filters } = useAdminFilters();
  const { bookingsQuery, filteredBookings } = useAdminBookings(filters);

  const todayIso = toIsoDate(new Date());
  const currentAllowedMonth = `${todayIso.slice(0, 7)}-01`;
  const nextAllowedMonth = shiftMonth(currentAllowedMonth, 1);

  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [currentMonth, setCurrentMonth] = useState(currentAllowedMonth);
  const [timelineMonth, setTimelineMonth] = useState(currentAllowedMonth);
  const [activeBottomSheet, setActiveBottomSheet] = useState<"history" | "statement" | null>(null);

  useEffect(() => {
    if (!hasToken) {
      navigate("/admin", { replace: true });
    }
  }, [hasToken, navigate]);

  const adminError = bookingsQuery.error instanceof Error ? bookingsQuery.error : null;
  const isForbidden = adminError instanceof ApiError && adminError.status === 403;

  const allEvents = useMemo(() => (filteredBookings ?? []).map(bookingToCalendarEvent), [filteredBookings]);
  const futureEvents = useMemo(() => allEvents.filter((event) => event.date >= todayIso), [allEvents, todayIso]);
  const historyBookings = useMemo(() => (filteredBookings ?? []).filter((booking) => booking.start.slice(0, 10) < todayIso).sort((a, b) => b.start.localeCompare(a.start)), [filteredBookings, todayIso]);

  useEffect(() => {
    if (selectedDate < todayIso) {
      setSelectedDate(todayIso);
    }
  }, [selectedDate, todayIso]);

  const header = (
    <header className="public-header admin-home-header">
      <div className="admin-home-header__brand">
        <Link to="/" className="brand-lockup" aria-label="Voltar para a home">
          <Logo />
        </Link>
        <div className="admin-home-header__copy">
          <span className="home-page__eyebrow">Admin</span>
          <strong>Agenda geral</strong>
          <small>Token {token ? maskToken(token) : "—"}</small>
        </div>
      </div>

      <div className="public-header__actions">
        <ThemeToggle />
        <button type="button" className="admin-mini-chip" onClick={() => clearAdminToken()}>
          Trocar token
        </button>
      </div>
    </header>
  );

  if (!token) return null;

  return (
    <AppShell header={header}>
      <main className="public-layout__content">
        <div className="home-page admin-home-page">
          <section className="home-page__hero">
            <span className="home-page__eyebrow">Visual do cliente + gestão admin</span>
          </section>

          {isForbidden ? (
            <section className="panel admin-inline-error">
              <strong>Token inválido ou expirado.</strong>
              <span>Volte ao gateway e informe um token admin válido.</span>
              <button type="button" className="admin-btn admin-btn--primary" onClick={() => navigate('/admin', { replace: true })}>Voltar ao gateway</button>
            </section>
          ) : null}

          <div className="home-grid home-grid--admin">
            <HomeSidebar
              selectedDate={selectedDate}
              events={futureEvents}
              activeMonth={timelineMonth}
              currentAllowedMonth={currentAllowedMonth}
              nextAllowedMonth={nextAllowedMonth}
              onChangeTimelineMonth={setTimelineMonth}
              hideQuickBooking
              eyebrow="Serviços"
              title="Todos os agendamentos"
            />

            <HomeCalendarSection
              selectedDate={selectedDate}
              currentMonth={currentMonth}
              currentAllowedMonth={currentAllowedMonth}
              nextAllowedMonth={nextAllowedMonth}
              events={futureEvents}
              unavailableDates={[]}
              onDateSelect={(date) => {
                setSelectedDate(date);
                setCurrentMonth(`${date.slice(0, 7)}-01`);
                setTimelineMonth(`${date.slice(0, 7)}-01`);
              }}
              onMonthChange={(month) => {
                setCurrentMonth(month);
                setTimelineMonth(month);
              }}
              onOpenDayBooking={(date) => {
                setSelectedDate(date);
              }}
              showInlineBookingAction={false}
            />
          </div>
        </div>

        <div className="admin-bottom-tabs">
          <button type="button" className="admin-bottom-tabs__button" onClick={() => setActiveBottomSheet('history')}>Histórico</button>
          <button type="button" className="admin-bottom-tabs__button" onClick={() => setActiveBottomSheet('statement')}>Extrato</button>
        </div>

        <HistorySheet
          open={activeBottomSheet === 'history'}
          onClose={() => setActiveBottomSheet(null)}
          bookings={historyBookings}
        />

        <StatementSheet
          open={activeBottomSheet === 'statement'}
          onClose={() => setActiveBottomSheet(null)}
        />
      </main>
    </AppShell>
  );
}
