import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import HistorySheet from "../../features/history/components/HistorySheet";
import StatementSheet from "../../features/finance/components/StatementSheet";
import HomeSidebar from "../../features/home/components/HomeSidebar";
import HomeCalendarSection from "../../features/home/components/HomeCalendarSection";
import HomeMobilePlanner from "../../features/home/components/HomeMobilePlanner";
import HomeMobileBookingsSheet from "../../features/home/components/HomeMobileBookingsSheet";
import HomeMobileBookingDetailsModal from "../../features/home/components/HomeMobileBookingDetailsModal";
import BookingFormModal from "../../features/booking-form/components/BookingFormModal";
import type { CalendarEvent } from "../../features/calendar/types";
import type { HomeSelectedSlot } from "../../features/home/types";
import type { ServicoResponse } from "../../types/api";
import "../../app/home-layout.css";
import "../../app/booking-sidebar.css";
import "../../app/calendar-final-pass.css";
import "../../app/home-mobile-dock.css";
import "../../app/home-mobile-sheet.css";
import "../../app/home-mobile-planner.css";
import "../../app/calendar-mobile-compact.css";
import "../../app/admin-dashboard.css";
import { getLocalCalendarEvents } from "../../lib/storage";

const ADMIN_TOKEN_KEY = "calendar.adminToken";
const ADMIN_BLOCKED_DAYS_KEY = "calendar.adminBlockedDays.v1";
const ADMIN_BLOCKED_SLOTS_KEY = "calendar.adminBlockedSlots.v1";
const ADMIN_SCALE_UNLOCKS_KEY = "calendar.adminScaleUnlocks.v1";
const ADMIN_CANCELLED_DAYS_KEY = "calendar.adminCancelledDays.v1";
const AVAILABLE_SLOTS = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

function getSavedAdminToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ADMIN_TOKEN_KEY) ?? "";
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

