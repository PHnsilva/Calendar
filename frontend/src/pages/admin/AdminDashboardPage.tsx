import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import AppShell from "../../layouts/AppShell";
import Logo from "../../components/branding/Logo";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import HomeSidebar from "../../features/home/components/HomeSidebar";
import HomeCalendarSection from "../../features/home/components/HomeCalendarSection";
import type { CalendarEvent } from "../../features/calendar/types";
import { getLocalCalendarEvents } from "../../lib/storage";

const ADMIN_TOKEN_KEY = "calendar.adminToken";

function getSavedAdminToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ADMIN_TOKEN_KEY) ?? "";
}

function clearAdminToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
}

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
    { day: 18, name: "Lucas Pereira", address: "Rua João Pinheiro, 320 - Itabirito", startTime: "15:00", endTime: "16:00", city: "Itabirito" },
    { day: 21, name: "Patrícia Gomes", address: "Rua das Flores, 77 - Ouro Preto", startTime: "10:00", endTime: "11:00", city: "Ouro Preto" },
    { day: 28, name: "Thiago Costa", address: "Rua José Farid Rahme, 64 - Itabirito", startTime: "17:00", endTime: "18:00", city: "Itabirito" },
  ];

  return entries
    .filter((entry) => entry.day <= daysInMonth)
    .map((entry, index) => ({
      id: `admin-demo-${monthStart}-${index}`,
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

function mergeEvents(baseEvents: CalendarEvent[], localEvents: CalendarEvent[]) {
  const map = new Map<string, CalendarEvent>();
  for (const event of [...baseEvents, ...localEvents]) map.set(event.id, event);
  return Array.from(map.values()).sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    return byDate !== 0 ? byDate : a.startTime.localeCompare(b.startTime);
  });
}

export default function AdminDashboardPage() {
  const token = getSavedAdminToken();
  const todayIso = toIsoDate(new Date());
  const currentAllowedMonth = `${todayIso.slice(0, 7)}-01`;
  const nextAllowedMonth = shiftMonth(currentAllowedMonth, 1);
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [currentMonth, setCurrentMonth] = useState(currentAllowedMonth);
  const [timelineMonth, setTimelineMonth] = useState(currentAllowedMonth);
  const [activeSheet, setActiveSheet] = useState<"history" | "statement" | null>(null);

  const allEvents = useMemo(() => {
    const locals = getLocalCalendarEvents().filter((event) => event.date >= todayIso);
    return mergeEvents(
      [...buildMonthMockEvents(currentAllowedMonth), ...buildMonthMockEvents(nextAllowedMonth)].filter((event) => event.date >= todayIso),
      locals,
    );
  }, [currentAllowedMonth, nextAllowedMonth, todayIso]);

  const historyEvents = useMemo(
    () => getLocalCalendarEvents().filter((event) => event.date < todayIso).sort((a, b) => b.date.localeCompare(a.date)),
    [todayIso],
  );

  if (!token) {
    return <Navigate to="/admin" replace />;
  }

  const header = (
    <header className="public-header">
      <Link to="/admin/dashboard" className="brand-lockup" aria-label="Ir para o dashboard admin">
        <Logo />
      </Link>

      <div className="public-header__actions">
        <ThemeToggle />
        <button
          type="button"
          className="header-booking-action header-booking-action--ghost"
          onClick={() => {
            clearAdminToken();
            window.location.href = "/admin";
          }}
        >
          Trocar token
        </button>
      </div>
    </header>
  );

  return (
    <AppShell header={header}>
      <main className="public-layout__content">
        <div className="home-page">
          <section className="home-page__hero">
            <span className="home-page__eyebrow">Admin · agenda completa</span>
          </section>

          <div className="home-grid home-grid--admin-view">
            <HomeCalendarSection
              selectedDate={selectedDate}
              currentMonth={currentMonth}
              currentAllowedMonth={currentAllowedMonth}
              nextAllowedMonth={nextAllowedMonth}
              events={allEvents}
              unavailableDates={[]}
              onDateSelect={(date) => setSelectedDate(date)}
              onMonthChange={(month) => {
                setSelectedDate("");
                setCurrentMonth(month);
                setTimelineMonth(month);
              }}
              onOpenDayBooking={(date) => setSelectedDate(date)}
            />

            <HomeSidebar
              selectedDate={selectedDate}
              events={allEvents}
              activeMonth={timelineMonth}
              currentAllowedMonth={currentAllowedMonth}
              nextAllowedMonth={nextAllowedMonth}
              onChangeTimelineMonth={(month) => {
                setSelectedDate("");
                setTimelineMonth(month);
                setCurrentMonth(month);
              }}
              onQuickBooking={() => setSelectedDate(todayIso)}
              hideQuickBooking
              eyebrow="Serviços"
              title="Todos os agendamentos"
            />
          </div>
        </div>

        <div className="admin-bottom-tabs">
          <button type="button" className="admin-bottom-tabs__button" onClick={() => setActiveSheet("history")}>Histórico</button>
          <button type="button" className="admin-bottom-tabs__button" onClick={() => setActiveSheet("statement")}>Extrato</button>
        </div>

        {activeSheet ? (
          <div className="booking-detail-modal" role="dialog" aria-modal="true">
            <button type="button" className="booking-detail-modal__backdrop" onClick={() => setActiveSheet(null)} aria-label="Fechar" />
            <div className="booking-detail-modal__card admin-sheet-card">
              <div className="booking-detail-modal__header">
                <div>
                  <span className="booking-preview-modal__eyebrow">Admin</span>
                  <h3 className="booking-preview-modal__title">{activeSheet === "history" ? "Histórico" : "Extrato"}</h3>
                </div>
                <button type="button" className="booking-preview-modal__close" onClick={() => setActiveSheet(null)}>×</button>
              </div>
              <div className="booking-detail-modal__body admin-sheet-card__body">
                {activeSheet === "history" ? (
                  historyEvents.length > 0 ? historyEvents.map((event) => (
                    <div key={event.id} className="admin-sheet-card__row">
                      <strong>{event.customerName ?? event.title}</strong>
                      <span>{event.date} · {event.startTime}</span>
                    </div>
                  )) : <div className="admin-sheet-card__empty">Sem histórico local disponível.</div>
                ) : (
                  <div className="admin-sheet-card__statement">
                    <div className="admin-sheet-card__row"><strong>Recebido</strong><span>R$ 0,00</span></div>
                    <div className="admin-sheet-card__row"><strong>Pendente</strong><span>R$ 0,00</span></div>
                    <div className="admin-sheet-card__row"><strong>Saúde</strong><span>Dummy/Local</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </AppShell>
  );
}