function readStringArray(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStringArray(key: string, values: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(Array.from(new Set(values)).sort()));
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

function getMonthDays(monthStart: string) {
  const reference = toLocalDate(monthStart);
  const firstDay = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const gridStart = new Date(reference.getFullYear(), reference.getMonth(), 1 - firstDay.getDay());
  return Array.from({ length: 35 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return { date: toIsoDate(date), isCurrentMonth: date.getMonth() === reference.getMonth() };
  });
}

function isSelectedOnlyBlocked(selectedDates: string[], blockedDates: string[]) {
  return selectedDates.length > 0 && selectedDates.every((date) => blockedDates.includes(date));
}

type AdminBlockModalProps = {
  open: boolean;
  currentMonth: string;
  events: CalendarEvent[];
  manualBlockedDates: string[];
  scaleBlockedDates: string[];
  unlockedScaleDates: string[];
  blockedSlots: string[];
  onClose: () => void;
  onApplyBlock: (dates: string[], slots: string[], shouldCancel: boolean) => void;
  onCancelServices: (dates: string[]) => void;
  onUnblock: (dates: string[], slots: string[]) => void;
};

function AdminBlockModal({
  open,
  currentMonth,
  events,
  manualBlockedDates,
  scaleBlockedDates,
  unlockedScaleDates,
  blockedSlots,
  onClose,
  onApplyBlock,
  onCancelServices,
  onUnblock,
}: AdminBlockModalProps) {
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [confirmText, setConfirmText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const days = useMemo(() => getMonthDays(currentMonth), [currentMonth]);
  const blockedDates = useMemo(() => {
    const scale = scaleBlockedDates.filter((date) => !unlockedScaleDates.includes(date));
    return Array.from(new Set([...manualBlockedDates, ...scale])).sort();
  }, [manualBlockedDates, scaleBlockedDates, unlockedScaleDates]);
  const selectedEvents = events.filter((event) => selectedDates.includes(event.date));
  const selectedHasEvents = selectedEvents.length > 0;
  const onlyBlocked = isSelectedOnlyBlocked(selectedDates, blockedDates);
  const needsCancellationConfirm = selectedHasEvents && !onlyBlocked;
  const canSubmit = selectedDates.length > 0 && (!needsCancellationConfirm || confirmText.trim() === "CANCELAR SERVIÇOS");

  if (!open) return null;

  const toggleDate = (date: string) => {
    setSelectedDates((current) => current.includes(date) ? current.filter((item) => item !== date) : [...current, date].sort());
  };

  const addDragDate = (date: string) => {
    setSelectedDates((current) => current.includes(date) ? current : [...current, date].sort());
  };

  const handleMainAction = () => {
    if (!canSubmit) return;
    if (onlyBlocked) {
      onUnblock(selectedDates, selectedSlots);
    } else {
      onApplyBlock(selectedDates, selectedSlots, selectedHasEvents);
    }
    setSelectedDates([]);
    setSelectedSlots([]);
    setConfirmText("");
  };

  const handleCancelServices = () => {
    if (!selectedDates.length) return;
    if (selectedHasEvents && confirmText.trim() !== "CANCELAR SERVIÇOS") return;
    onCancelServices(selectedDates);
    setSelectedDates([]);
    setConfirmText("");
  };

  return (
    <div className="admin-block-modal" role="dialog" aria-modal="true" onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)}>
      <button className="admin-block-modal__backdrop" type="button" aria-label="Fechar" onClick={onClose} />
      <section className="admin-block-modal__card">
        <header className="admin-block-modal__header">
          <div>
            <span className="admin-block-modal__eyebrow">Gerenciar agenda</span>
            <h3>Bloqueios e cancelamentos</h3>
          </div>
          <button type="button" className="admin-tool-page__back" onClick={onClose} aria-label="Voltar"><BackIcon /><span>Voltar</span></button>
        </header>

        <div className="admin-block-modal__legend">
          <span><i className="legend-dot legend-dot--booked" /> com agendamentos</span>
          <span><i className="legend-dot legend-dot--blocked" /> bloqueado</span>
          <span><i className="legend-dot legend-dot--scale" /> escala 4x4</span>
          <span><i className="legend-dot legend-dot--selected" /> selecionado</span>
        </div>

        <div className="admin-block-modal__content">
          <div className="admin-block-calendar">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => <strong key={day}>{day}</strong>)}
            {days.map((day) => {
              const hasEvents = events.some((event) => event.date === day.date);
              const scaleBlocked = scaleBlockedDates.includes(day.date) && !unlockedScaleDates.includes(day.date);
              const blocked = manualBlockedDates.includes(day.date) || scaleBlocked;
              const selected = selectedDates.includes(day.date);
              return (
                <button
                  key={day.date}
                  type="button"
                  className={[
                    "admin-block-calendar__day",
                    !day.isCurrentMonth ? "admin-block-calendar__day--outside" : "",
                    hasEvents ? "admin-block-calendar__day--booked" : "",
                    blocked ? "admin-block-calendar__day--blocked" : "",
                    scaleBlocked ? "admin-block-calendar__day--scale" : "",
                    selected ? "admin-block-calendar__day--selected" : "",
                  ].filter(Boolean).join(" ")}
                  onMouseDown={() => { setIsDragging(true); toggleDate(day.date); }}
                  onMouseEnter={() => { if (isDragging) addDragDate(day.date); }}
                  onClick={() => undefined}
                >
                  <span>{Number(day.date.slice(8, 10))}</span>
                  {hasEvents ? <i aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>

          <aside className="admin-block-modal__side">
            <div className="admin-block-modal__selected-days">
              <strong>Dias selecionados</strong>
              <div>
                {selectedDates.length ? selectedDates.map((date) => <span key={date}>{date.slice(8, 10)}/{date.slice(5, 7)}</span>) : <small>Nenhum dia selecionado.</small>}
              </div>
            </div>

            <div className="admin-block-modal__slots">
              <strong>Horários específicos</strong>
              <p>Sem seleção, a ação vale para o dia inteiro.</p>
              <div className="admin-block-modal__slots-scroll">
                {selectedDates.map((date) => (
                  <div className="admin-block-modal__day-slots" key={date}>
                    <span>{date.slice(8, 10)}/{date.slice(5, 7)}</span>
                    <div>
                      {AVAILABLE_SLOTS.map((slot) => {
                        const key = `${date}|${slot}`;
                        const isBlocked = blockedSlots.includes(key);
                        const selected = selectedSlots.includes(key);
                        return (
                          <button
                            type="button"
                            key={key}
                            className={["admin-slot-chip", isBlocked ? "admin-slot-chip--blocked" : "", selected ? "admin-slot-chip--selected" : ""].filter(Boolean).join(" ")}
                            onClick={() => setSelectedSlots((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {needsCancellationConfirm ? (
          <label className="admin-block-modal__confirm">
            <span>Há serviços nos dias selecionados. Para bloquear/cancelar, escreva <strong>CANCELAR SERVIÇOS</strong>.</span>
            <input value={confirmText} onChange={(event) => setConfirmText(event.target.value)} placeholder="CANCELAR SERVIÇOS" />
          </label>
        ) : null}

        <footer className="admin-block-modal__actions">
          <button type="button" className="secondary-action" onClick={onClose}>Fechar</button>
          <button type="button" className="admin-action admin-action--danger" disabled={!selectedDates.length || (selectedHasEvents && confirmText.trim() !== "CANCELAR SERVIÇOS")} onClick={handleCancelServices}>Cancelar serviços</button>
          <button type="button" className={onlyBlocked ? "admin-action admin-action--unlock" : "admin-action"} disabled={!canSubmit} onClick={handleMainAction}>{onlyBlocked ? "Desbloquear" : "Bloquear serviços"}</button>
        </footer>
      </section>
    </div>
  );
}

type AdminActionsMenuProps = {
  open: boolean;
  onClose: () => void;
  onOpenHistory: () => void;
  onOpenStatement: () => void;
  onOpenBlocks: () => void;
  onOpenBlockedDetails: () => void;
  onOpenFinancePage: () => void;
};

function AdminActionsMenu({
  open,
  onClose,
  onOpenHistory,
  onOpenStatement,
  onOpenBlocks,
  onOpenBlockedDetails,
  onOpenFinancePage,
}: AdminActionsMenuProps) {
  if (!open) return null;

  return (
    <div className="admin-actions-menu" role="dialog" aria-modal="false">
      <button type="button" className="admin-actions-menu__backdrop" aria-label="Fechar ações" onClick={onClose} />
      <section className="admin-actions-menu__card" aria-label="Ações administrativas">
        <button type="button" className="admin-actions-menu__item admin-actions-menu__item--history" onClick={onOpenHistory}><HistoryIcon /><span>Histórico</span></button>
        <button type="button" className="admin-actions-menu__item admin-actions-menu__item--statement" onClick={onOpenStatement}><StatementIcon /><span>Extrato</span></button>
        <button type="button" className="admin-actions-menu__item admin-actions-menu__item--blocks" onClick={onOpenBlocks}><LockIcon /><span>Bloqueios</span></button>
        <button type="button" className="admin-actions-menu__item admin-actions-menu__item--details" onClick={onOpenBlockedDetails}><LockIcon /><span>Bloqueios detalhados</span></button>
        <button type="button" className="admin-actions-menu__item admin-actions-menu__item--finance" onClick={onOpenFinancePage}><HistoryIcon /><span>Histórico / Extrato</span></button>
      </section>
    </div>
  );
}

type AdminProfileModalProps = {
  open: boolean;
  blockedDates: string[];
  blockedSlots: string[];
  historyEvents: CalendarEvent[];
  onClose: () => void;
  onOpenBlocks: () => void;
  onOpenFinance: () => void;
  onUnblockDay: (date: string) => void;
  onUnblockSlot: (slotKey: string) => void;
};

function AdminProfileModal({ open, onClose, onOpenBlocks, onOpenFinance }: AdminProfileModalProps) {
  if (!open) return null;

  return (
    <div className="admin-profile-modal" role="dialog" aria-modal="true">
      <button type="button" className="admin-profile-modal__backdrop" aria-label="Fechar" onClick={onClose} />
      <section className="admin-profile-modal__card">
        <header className="admin-profile-modal__header">
          <div className="admin-profile-modal__avatar">
            <ProfileIcon />
            <button type="button" aria-label="Editar perfil"><EditIcon /></button>
          </div>
          <div>
            <span>Admin</span>
            <h3>Painel do administrador</h3>
          </div>
          <button className="booking-preview-modal__close" type="button" onClick={onClose}>×</button>
        </header>

        <div className="admin-profile-modal__actions">
          <button type="button" onClick={onOpenBlocks}><LockIcon /> Bloqueios detalhados</button>
          <button type="button" onClick={onOpenFinance}><HistoryIcon /> Histórico / Extrato</button>
        </div>
      </section>
    </div>
  );
}

type AdminPageHeaderProps = {
  title: string;
  eyebrow: string;
  onBack: () => void;
};

function AdminPageHeader({ title, eyebrow, onBack }: AdminPageHeaderProps) {
  return (
    <header className="admin-tool-page__header">
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <button type="button" className="admin-tool-page__back" onClick={onBack} aria-label="Voltar">
        <BackIcon />
        <span>Voltar</span>
      </button>
    </header>
  );
}

type AdminBlockedDetailsPageProps = {
  blockedDates: string[];
  scaleBlockedDates: string[];
  unlockedScaleDates: string[];
  blockedSlots: string[];
  onBack: () => void;
  onUnblockDay: (date: string) => void;
  onUnblockSlot: (slotKey: string) => void;
};

function AdminBlockedDetailsPage({
  blockedDates,
  scaleBlockedDates,
  unlockedScaleDates,
  blockedSlots,
  onBack,
  onUnblockDay,
  onUnblockSlot,
}: AdminBlockedDetailsPageProps) {
  const [selectedBlockedDates, setSelectedBlockedDates] = useState<string[]>([]);
  const [selectedBlockedSlots, setSelectedBlockedSlots] = useState<string[]>([]);
  const scaleLockedDates = scaleBlockedDates.filter((date) => !unlockedScaleDates.includes(date));
  const allBlockedDates = Array.from(new Set([...blockedDates, ...scaleLockedDates])).sort();
  const hasSelection = selectedBlockedDates.length > 0 || selectedBlockedSlots.length > 0;

  const toggleSelectedDate = (date: string) => {
    setSelectedBlockedDates((current) => current.includes(date) ? current.filter((item) => item !== date) : [...current, date].sort());
  };

  const toggleSelectedSlot = (slot: string) => {
    setSelectedBlockedSlots((current) => current.includes(slot) ? current.filter((item) => item !== slot) : [...current, slot].sort());
  };

  const handleUnlockSelected = () => {
    selectedBlockedDates.forEach(onUnblockDay);
    selectedBlockedSlots.forEach(onUnblockSlot);
    setSelectedBlockedDates([]);
    setSelectedBlockedSlots([]);
  };

  return (
    <section className="admin-tool-page admin-tool-page--details">
      <AdminPageHeader eyebrow="Admin" title="Bloqueios detalhados" onBack={onBack} />
      <div className="admin-tool-page__bulkbar">
        <span>{hasSelection ? `${selectedBlockedDates.length + selectedBlockedSlots.length} item(ns) selecionado(s)` : 'Selecione dias ou horários para liberar.'}</span>
        <button type="button" disabled={!hasSelection} onClick={handleUnlockSelected}>Desbloquear selecionados</button>
      </div>
      <div className="admin-tool-page__content admin-tool-page__content--two-columns admin-tool-page__content--blocked-details">
        <section className="admin-tool-card">
          <h3>Dias bloqueados</h3>
          <p>Dias manuais e dias indisponíveis pela escala 4x4. Dias da escala também podem ser liberados.</p>
          <div className="admin-tool-list admin-tool-list--single-column">
            {allBlockedDates.length ? allBlockedDates.map((date) => {
              const isScale = scaleLockedDates.includes(date);
              const selected = selectedBlockedDates.includes(date);
              return (
                <button key={date} type="button" className={["admin-tool-list__row", "admin-tool-list__row--selectable", selected ? "is-selected" : ""].filter(Boolean).join(" ")} onClick={() => toggleSelectedDate(date)}>
                  <span>{date.slice(8, 10)}/{date.slice(5, 7)}<small>{isScale ? 'Escala 4x4' : 'Bloqueio manual'}</small></span>
                  <strong>{selected ? 'Selecionado' : 'Selecionar'}</strong>
                </button>
              );
            }) : <small>Sem dias bloqueados.</small>}
          </div>
        </section>

        <section className="admin-tool-card">
          <h3>Horários bloqueados</h3>
          <p>Horários específicos bloqueados sem bloquear o dia inteiro.</p>
          <div className="admin-tool-list admin-tool-list--single-column">
            {blockedSlots.length ? blockedSlots.map((slot) => {
              const selected = selectedBlockedSlots.includes(slot);
              return (
                <button key={slot} type="button" className={["admin-tool-list__row", "admin-tool-list__row--selectable", selected ? "is-selected" : ""].filter(Boolean).join(" ")} onClick={() => toggleSelectedSlot(slot)}>
                  <span>{slot.replace('|', ' · ')}</span>
                  <strong>{selected ? 'Selecionado' : 'Selecionar'}</strong>
                </button>
              );
            }) : <small>Sem horários específicos bloqueados.</small>}
          </div>
        </section>
      </div>
    </section>
  );
}

type AdminFinanceHistoryPageProps = {
  historyEvents: CalendarEvent[];
  bookings: ServicoResponse[];
  onBack: () => void;
};

function AdminFinanceHistoryPage({ historyEvents, bookings, onBack }: AdminFinanceHistoryPageProps) {
  const lastMonths = useMemo(() => {
    const now = new Date();
    return [0, -1, -2].map((delta) => {
      const date = new Date(now.getFullYear(), now.getMonth() + delta, 1);
      return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
    });
  }, []);

  return (
    <section className="admin-tool-page admin-tool-page--finance">
      <AdminPageHeader eyebrow="Admin" title="Histórico e extrato" onBack={onBack} />
      <div className="admin-tool-page__filters">
        <select aria-label="Mês disponível">
          {lastMonths.map((month) => <option key={month}>{month}</option>)}
        </select>
        <input placeholder="Filtrar por nome, cidade, data ou valor" />
      </div>
      <div className="admin-tool-page__content admin-tool-page__content--two-columns">
        <section className="admin-tool-card">
          <h3>Histórico</h3>
          <div className="admin-tool-list">
            {historyEvents.length ? historyEvents.slice(0, 12).map((event) => (
              <div key={event.id} className="admin-tool-list__row admin-tool-list__row--stacked">
                <span>{event.customerName ?? event.title}<small>{event.date} · {event.startTime} · {event.city}</small></span>
              </div>
            )) : <small>Sem histórico nos últimos meses disponíveis.</small>}
          </div>
        </section>

        <section className="admin-tool-card">
          <h3>Extrato</h3>
          <div className="admin-tool-list">
            <div className="admin-tool-list__row"><span>Total de agendamentos</span><strong>{bookings.length}</strong></div>
            <div className="admin-tool-list__row"><span>Recebido</span><strong>R$ 0,00</strong></div>
            <div className="admin-tool-list__row"><span>Pendente</span><strong>R$ 0,00</strong></div>
            <div className="admin-tool-list__row"><span>Janela disponível</span><strong>Atual + 2 meses anteriores</strong></div>
          </div>
        </section>
      </div>
    </section>
  );
}

function BackIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>; }
function CalendarIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /></svg>; }
function HistoryIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.35-5.65L4 8.7M4 4v4.7h4.7M12 8v5l3 2" /></svg>; }
function StatementIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 0 1 2-2Zm2 6h6M9 13h6" /></svg>; }
function LockIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6V10Zm6 4v3" /></svg>; }
function ProfileIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" /></svg>; }
function EditIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Zm11-13 3 3" /></svg>; }

function splitCustomerName(value?: string) {
  const parts = (value ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "Cliente", lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function calendarEventToServicoResponse(event: CalendarEvent): ServicoResponse {
  const customer = splitCustomerName(event.customerName ?? event.title);
  const address = event.customerAddress ?? event.city ?? "Endereço não informado";

  return {
    eventId: event.id,
    eventLink: "",
    serviceType: event.serviceLabel ?? event.title ?? "Serviço",
    start: `${event.date}T${event.startTime}:00`,
    end: `${event.date}T${event.endTime}:00`,
    clientFirstName: customer.firstName,
    clientLastName: customer.lastName,
    clientEmail: event.customerEmail ?? "",
    clientPhone: event.customerPhone ?? "",
    clientCep: "",
    clientStreet: address,
    clientNeighborhood: "",
    clientNumber: "",
    clientComplement: "",
    clientCity: event.city ?? "",
    clientState: "MG",
    clientAddressLine: address,
    status: event.status ?? "booked",
  };
}

export default function AdminDashboardPage() {
  const token = getSavedAdminToken();
  const todayIso = toIsoDate(new Date());
  const currentAllowedMonth = `${todayIso.slice(0, 7)}-01`;
  const nextAllowedMonth = shiftMonth(currentAllowedMonth, 1);
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [selectedSlot, setSelectedSlot] = useState<HomeSelectedSlot>(null);
  const [viewportWidth, setViewportWidth] = useState(() => typeof window === "undefined" ? 1024 : window.innerWidth);
  const [currentMonth, setCurrentMonth] = useState(currentAllowedMonth);
  const [timelineMonth, setTimelineMonth] = useState(currentAllowedMonth);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isBlocksOpen, setIsBlocksOpen] = useState(false);
  const [isBlockedDetailsOpen, setIsBlockedDetailsOpen] = useState(false);
  const [isFinanceHistoryOpen, setIsFinanceHistoryOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isMobileBookingsOpen, setIsMobileBookingsOpen] = useState(false);
  const [selectedMobileBooking, setSelectedMobileBooking] = useState<CalendarEvent | null>(null);
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>(() => getLocalCalendarEvents().filter((event) => event.date >= todayIso));
  const [manualBlockedDates, setManualBlockedDates] = useState<string[]>(() => readStringArray(ADMIN_BLOCKED_DAYS_KEY));
  const [blockedSlots, setBlockedSlots] = useState<string[]>(() => readStringArray(ADMIN_BLOCKED_SLOTS_KEY));
  const [unlockedScaleDates, setUnlockedScaleDates] = useState<string[]>(() => readStringArray(ADMIN_SCALE_UNLOCKS_KEY));
  const [cancelledDays, setCancelledDays] = useState<string[]>(() => readStringArray(ADMIN_CANCELLED_DAYS_KEY));

  const isDesktop = viewportWidth > 730;

  const scaleBlockedDates = useMemo(
    () => [...build4x4UnavailableDates(currentAllowedMonth, currentAllowedMonth), ...build4x4UnavailableDates(nextAllowedMonth, currentAllowedMonth)],
    [currentAllowedMonth, nextAllowedMonth],
  );

  const unavailableDates = useMemo(() => {
    const scale = scaleBlockedDates.filter((date) => !unlockedScaleDates.includes(date));
    return Array.from(new Set([...scale, ...manualBlockedDates])).sort();
  }, [manualBlockedDates, scaleBlockedDates, unlockedScaleDates]);

  const allEvents = useMemo(() => {
    const locals = localEvents.filter((event) => event.date >= todayIso && !cancelledDays.includes(event.date));
    const demo = [...buildMonthMockEvents(currentAllowedMonth), ...buildMonthMockEvents(nextAllowedMonth)]
      .filter((event) => event.date >= todayIso && !cancelledDays.includes(event.date));
    return mergeEvents(demo, locals);
  }, [cancelledDays, currentAllowedMonth, nextAllowedMonth, todayIso, localEvents]);

  const historyEvents = useMemo(
    () => getLocalCalendarEvents().filter((event) => event.date < todayIso).sort((a, b) => b.date.localeCompare(a.date)),
    [todayIso],
  );

  const sheetBookings = useMemo(() => allEvents.map(calendarEventToServicoResponse), [allEvents]);

  const sheetHistoryBookings = useMemo(
    () => historyEvents.map(calendarEventToServicoResponse),
    [historyEvents],
  );

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.classList.add("home-scroll-locked");
    body.classList.add("home-scroll-locked");

    return () => {
      html.classList.remove("home-scroll-locked");
      body.classList.remove("home-scroll-locked");
    };
  }, []);

  useEffect(() => {
    const openBooking = () => setIsBookingOpen(true);
    const openProfile = () => { setIsActionsOpen(false); setIsProfileOpen(true); };
    const openActions = () => { setIsProfileOpen(false); setIsActionsOpen(true); };
    const focusBookings = () => {
      if (window.innerWidth <= 730) {
        setIsMobileBookingsOpen((current) => !current);
        return;
      }
      document.querySelector<HTMLElement>(".home-sidebar")?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "end" });
    };

    window.addEventListener("admin:open-booking", openBooking);
    window.addEventListener("admin:open-profile", openProfile);
    window.addEventListener("admin:open-actions", openActions);
    window.addEventListener("admin:focus-bookings", focusBookings);

    return () => {
      window.removeEventListener("admin:open-booking", openBooking);
      window.removeEventListener("admin:open-profile", openProfile);
      window.removeEventListener("admin:open-actions", openActions);
      window.removeEventListener("admin:focus-bookings", focusBookings);
    };
  }, []);

  if (!token) {
    return <Navigate to="/admin" replace />;
  }

  const setAndSave = (key: string, setter: (value: string[]) => void, values: string[]) => {
    const unique = Array.from(new Set(values)).sort();
    setter(unique);
    saveStringArray(key, unique);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setTimelineMonth(toMonthStart(date));
  };

  const handleApplyBlock = (dates: string[], slots: string[], shouldCancel: boolean) => {
    const dateBlocks = slots.length ? manualBlockedDates : [...manualBlockedDates, ...dates];
    setAndSave(ADMIN_BLOCKED_DAYS_KEY, setManualBlockedDates, dateBlocks);
    setAndSave(ADMIN_BLOCKED_SLOTS_KEY, setBlockedSlots, [...blockedSlots, ...slots]);
    if (shouldCancel) handleCancelServices(dates);
  };

  const handleCancelServices = (dates: string[]) => {
    setAndSave(ADMIN_CANCELLED_DAYS_KEY, setCancelledDays, [...cancelledDays, ...dates]);
  };

  const handleUnblock = (dates: string[], slots: string[]) => {
    setAndSave(ADMIN_BLOCKED_DAYS_KEY, setManualBlockedDates, manualBlockedDates.filter((date) => !dates.includes(date)));
    setAndSave(ADMIN_BLOCKED_SLOTS_KEY, setBlockedSlots, blockedSlots.filter((slot) => !slots.includes(slot) && !dates.some((date) => slot.startsWith(`${date}|`))));
    const scaleDates = dates.filter((date) => scaleBlockedDates.includes(date));
    if (scaleDates.length) setAndSave(ADMIN_SCALE_UNLOCKS_KEY, setUnlockedScaleDates, [...unlockedScaleDates, ...scaleDates]);
  };

  const handleBookingCreated = (event: CalendarEvent) => {
    setLocalEvents((current) => mergeEvents(current, [event]));
    setTimelineMonth(toMonthStart(event.date));
    setSelectedDate(event.date);
  };

  return (
    <div className="admin-dashboard-root">
      <div className="home-page home-page--admin home-page--sidebar-layout">
        <div className={["home-grid", isDesktop ? "home-grid--desktop home-grid--sidebar-open" : "home-grid--mobile"].join(" ")}>
          <div className="home-calendar-stack home-calendar-stack--shell">
            {isDesktop ? (
              <HomeCalendarSection
                selectedDate={selectedDate}
                currentMonth={currentMonth}
                currentAllowedMonth={currentAllowedMonth}
                nextAllowedMonth={nextAllowedMonth}
                events={allEvents}
                unavailableDates={unavailableDates}
                onDateSelect={(date) => handleDateSelect(date)}
                onMonthChange={(month) => { setSelectedDate(""); setCurrentMonth(month); setTimelineMonth(month); }}
                showMonthPreview
              />
            ) : (
              <HomeMobilePlanner
                selectedDate={selectedDate}
                currentMonth={currentMonth}
                currentAllowedMonth={currentAllowedMonth}
                nextAllowedMonth={nextAllowedMonth}
                events={allEvents}
                unavailableDates={unavailableDates}
                onDateSelect={(date) => handleDateSelect(date)}
                onMonthChange={(month) => { setSelectedDate(""); setCurrentMonth(month); setTimelineMonth(month); }}
                onEventSelect={setSelectedMobileBooking}
                agendaFocusRequestId={0}
              />
            )}
          </div>

          {isDesktop ? (
            <div className="home-sidebar-anchor">
              <HomeSidebar
                selectedDate={selectedDate}
                events={allEvents}
                activeMonth={timelineMonth}
                currentAllowedMonth={currentAllowedMonth}
                nextAllowedMonth={nextAllowedMonth}
                onChangeTimelineMonth={(month) => { setSelectedDate(""); setTimelineMonth(month); setCurrentMonth(month); }}
                onQuickBooking={() => undefined}
                onToggleExpanded={() => undefined}
                onSelectRailDate={(date) => handleDateSelect(date)}
                isExpanded
                isDesktop
                isAdminMode
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="admin-dashboard-actions" aria-label="Ações rápidas do admin">
        <button type="button" className={["admin-dashboard-actions__button", "admin-dashboard-actions__button--history", historyOpen ? "is-active" : ""].filter(Boolean).join(" ")} onClick={() => { setIsBlocksOpen(false); setIsBlockedDetailsOpen(false); setIsFinanceHistoryOpen(false); setStatementOpen(false); setHistoryOpen((current) => !current); }}><HistoryIcon /><span>Histórico</span></button>
        <button type="button" className={["admin-dashboard-actions__button", "admin-dashboard-actions__button--blocks", isBlocksOpen ? "is-active" : ""].filter(Boolean).join(" ")} onClick={() => { setHistoryOpen(false); setStatementOpen(false); setIsFinanceHistoryOpen(false); setIsBlockedDetailsOpen(false); setIsBlocksOpen(true); }}><LockIcon /><span>Bloqueios</span></button>
        <button type="button" className={["admin-dashboard-actions__button", "admin-dashboard-actions__button--statement", statementOpen ? "is-active" : ""].filter(Boolean).join(" ")} onClick={() => { setIsBlocksOpen(false); setIsBlockedDetailsOpen(false); setIsFinanceHistoryOpen(false); setHistoryOpen(false); setStatementOpen((current) => !current); }}><StatementIcon /><span>Extrato</span></button>
      </div>

        <nav className="admin-mobile-bottom-bar" aria-label="Ações do admin">
          <button type="button" className={["admin-mobile-bottom-bar__item", "admin-mobile-bottom-bar__item--agenda", isMobileBookingsOpen && !isBlocksOpen && !isBlockedDetailsOpen && !isFinanceHistoryOpen ? "admin-mobile-bottom-bar__item--active" : ""].filter(Boolean).join(" ")} onClick={() => { setIsActionsOpen(false); setIsBlocksOpen(false); setIsBlockedDetailsOpen(false); setIsFinanceHistoryOpen(false); setHistoryOpen(false); setStatementOpen(false); setIsMobileBookingsOpen((current) => !current); }}><CalendarIcon /><span>Agenda</span></button>
          <button type="button" className={["admin-mobile-bottom-bar__item", "admin-mobile-bottom-bar__item--history", historyOpen ? "admin-mobile-bottom-bar__item--active" : ""].filter(Boolean).join(" ")} onClick={() => { setIsActionsOpen(false); setIsMobileBookingsOpen(false); setIsBlocksOpen(false); setIsBlockedDetailsOpen(false); setIsFinanceHistoryOpen(false); setStatementOpen(false); setHistoryOpen((current) => !current); }}><HistoryIcon /><span>Histórico</span></button>
          <button type="button" className={["admin-mobile-bottom-bar__item", "admin-mobile-bottom-bar__center", "admin-mobile-bottom-bar__item--blocks", isBlocksOpen ? "admin-mobile-bottom-bar__item--active" : ""].filter(Boolean).join(" ")} onClick={() => { setIsActionsOpen(false); setIsMobileBookingsOpen(false); setHistoryOpen(false); setStatementOpen(false); setIsFinanceHistoryOpen(false); setIsBlockedDetailsOpen(false); setIsBlocksOpen(true); }}><LockIcon /><span>Bloqueios</span></button>
          <button type="button" className={["admin-mobile-bottom-bar__item", "admin-mobile-bottom-bar__item--statement", statementOpen ? "admin-mobile-bottom-bar__item--active" : ""].filter(Boolean).join(" ")} onClick={() => { setIsActionsOpen(false); setIsMobileBookingsOpen(false); setIsBlocksOpen(false); setIsBlockedDetailsOpen(false); setIsFinanceHistoryOpen(false); setHistoryOpen(false); setStatementOpen((current) => !current); }}><StatementIcon /><span>Extrato</span></button>
          <button type="button" className={["admin-mobile-bottom-bar__item", "admin-mobile-bottom-bar__item--profile", isProfileOpen ? "admin-mobile-bottom-bar__item--active" : ""].filter(Boolean).join(" ")} onClick={() => { setIsActionsOpen(false); setIsMobileBookingsOpen(false); setIsProfileOpen(true); }}><ProfileIcon /><span>Perfil</span></button>
        </nav>

        <HomeMobileBookingsSheet
          open={isMobileBookingsOpen}
          selectedDate={selectedDate}
          events={allEvents}
          activeMonth={timelineMonth}
          currentAllowedMonth={currentAllowedMonth}
          nextAllowedMonth={nextAllowedMonth}
          onClose={() => setIsMobileBookingsOpen(false)}
          onChangeTimelineMonth={(month) => { setSelectedDate(""); setTimelineMonth(month); setCurrentMonth(month); }}
          isAdminMode
        />

        <HomeMobileBookingDetailsModal
          open={Boolean(selectedMobileBooking)}
          event={selectedMobileBooking}
          onClose={() => setSelectedMobileBooking(null)}
        />

        <BookingFormModal
          open={isBookingOpen}
          selectedDate={selectedDate || todayIso}
          selectedSlot={selectedSlot}
          events={allEvents}
          unavailableDates={unavailableDates}
          onClose={() => setIsBookingOpen(false)}
          onBookingCreated={handleBookingCreated}
        />

        <AdminBlockModal
          open={isBlocksOpen}
          currentMonth={currentMonth}
          events={allEvents}
          manualBlockedDates={manualBlockedDates}
          scaleBlockedDates={scaleBlockedDates}
          unlockedScaleDates={unlockedScaleDates}
          blockedSlots={blockedSlots}
          onClose={() => setIsBlocksOpen(false)}
          onApplyBlock={handleApplyBlock}
          onCancelServices={handleCancelServices}
          onUnblock={handleUnblock}
        />

        {isBlockedDetailsOpen ? (
          <AdminBlockedDetailsPage
            blockedDates={manualBlockedDates}
            scaleBlockedDates={scaleBlockedDates}
            unlockedScaleDates={unlockedScaleDates}
            blockedSlots={blockedSlots}
            onBack={() => setIsBlockedDetailsOpen(false)}
            onUnblockDay={(date) => handleUnblock([date], [])}
            onUnblockSlot={(slot) => handleUnblock([], [slot])}
          />
        ) : null}

        {isFinanceHistoryOpen ? (
          <AdminFinanceHistoryPage
            historyEvents={historyEvents}
            bookings={sheetBookings}
            onBack={() => setIsFinanceHistoryOpen(false)}
          />
        ) : null}


        <AdminActionsMenu
          open={isActionsOpen}
          onClose={() => setIsActionsOpen(false)}
          onOpenHistory={() => { setIsActionsOpen(false); setIsBlocksOpen(false); setIsBlockedDetailsOpen(false); setIsFinanceHistoryOpen(false); setStatementOpen(false); setHistoryOpen(true); }}
          onOpenStatement={() => { setIsActionsOpen(false); setIsBlocksOpen(false); setIsBlockedDetailsOpen(false); setIsFinanceHistoryOpen(false); setHistoryOpen(false); setStatementOpen(true); }}
          onOpenBlocks={() => { setIsActionsOpen(false); setHistoryOpen(false); setStatementOpen(false); setIsFinanceHistoryOpen(false); setIsBlockedDetailsOpen(false); setIsBlocksOpen(true); }}
          onOpenBlockedDetails={() => { setIsActionsOpen(false); setIsBlocksOpen(false); setHistoryOpen(false); setStatementOpen(false); setIsFinanceHistoryOpen(false); setIsBlockedDetailsOpen(true); }}
          onOpenFinancePage={() => { setIsActionsOpen(false); setIsBlocksOpen(false); setHistoryOpen(false); setStatementOpen(false); setIsBlockedDetailsOpen(false); setIsFinanceHistoryOpen(true); }}
        />

        <AdminProfileModal
          open={isProfileOpen}
          blockedDates={manualBlockedDates}
          blockedSlots={blockedSlots}
          historyEvents={historyEvents}
          onClose={() => setIsProfileOpen(false)}
          onOpenBlocks={() => { setIsProfileOpen(false); setIsActionsOpen(false); setIsBlocksOpen(false); setHistoryOpen(false); setStatementOpen(false); setIsFinanceHistoryOpen(false); setIsBlockedDetailsOpen(true); }}
          onOpenFinance={() => { setIsProfileOpen(false); setIsActionsOpen(false); setIsBlocksOpen(false); setIsBlockedDetailsOpen(false); setHistoryOpen(false); setStatementOpen(false); setIsFinanceHistoryOpen(true); }}
          onUnblockDay={(date) => handleUnblock([date], [])}
          onUnblockSlot={(slot) => handleUnblock([], [slot])}
        />

        <HistorySheet
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          bookings={sheetHistoryBookings}
        />

        <StatementSheet
          open={statementOpen}
          onClose={() => setStatementOpen(false)}
          bookings={sheetBookings}
        />
    </div>
  );
}
