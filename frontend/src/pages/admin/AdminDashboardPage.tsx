import { useEffect, useMemo, useState, type WheelEvent } from "react";
import { Navigate } from "react-router-dom";
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
import "../../app/admin-final-fixes.css";
import { getLocalCalendarEvents, getStoredAdminToken } from "../../lib/storage";
import { useAdminBookings } from "../../features/admin/hooks/useAdminBookings";

const ADMIN_BLOCKED_DAYS_KEY = "calendar.adminBlockedDays.v1";
const ADMIN_BLOCKED_SLOTS_KEY = "calendar.adminBlockedSlots.v1";
const ADMIN_SCALE_UNLOCKS_KEY = "calendar.adminScaleUnlocks.v1";
const ADMIN_CANCELLED_DAYS_KEY = "calendar.adminCancelledDays.v1";
const AVAILABLE_SLOTS = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
const ADMIN_DESKTOP_MIN_WIDTH = 731;
const ADMIN_COMPACT_HEIGHT = 560;

type ViewportSize = {
  width: number;
  height: number;
};

function getViewportSize(): ViewportSize {
  if (typeof window === "undefined") return { width: 1024, height: 768 };
  return { width: window.innerWidth, height: window.innerHeight };
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
  allowedMonths: string[];
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
  allowedMonths,
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
  const allowedMonthsKey = allowedMonths.join("|");
  const allowedBlockMonths = useMemo(
    () => allowedMonthsKey ? allowedMonthsKey.split("|") : [currentMonth],
    [allowedMonthsKey, currentMonth],
  );
  const initialBlockMonth = allowedBlockMonths.includes(currentMonth) ? currentMonth : allowedBlockMonths[0];
  const [blockMonth, setBlockMonth] = useState(initialBlockMonth);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [specificHourDates, setSpecificHourDates] = useState<string[]>([]);
  const [activeDate, setActiveDate] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [pendingRiskAction, setPendingRiskAction] = useState<"block" | "cancel" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  useEffect(() => {
    if (!open) return;
    setBlockMonth(allowedBlockMonths.includes(currentMonth) ? currentMonth : allowedBlockMonths[0]);
  }, [allowedBlockMonths, currentMonth, open]);

  const days = useMemo(() => getMonthDays(blockMonth), [blockMonth]);
  const blockMonthLabel = useMemo(() => new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(toLocalDate(blockMonth)).replace(/^./, (letter) => letter.toUpperCase()), [blockMonth]);
  const blockMonthOptions = useMemo(() => allowedBlockMonths.map((month, index) => ({
    value: month,
    label: index === 0 ? "Mês atual" : "Próximo mês",
  })), [allowedBlockMonths]);
  const scaleLockedDates = useMemo(
    () => scaleBlockedDates.filter((date) => !unlockedScaleDates.includes(date)),
    [scaleBlockedDates, unlockedScaleDates],
  );
  const blockedDates = useMemo(
    () => Array.from(new Set([...manualBlockedDates, ...scaleLockedDates])).sort(),
    [manualBlockedDates, scaleLockedDates],
  );
  const partialBlockedDates = useMemo(
    () => Array.from(new Set(blockedSlots.map((slot) => slot.split("|")[0]).filter(Boolean))).sort(),
    [blockedSlots],
  );
  const specificHourDateSet = useMemo(() => new Set(specificHourDates), [specificHourDates]);
  const focusedDate = activeDate && selectedDates.includes(activeDate) ? activeDate : selectedDates[0] ?? "";
  const focusedDateIsSpecific = focusedDate ? specificHourDateSet.has(focusedDate) : false;
  const selectedEvents = useMemo(
    () => events.filter((event) => {
      if (!selectedDates.includes(event.date)) return false;
      if (specificHourDateSet.has(event.date)) {
        return selectedSlots.includes(`${event.date}|${event.startTime}`);
      }
      return true;
    }),
    [events, selectedDates, selectedSlots, specificHourDateSet],
  );
  const selectedHasEvents = selectedEvents.length > 0;
  const onlyBlocked = isSelectedOnlyBlocked(selectedDates, blockedDates);
  const hasSpecificSelectionMissingSlots = selectedDates.some(
    (date) => specificHourDateSet.has(date) && !selectedSlots.some((slot) => slot.startsWith(`${date}|`)),
  );
  const blockActionNeedsConfirm = selectedHasEvents && !onlyBlocked;
  const cancelActionNeedsConfirm = selectedHasEvents;
  const canSubmit = selectedDates.length > 0 && !hasSpecificSelectionMissingSlots;
  const isRiskConfirmValid = confirmText.trim().toUpperCase() === "CANCELAR SERVIÇOS";

  if (!open) return null;

  const formatChipDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

  const formatLongDate = (date: string) => new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  }).format(toLocalDate(date)).replace(".", "");

  const handleSelectedDaysWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.currentTarget.scrollLeft += event.deltaY;
  };

  const toggleDate = (date: string) => {
    setSelectedDates((current) => {
      const removing = current.includes(date);
      const next = removing ? current.filter((item) => item !== date) : [...current, date].sort();

      if (removing) {
        setSelectedSlots((slots) => slots.filter((slot) => !slot.startsWith(`${date}|`)));
        setSpecificHourDates((dates) => dates.filter((item) => item !== date));
        setActiveDate((currentActiveDate) => currentActiveDate === date ? next[0] ?? "" : currentActiveDate);
      } else {
        setActiveDate(date);
      }

      setConfirmText("");
      return next;
    });
  };

  const addDragDate = (date: string) => {
    setSelectedDates((current) => {
      if (current.includes(date)) return current;
      setActiveDate(date);
      setConfirmText("");
      return [...current, date].sort();
    });
  };

  const setFocusedDateMode = (mode: "full-day" | "specific-hours") => {
    if (!focusedDate) return;

    if (mode === "full-day") {
      setSpecificHourDates((current) => current.filter((date) => date !== focusedDate));
      setSelectedSlots((current) => current.filter((slot) => !slot.startsWith(`${focusedDate}|`)));
      return;
    }

    setSpecificHourDates((current) => current.includes(focusedDate) ? current : [...current, focusedDate].sort());
  };

  const toggleSlot = (date: string, slot: string) => {
    const key = `${date}|${slot}`;
    setSpecificHourDates((current) => current.includes(date) ? current : [...current, date].sort());
    setSelectedSlots((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key].sort());
    setConfirmText("");
  };

  const resetBlockSelection = () => {
    setSelectedDates([]);
    setSelectedSlots([]);
    setSpecificHourDates([]);
    setActiveDate("");
    setConfirmText("");
    setPendingRiskAction(null);
  };

  const executeBlockAction = () => {
    if (onlyBlocked) {
      onUnblock(selectedDates, []);
    } else {
      onApplyBlock(selectedDates, selectedSlots, selectedHasEvents);
    }
    resetBlockSelection();
  };

  const executeCancelServices = () => {
    onCancelServices(selectedDates);
    resetBlockSelection();
  };

  const handleMainAction = () => {
    if (!canSubmit) return;
    if (blockActionNeedsConfirm) {
      setConfirmText("");
      setPendingRiskAction("block");
      return;
    }
    executeBlockAction();
  };

  const handleCancelServices = () => {
    if (!selectedDates.length) return;
    if (cancelActionNeedsConfirm) {
      setConfirmText("");
      setPendingRiskAction("cancel");
      return;
    }
    executeCancelServices();
  };

  const handleConfirmRiskAction = () => {
    if (!pendingRiskAction || !isRiskConfirmValid) return;
    if (pendingRiskAction === "cancel") {
      executeCancelServices();
      return;
    }
    executeBlockAction();
  };

  const handleCloseRiskConfirm = () => {
    setPendingRiskAction(null);
    setConfirmText("");
  };

  return (
    <div className="admin-block-modal admin-block-modal--wireframe" role="dialog" aria-modal="true" onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)}>
      <button className="admin-block-modal__backdrop" type="button" aria-label="Fechar" onClick={onClose} />
      <section className="admin-block-modal__card">
        <header className="admin-block-modal__header">
          <div>
            <span className="admin-block-modal__eyebrow">Gerenciar agenda</span>
            <h3>Gerenciar bloqueios</h3>
            <p>Selecione os dias no calendário e configure os horários do dia escolhido.</p>
          </div>
          <button type="button" className="admin-tool-page__back" onClick={onClose} aria-label="Voltar"><BackIcon /><span>Voltar</span></button>
        </header>

        <div className="admin-block-modal__legend" aria-label="Legenda dos bloqueios">
          <span><i className="legend-dot legend-dot--blocked" /> Dia bloqueado</span>
          <span><i className="legend-dot legend-dot--scale" /> Escala 4x4</span>
          <span><i className="legend-dot legend-dot--booked" /> Com agendamentos</span>
        </div>

        <div className="admin-block-modal__content">
          <div className="admin-block-calendar" aria-label="Calendário de bloqueios">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => <strong key={day}>{day}</strong>)}
            {days.map((day) => {
              const hasEvents = events.some((event) => event.date === day.date);
              const scaleBlocked = scaleLockedDates.includes(day.date);
              const fullBlocked = manualBlockedDates.includes(day.date) || scaleBlocked;
              const partialBlocked = partialBlockedDates.includes(day.date) && !fullBlocked;
              const selected = selectedDates.includes(day.date);
              return (
                <button
                  key={day.date}
                  type="button"
                  className={[
                    "admin-block-calendar__day",
                    !day.isCurrentMonth ? "admin-block-calendar__day--outside" : "",
                    hasEvents ? "admin-block-calendar__day--booked" : "",
                    fullBlocked ? "admin-block-calendar__day--blocked" : "",
                    partialBlocked ? "admin-block-calendar__day--partial" : "",
                    scaleBlocked ? "admin-block-calendar__day--scale" : "",
                    selected ? "admin-block-calendar__day--selected" : "",
                  ].filter(Boolean).join(" ")}
                  disabled={!day.isCurrentMonth}
                  onMouseDown={() => { if (!day.isCurrentMonth) return; setIsDragging(true); toggleDate(day.date); }}
                  onMouseEnter={() => { if (isDragging && day.isCurrentMonth) addDragDate(day.date); }}
                  onClick={() => undefined}
                  aria-pressed={selected}
                >
                  <span>{Number(day.date.slice(8, 10))}</span>
                  {fullBlocked ? <small>{scaleBlocked ? '4x4' : 'Dia'}</small> : null}
                  {partialBlocked ? <small>Horas</small> : null}
                  {hasEvents ? <i aria-hidden="true" /> : null}
                </button>
              );
            })}
            <div className="admin-block-calendar__month-nav" aria-label="Navegação de mês dos bloqueios">
              <strong>{blockMonthLabel}</strong>
              <div>
                {blockMonthOptions.map((option) => (
                  <button
                    type="button"
                    key={option.value}
                    className={option.value === blockMonth ? "is-active" : ""}
                    onClick={() => setBlockMonth(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="admin-block-modal__side">
          <section className="admin-block-modal__selected-days">
            <div className="admin-block-modal__section-heading">
              <strong>Dias selecionados</strong>
              <small>{selectedDates.length ? 'Toque em um dia para editar seus horários.' : 'Escolha um ou mais dias no calendário.'}</small>
            </div>
            <div className="admin-block-modal__selected-chip-list" onWheel={handleSelectedDaysWheel}>
              {selectedDates.length ? selectedDates.map((date) => {
                const isActive = date === focusedDate;
                const isFullBlocked = blockedDates.includes(date);
                const isSpecific = specificHourDateSet.has(date);
                const selectedSlotCount = selectedSlots.filter((slot) => slot.startsWith(`${date}|`)).length;
                return (
                  <button
                    type="button"
                    key={date}
                    className={[
                      "admin-block-modal__selected-chip",
                      isSpecific ? "admin-block-modal__selected-chip--partial" : "admin-block-modal__selected-chip--full",
                      isFullBlocked ? "admin-block-modal__selected-chip--locked" : "",
                      isActive ? "is-active" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => setActiveDate(date)}
                  >
                    <CalendarIcon />
                    <span>{formatChipDate(date)}</span>
                    <small>{isFullBlocked ? 'bloqueado' : isSpecific ? `${selectedSlotCount} horário(s)` : 'dia inteiro'}</small>
                  </button>
                );
              }) : <small className="admin-block-modal__empty-copy">Nenhum dia selecionado.</small>}
            </div>
          </section>

          <section className="admin-block-modal__slots">
            <div className="admin-block-modal__section-heading admin-block-modal__section-heading--inline">
              <div>
                <strong>{focusedDate ? `Horários de ${formatChipDate(focusedDate)}` : 'Horários do dia escolhido'}</strong>
                <small>{focusedDate ? formatLongDate(focusedDate) : 'Selecione um dia para ver os horários.'}</small>
              </div>
              {focusedDate && !onlyBlocked ? (
                <div className="admin-block-modal__mode-toggle" aria-label="Tipo de bloqueio do dia escolhido">
                  <button type="button" className={!focusedDateIsSpecific ? 'is-active' : ''} onClick={() => setFocusedDateMode("full-day")}>Dia inteiro</button>
                  <button type="button" className={focusedDateIsSpecific ? 'is-active' : ''} onClick={() => setFocusedDateMode("specific-hours")}>Horários</button>
                </div>
              ) : null}
            </div>

            {focusedDate ? (
              <>
                <p className="admin-block-modal__slots-hint">
                  {onlyBlocked
                    ? 'Este dia já está bloqueado. Use a ação principal para desbloquear.'
                    : focusedDateIsSpecific
                      ? 'Somente os horários marcados ficarão indisponíveis.'
                      : 'O dia inteiro ficará indisponível. Toque em um horário para bloquear apenas horários específicos.'}
                </p>
                <div className="admin-block-modal__slots-grid">
                  {AVAILABLE_SLOTS.map((slot) => {
                    const key = `${focusedDate}|${slot}`;
                    const alreadyBlocked = blockedSlots.includes(key);
                    const selected = selectedSlots.includes(key);
                    return (
                      <button
                        type="button"
                        key={key}
                        className={[
                          "admin-slot-chip",
                          alreadyBlocked ? "admin-slot-chip--blocked" : "",
                          selected ? "admin-slot-chip--selected" : "",
                          !focusedDateIsSpecific && !selected ? "admin-slot-chip--full-preview" : "",
                        ].filter(Boolean).join(" ")}
                        disabled={onlyBlocked}
                        onClick={() => toggleSlot(focusedDate, slot)}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : <small className="admin-block-modal__empty-copy">Os horários aparecerão com base no dia selecionado.</small>}
          </section>
        </aside>


        <footer className="admin-block-modal__actions">
          <button type="button" className="secondary-action" onClick={onClose}>Fechar</button>
          <button type="button" className="admin-action admin-action--danger" disabled={!selectedDates.length} onClick={handleCancelServices}>Cancelar serviços</button>
          <button type="button" className={onlyBlocked ? "admin-action admin-action--unlock" : "admin-action"} disabled={!canSubmit} onClick={handleMainAction}>{onlyBlocked ? "Desbloquear dias" : "Salvar bloqueios"}</button>
        </footer>
      </section>

      {pendingRiskAction ? (
        <div className="admin-risk-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="admin-risk-confirm-title">
          <button type="button" className="admin-risk-confirm-modal__backdrop" aria-label="Fechar confirmação" onClick={handleCloseRiskConfirm} />
          <section className="admin-risk-confirm-modal__card">
            <span className="admin-risk-confirm-modal__eyebrow">Confirmação obrigatória</span>
            <h4 id="admin-risk-confirm-title">Há serviços nos bloqueios selecionados</h4>
            <p>
              {pendingRiskAction === "cancel"
                ? "Para cancelar os serviços dos dias selecionados, confirme digitando o texto abaixo."
                : "Para bloquear dias ou horários que já possuem serviços, confirme que os serviços existentes serão cancelados."}
            </p>
            <label className="admin-risk-confirm-modal__field">
              <span>Digite <strong>CANCELAR SERVIÇOS</strong></span>
              <input
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                placeholder="CANCELAR SERVIÇOS"
                autoFocus
              />
            </label>
            <div className="admin-risk-confirm-modal__actions">
              <button type="button" className="secondary-action" onClick={handleCloseRiskConfirm}>Voltar</button>
              <button type="button" className="admin-action admin-action--danger" disabled={!isRiskConfirmValid} onClick={handleConfirmRiskAction}>
                {pendingRiskAction === "cancel" ? "Cancelar serviços" : "Confirmar bloqueio"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
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
        <button type="button" className="admin-actions-menu__item admin-actions-menu__item--details" onClick={onOpenBlockedDetails}><LockIcon /><span>Gerenciar bloqueios</span></button>
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
  bookings: ServicoResponse[];
  onClose: () => void;
  onOpenBlocks: () => void;
  onOpenFinance: () => void;
  onUnblockDay: (date: string) => void;
  onUnblockSlot: (slotKey: string) => void;
};

function AdminProfileModal({ open, blockedDates, blockedSlots, historyEvents, bookings, onClose, onOpenBlocks, onOpenFinance }: AdminProfileModalProps) {
  const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

  const getBookingAmount = (booking: ServicoResponse) => {
    const source = booking as ServicoResponse & {
      amount?: number | string;
      price?: number | string;
      value?: number | string;
      total?: number | string;
      totalValue?: number | string;
      servicePrice?: number | string;
    };
    const raw = source.totalValue ?? source.amount ?? source.price ?? source.value ?? source.total ?? source.servicePrice ?? 0;
    const parsed = typeof raw === "number" ? raw : Number(String(raw).replace(/[^0-9,.-]/g, "").replace(",", "."));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const partialBlockedDays = new Set(blockedSlots.map((slot) => slot.split("|")[0]).filter(Boolean)).size;
  const totalBlocks = blockedDates.length + partialBlockedDays;
  const statementTotal = bookings.reduce((sum, booking) => sum + getBookingAmount(booking), 0);
  const totalAppointments = bookings.length;
  const lastHistoryDate = historyEvents[0]?.date
    ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(toLocalDate(historyEvents[0].date)).replace(".", "")
    : "sem registros";

  if (!open) return null;

  return (
    <div className="admin-profile-modal admin-profile-modal--dashboard" role="dialog" aria-modal="true" onClick={onClose}>
      <button type="button" className="admin-profile-modal__backdrop" aria-label="Fechar" onClick={onClose} />
      <section className="admin-profile-modal__card" onClick={(event) => event.stopPropagation()}>
        <header className="admin-profile-modal__header admin-profile-modal__header--dashboard">
          <div className="admin-profile-modal__avatar admin-profile-modal__avatar--dashboard">
            <ProfileIcon />
          </div>
          <div className="admin-profile-modal__identity">
            <span>Admin</span>
            <h3>Painel do administrador</h3>
            <small>Resumo rápido da agenda e do extrato</small>
          </div>
          <button className="booking-preview-modal__close" type="button" onClick={onClose}>×</button>
        </header>

        <div className="admin-profile-modal__stats" aria-label="Estatísticas principais">
          <article>
            <span className="admin-profile-modal__stat-icon admin-profile-modal__stat-icon--bookings"><CalendarIcon /></span>
            <small>Agendamentos</small>
            <strong>{totalAppointments}</strong>
            <em>mês atual + anterior</em>
          </article>
          <article>
            <span className="admin-profile-modal__stat-icon admin-profile-modal__stat-icon--money"><TotalMoneyIcon /></span>
            <small>Extrato</small>
            <strong>{formatCurrency(statementTotal)}</strong>
            <em>{statementTotal > 0 ? "total salvo" : "sem valor salvo"}</em>
          </article>
          <article>
            <span className="admin-profile-modal__stat-icon admin-profile-modal__stat-icon--blocks"><LockIcon /></span>
            <small>Bloqueios</small>
            <strong>{totalBlocks}</strong>
            <em>{blockedDates.length} dia(s) · {partialBlockedDays} parcial(is)</em>
          </article>
          <article>
            <span className="admin-profile-modal__stat-icon admin-profile-modal__stat-icon--history"><HistoryIcon /></span>
            <small>Histórico</small>
            <strong>{historyEvents.length}</strong>
            <em>último: {lastHistoryDate}</em>
          </article>
        </div>

        <div className="admin-profile-modal__actions admin-profile-modal__actions--cards">
          <button type="button" className="admin-profile-modal__action-card admin-profile-modal__action-card--blocks" onClick={onOpenBlocks}>
            <span><LockIcon /></span>
            <strong>Gerenciar bloqueios</strong>
            <small>dias, horários e liberações</small>
          </button>
          <button type="button" className="admin-profile-modal__action-card admin-profile-modal__action-card--finance" onClick={onOpenFinance}>
            <span><StatementIcon /></span>
            <strong>Histórico / Extrato</strong>
            <small>movimentações e valores</small>
          </button>
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
  events: CalendarEvent[];
  blockedDates: string[];
  scaleBlockedDates: string[];
  unlockedScaleDates: string[];
  blockedSlots: string[];
  onBack: () => void;
  onApplyManageChanges: (datesToRelease: string[], slotsToRelease: string[], slotsToKeep: string[]) => void;
};

function AdminBlockedDetailsPage({
  events,
  blockedDates,
  scaleBlockedDates,
  unlockedScaleDates,
  blockedSlots,
  onBack,
  onApplyManageChanges,
}: AdminBlockedDetailsPageProps) {
  const [activeDate, setActiveDate] = useState("");
  const [selectedBlockedDates, setSelectedBlockedDates] = useState<string[]>([]);
  const [selectedBlockedSlots, setSelectedBlockedSlots] = useState<string[]>([]);
  const [keepBlockedSlots, setKeepBlockedSlots] = useState<string[]>([]);
  const scaleLockedDates = useMemo(
    () => scaleBlockedDates.filter((date) => !unlockedScaleDates.includes(date)),
    [scaleBlockedDates, unlockedScaleDates],
  );
  const fullBlockedDates = useMemo(
    () => Array.from(new Set([...blockedDates, ...scaleLockedDates])).sort(),
    [blockedDates, scaleLockedDates],
  );
  const partialSlotsByDate = useMemo(() => {
    const map = new Map<string, string[]>();
    blockedSlots.forEach((slot) => {
      const [date, time] = slot.split("|");
      if (!date || !time) return;
      const list = map.get(date) ?? [];
      list.push(time);
      map.set(date, list.sort());
    });
    return map;
  }, [blockedSlots]);
  const blockedRows = useMemo(() => {
    const dates = Array.from(new Set([...fullBlockedDates, ...Array.from(partialSlotsByDate.keys())])).sort();
    return dates.map((date) => {
      const isFull = fullBlockedDates.includes(date);
      const isScale = scaleLockedDates.includes(date);
      const times = partialSlotsByDate.get(date) ?? [];
      const hasEvents = events.some((event) => event.date === date);
      return {
        date,
        isFull,
        isScale,
        hasEvents,
        times,
        kind: isFull ? "full" : "partial",
      };
    });
  }, [events, fullBlockedDates, partialSlotsByDate, scaleLockedDates]);
  const detailsDate = activeDate && blockedRows.some((row) => row.date === activeDate) ? activeDate : blockedRows[0]?.date ?? "";
  const activeRow = blockedRows.find((row) => row.date === detailsDate);
  const selectedReleaseDates = useMemo(() => {
    const dates = new Set<string>(selectedBlockedDates);
    selectedBlockedSlots.forEach((slot) => {
      const [date] = slot.split("|");
      if (date) dates.add(date);
    });
    return Array.from(dates).sort();
  }, [selectedBlockedDates, selectedBlockedSlots]);
  const selectedCount = selectedBlockedDates.length + selectedBlockedSlots.length;

  const formatChipDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;
  const formatListDate = (date: string) => new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  }).format(toLocalDate(date)).replace(".", "");

  const handleReleaseSummaryWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.currentTarget.scrollLeft += event.deltaY;
  };

  const toggleSelectedDate = (date: string) => {
    setSelectedBlockedDates((current) => {
      const removing = current.includes(date);
      if (removing) {
        setKeepBlockedSlots((slots) => slots.filter((slot) => !slot.startsWith(`${date}|`)));
        return current.filter((item) => item !== date);
      }
      return [...current, date].sort();
    });
  };

  const toggleSelectedSlot = (slot: string) => {
    setSelectedBlockedSlots((current) => current.includes(slot) ? current.filter((item) => item !== slot) : [...current, slot].sort());
  };

  const toggleKeepBlockedSlot = (date: string, time: string) => {
    const key = `${date}|${time}`;
    setSelectedBlockedDates((current) => current.includes(date) ? current : [...current, date].sort());
    setKeepBlockedSlots((current) => current.includes(key) ? current.filter((slot) => slot !== key) : [...current, key].sort());
  };

  const toggleRowUnlockSelection = (row: { date: string; kind: string }) => {
    if (row.kind === "full") {
      toggleSelectedDate(row.date);
      return;
    }

    const rowSlots = blockedSlots.filter((slot) => slot.startsWith(`${row.date}|`));
    const allSelected = rowSlots.length > 0 && rowSlots.every((slot) => selectedBlockedSlots.includes(slot));
    setSelectedBlockedSlots((current) => {
      if (allSelected) return current.filter((slot) => !rowSlots.includes(slot));
      return Array.from(new Set([...current, ...rowSlots])).sort();
    });
  };

  const handleUnlockSelected = () => {
    onApplyManageChanges(selectedBlockedDates, selectedBlockedSlots, keepBlockedSlots);
    setSelectedBlockedDates([]);
    setSelectedBlockedSlots([]);
    setKeepBlockedSlots([]);
  };

  return (
    <section className="admin-tool-page admin-tool-page--details admin-tool-page--blocked-wireframe">
      <AdminPageHeader eyebrow="Admin" title="Gerenciar bloqueios" onBack={onBack} />

      <section className="admin-block-details-summary" aria-label="Resumo dos bloqueios">
        <div className="admin-block-details-summary__legend">
          <span><i className="legend-dot legend-dot--blocked" /> Dia bloqueado</span>
          <span><i className="legend-dot legend-dot--scale" /> Escala 4x4</span>
          <span><i className="legend-dot legend-dot--booked" /> Com agendamentos</span>
        </div>
        <div className="admin-block-details-summary__chips admin-block-details-summary__chips--selected-release" onWheel={handleReleaseSummaryWheel}>
          {selectedReleaseDates.length ? selectedReleaseDates.map((date) => {
            const row = blockedRows.find((item) => item.date === date);
            const selectedSlotCount = selectedBlockedSlots.filter((slot) => slot.startsWith(`${date}|`)).length;
            const keepCount = keepBlockedSlots.filter((slot) => slot.startsWith(`${date}|`)).length;
            return (
              <button
                type="button"
                key={date}
                className={[
                  "admin-block-details-chip",
                  "admin-block-details-chip--release",
                  row?.kind === "partial" ? "admin-block-details-chip--partial" : "admin-block-details-chip--full",
                  date === detailsDate ? "is-active" : "",
                ].filter(Boolean).join(" ")}
                onClick={() => setActiveDate(date)}
              >
                {row?.kind === "partial" ? <ClockIcon /> : <CalendarIcon />}
                <span>{formatChipDate(date)}</span>
                <small>{row?.kind === "partial" ? `${selectedSlotCount} horário(s)` : keepCount ? `manter ${keepCount}` : 'dia inteiro'}</small>
              </button>
            );
          }) : <small className="admin-block-details-summary__empty">Selecione dias ou horários na lista abaixo para liberar.</small>}
        </div>
      </section>

      <div className="admin-tool-page__content admin-tool-page__content--two-columns admin-tool-page__content--blocked-details">
        <section className="admin-tool-card admin-tool-card--blocked-days">
          <h3>Dias bloqueados</h3>
          <p>Selecione dias para liberar. Em dias inteiros, marque no painel ao lado os horários que devem continuar bloqueados.</p>
          <div className="admin-tool-list admin-tool-list--single-column admin-blocked-days-list">
            {blockedRows.length ? blockedRows.map((row) => {
              const rowSlotKeys = blockedSlots.filter((slot) => slot.startsWith(`${row.date}|`));
              const rowSelected = row.kind === "full"
                ? selectedBlockedDates.includes(row.date)
                : rowSlotKeys.length > 0 && rowSlotKeys.every((slot) => selectedBlockedSlots.includes(slot));
              return (
                <article
                  key={row.date}
                  className={[
                    "admin-blocked-day-row",
                    row.kind === "partial" ? "admin-blocked-day-row--partial" : "admin-blocked-day-row--full",
                    row.isScale ? "admin-blocked-day-row--scale" : "",
                    row.hasEvents ? "admin-blocked-day-row--booked" : "",
                    row.date === detailsDate ? "is-active" : "",
                    rowSelected ? "is-selected" : "",
                  ].filter(Boolean).join(" ")}
                >
                  <button type="button" className="admin-blocked-day-row__main" onClick={() => setActiveDate(row.date)}>
                    <span className="admin-blocked-day-row__icon">{row.kind === "partial" ? <ClockIcon /> : <LockIcon />}</span>
                    <span className="admin-blocked-day-row__text">
                      <strong>{formatChipDate(row.date)}</strong>
                      <small>{formatListDate(row.date)}</small>
                    </span>
                    <span className="admin-blocked-day-row__tag">{row.isScale ? 'Escala 4x4' : row.kind === "partial" ? 'Horários específicos' : 'Dia inteiro'}</span>
                  </button>
                  <button type="button" className="admin-blocked-day-row__select" onClick={() => toggleRowUnlockSelection(row)}>{rowSelected ? 'Selecionado' : 'Liberar'}</button>
                </article>
              );
            }) : <small>Sem dias bloqueados.</small>}
          </div>
        </section>

        <section className="admin-tool-card admin-tool-card--blocked-hours">
            <h3>{detailsDate ? `Horários de ${formatChipDate(detailsDate)}` : 'Horários do dia'}</h3>
            <p>
              {activeRow?.kind === "partial"
                ? 'Selecione os horários destacados que deseja liberar.'
                : activeRow
                  ? selectedBlockedDates.includes(detailsDate)
                    ? 'Selecione os horários que continuarão bloqueados; os demais serão liberados.'
                    : 'Dia inteiro indisponível. Toque nos horários que devem continuar bloqueados ao liberar o dia.'
                  : 'Selecione um dia bloqueado para ver os horários.'}
            </p>
            <div className="admin-blocked-hours-grid">
              {detailsDate ? AVAILABLE_SLOTS.map((slot) => {
                const key = `${detailsDate}|${slot}`;
                const blockedByDay = activeRow?.kind === "full";
                const blockedBySlot = blockedSlots.includes(key);
                const selected = selectedBlockedSlots.includes(key);
                const keepSelected = keepBlockedSlots.includes(key);
                const fullDayQueued = Boolean(blockedByDay && selectedBlockedDates.includes(detailsDate));
                const isUnavailable = Boolean(blockedByDay || blockedBySlot);
                return (
                  <button
                    type="button"
                    key={key}
                    className={[
                      "admin-blocked-hour-chip",
                      blockedByDay && !fullDayQueued ? "admin-blocked-hour-chip--full" : "",
                      blockedByDay && fullDayQueued && keepSelected ? "admin-blocked-hour-chip--keep" : "",
                      blockedByDay && fullDayQueued && !keepSelected ? "admin-blocked-hour-chip--release-preview" : "",
                      blockedBySlot ? "admin-blocked-hour-chip--partial" : "",
                      selected ? "is-selected" : "",
                    ].filter(Boolean).join(" ")}
                    disabled={!blockedByDay && !blockedBySlot}
                    onClick={() => blockedByDay ? toggleKeepBlockedSlot(detailsDate, slot) : toggleSelectedSlot(key)}
                  >
                    <span>{slot}</span>
                    {isUnavailable ? <LockIcon /> : null}
                  </button>
                );
              }) : <small>Nenhum dia selecionado.</small>}
            </div>
          </section>
      </div>

      <div className="admin-tool-page__bulkbar admin-tool-page__bulkbar--wireframe">
        <span>{selectedCount ? `${selectedCount} item(ns) selecionado(s). Horários marcados em dias inteiros continuarão bloqueados.` : 'Selecione dias ou horários para liberar.'}</span>
        <button type="button" disabled={!selectedCount} onClick={handleUnlockSelected}>Aplicar alterações</button>
      </div>
    </section>
  );
}

function ClockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
}

type AdminMonthOption = {
  value: string;
  label: string;
};

type AdminStatementEntry = {
  id: string;
  title: string;
  date: string;
  time: string;
  category: string;
  amount: number;
  city?: string;
};

type AdminHistoryEntry = {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  city?: string;
};

function getAdminCurrentPreviousMonthOptions(): AdminMonthOption[] {
  const now = new Date();
  return [0, -1].map((delta) => {
    const date = new Date(now.getFullYear(), now.getMonth() + delta, 1);
    const value = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
      .format(date)
      .replace(/^./, (letter) => letter.toUpperCase());
    return { value, label };
  });
}

function buildMockStatementEntries(month: string): AdminStatementEntry[] {
  return [
    { id: `${month}-mock-salary`, title: "Recebimento", date: `${month}-04`, time: "08:30", category: "Serviço concluído", amount: 430, city: "Conselheiro Lafaiete" },
    { id: `${month}-mock-grocery`, title: "Pequeno reparo", date: `${month}-09`, time: "11:00", category: "Manutenção", amount: 185, city: "Ouro Branco" },
    { id: `${month}-mock-rent`, title: "Instalação", date: `${month}-15`, time: "14:00", category: "Agendamento", amount: 320, city: "Congonhas" },
    { id: `${month}-mock-transport`, title: "Visita técnica", date: `${month}-22`, time: "16:00", category: "Deslocamento", amount: 95, city: "Conselheiro Lafaiete" },
  ];
}

function buildMockHistoryEntries(month: string): AdminHistoryEntry[] {
  return [
    { id: `${month}-mock-1`, title: "Atendimento finalizado", date: `${month}-05`, time: "09:00", description: "Serviço mock concluído para validação visual da timeline.", city: "Conselheiro Lafaiete" },
    { id: `${month}-mock-2`, title: "Reparo aprovado", date: `${month}-11`, time: "12:30", description: "Registro mock usado enquanto a API não retorna histórico suficiente.", city: "Ouro Branco" },
    { id: `${month}-mock-3`, title: "Cliente reagendado", date: `${month}-18`, time: "15:00", description: "Exemplo mock de movimentação administrativa.", city: "Congonhas" },
    { id: `${month}-mock-4`, title: "Serviço cancelado", date: `${month}-25`, time: "17:30", description: "Mock para testar estados e espaçamento do histórico.", city: "Conselheiro Lafaiete" },
  ];
}

function AdminMockNotice({ label }: { label: string }) {
  return <span className="admin-mock-notice">Dados mock: {label}</span>;
}

type AdminStatementHalfModalProps = {
  open: boolean;
  bookings: ServicoResponse[];
  onClose: () => void;
};

function AdminStatementHalfModal({ open, bookings, onClose }: AdminStatementHalfModalProps) {
  type BookingWithValue = ServicoResponse & {
    amount?: number | string;
    price?: number | string;
    value?: number | string;
    total?: number | string;
    totalValue?: number | string;
    servicePrice?: number | string;
  };

  const [chartMode, setChartMode] = useState<"money" | "appointments">("money");

  const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

  const formatShortDate = (iso: string) => new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(toLocalDate(iso)).replace(".", "");

  const getBookingAmount = (booking: ServicoResponse) => {
    const source = booking as BookingWithValue;
    const raw = source.totalValue ?? source.amount ?? source.price ?? source.value ?? source.total ?? source.servicePrice ?? 0;
    const value = typeof raw === "number" ? raw : Number(String(raw).replace(/[^0-9,.-]/g, "").replace(",", "."));
    return Number.isFinite(value) ? value : 0;
  };

  const monthOptions = useMemo(() => getAdminCurrentPreviousMonthOptions(), []);
  const allowedMonths = useMemo(() => new Set(monthOptions.map((month) => month.value)), [monthOptions]);
  const periodLabel = monthOptions.map((month) => month.label).join(" • ");

  const realEntries = useMemo<AdminStatementEntry[]>(() => bookings
    .map((booking) => ({
      id: booking.eventId || `${booking.start}-${booking.serviceType}`,
      title: booking.serviceType || "Serviço",
      date: booking.start.slice(0, 10),
      time: booking.start.slice(11, 16),
      category: booking.status || "agendado",
      amount: getBookingAmount(booking),
      city: booking.clientCity,
    }))
    .filter((entry) => allowedMonths.has(entry.date.slice(0, 7)))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)), [bookings, allowedMonths]);

  const useMock = realEntries.length === 0 || realEntries.every((entry) => entry.amount <= 0);
  const entries = useMock
    ? monthOptions.flatMap((month) => buildMockStatementEntries(month.value))
    : realEntries;
  const entriesByMonth = useMemo(() => monthOptions.map((month) => ({
    ...month,
    entries: entries.filter((entry) => entry.date.slice(0, 7) === month.value),
  })).filter((month) => month.entries.length > 0), [entries, monthOptions]);
  const totalMoney = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalAppointments = entries.length;

  const chartData = useMemo(() => {
    const groups = new Map<string, { label: string; money: number; appointments: number; order: string }>();
    entries.forEach((entry) => {
      const current = groups.get(entry.date) ?? { label: formatShortDate(entry.date), money: 0, appointments: 0, order: entry.date };
      current.money += entry.amount;
      current.appointments += 1;
      groups.set(entry.date, current);
    });

    let runningMoney = 0;
    let runningAppointments = 0;
    return Array.from(groups.values())
      .sort((a, b) => a.order.localeCompare(b.order))
      .map((item) => {
        runningMoney += item.money;
        runningAppointments += item.appointments;
        return { ...item, money: runningMoney, appointments: runningAppointments };
      });
  }, [entries]);

  const chartValues = chartData.map((item) => chartMode === "money" ? item.money : item.appointments);
  const chartMax = Math.max(...chartValues, 1);
  const chartPointList = chartData.length
    ? chartData.map((item, index) => {
        const x = chartData.length === 1 ? 50 : 10 + (index * 80) / Math.max(chartData.length - 1, 1);
        const value = chartMode === "money" ? item.money : item.appointments;
        const y = 82 - (value / chartMax) * 56;
        return { ...item, x, y, value };
      })
    : [{ label: "", money: 0, appointments: 0, order: "", x: 50, y: 58, value: 0 }];
  const chartPoints = chartPointList.map((point) => `${point.x},${point.y}`).join(" ");
  const chartAreaPoints = `10,86 ${chartPoints} 90,86`;
  const ringValue = chartMode === "money" ? totalMoney : totalAppointments;
  const ringReference = Math.max(ringValue * 1.2, chartMode === "money" ? 1000 : 10);
  const ringRatio = Math.max(0.08, Math.min(ringValue / ringReference, 0.92));
  const ringDash = `${Math.round(ringRatio * 100)} ${100 - Math.round(ringRatio * 100)}`;

  if (!open) return null;

  return (
    <section className="admin-half-modal admin-half-modal--statement" role="dialog" aria-modal="true" aria-label="Extrato financeiro">
      <header className="admin-half-modal__header">
        <div>
          <span>Admin</span>
          <h2>Extrato</h2>
        </div>
        <button type="button" className="admin-tool-page__back" onClick={onClose} aria-label="Fechar extrato"><span>Fechar</span></button>
      </header>

      <div className="admin-half-modal__body admin-statement-wireframe admin-statement-wireframe--full-period">
        <div className="admin-statement-period-summary" aria-label="Período do extrato">
          <span>Período salvo no Supabase</span>
          <strong>{periodLabel}</strong>
          <small>Separado por mês · mês atual e mês anterior</small>
        </div>

        {useMock ? <AdminMockNotice label="extrato financeiro para pré-visualização" /> : null}

        <article className="admin-finance-chart-card admin-finance-chart-card--half admin-finance-chart-card--radial">
          <header>
            <div>
              <span>{chartMode === "money" ? "Dinheiro acumulado no período" : "Agendamentos acumulados"}</span>
              <strong>{chartMode === "money" ? formatCurrency(totalMoney) : `${totalAppointments} agendamento(s)`}</strong>
            </div>
            <div className="admin-finance-chart-switch admin-finance-chart-switch--arrows">
              <button type="button" aria-label="Ver dinheiro" className={chartMode === "money" ? "is-active" : ""} onClick={() => setChartMode("money")}>‹</button>
              <button type="button" aria-label="Ver agendamentos" className={chartMode === "appointments" ? "is-active" : ""} onClick={() => setChartMode("appointments")}>›</button>
            </div>
          </header>
          <div className="admin-finance-chart-combo">
            <svg className="admin-finance-radial-chart" viewBox="0 0 42 42" role="img" aria-label="Resumo circular do extrato">
              <circle className="admin-finance-radial-chart__track" cx="21" cy="21" r="15.915" />
              <circle className="admin-finance-radial-chart__value" cx="21" cy="21" r="15.915" pathLength="100" strokeDasharray={ringDash} />
              <text x="21" y="19" textAnchor="middle">{chartMode === "money" ? "R$" : "AG"}</text>
              <text x="21" y="25" textAnchor="middle">{chartMode === "money" ? Math.round(totalMoney) : totalAppointments}</text>
            </svg>
            <div className="admin-finance-sparkline-wrap">
              <svg className="admin-finance-line-chart admin-finance-line-chart--spark" viewBox="0 0 100 100" role="img" aria-label="Evolução acumulada do extrato">
                <polygon points={chartAreaPoints} />
                <polyline points={chartPoints} />
                {chartPointList.map((point, index) => (
                  <g key={`${point.label}-${index}`}>
                    <circle cx={point.x} cy={point.y} r="2.4" />
                    <title>{chartMode === "money" ? formatCurrency(point.money) : `${point.appointments} agendamento(s)`}</title>
                  </g>
                ))}
              </svg>
              <div className="admin-finance-chart-labels">
                {chartPointList.map((item, index) => index === 0 || index === chartPointList.length - 1 || index === Math.floor(chartPointList.length / 2)
                  ? <span key={`${item.label}-${index}`}>{item.label}</span>
                  : null)}
              </div>
            </div>
          </div>
        </article>

        <div className="admin-finance-metrics admin-finance-metrics--wireframe-icons">
          <article>
            <span className="admin-finance-metric-icon admin-finance-metric-icon--money"><TotalMoneyIcon /></span>
            <small>Dinheiro total</small>
            <strong>{formatCurrency(totalMoney)}</strong>
          </article>
          <article>
            <span className="admin-finance-metric-icon admin-finance-metric-icon--bookings"><TotalBookingsIcon /></span>
            <small>Total de agendamentos</small>
            <strong>{totalAppointments}</strong>
          </article>
        </div>

        <div className="admin-finance-statement-list">
          <header><h3>Extratos</h3><span>{totalAppointments} item(ns)</span></header>
          <div className="admin-finance-statement-scroll">
            {entriesByMonth.map((month) => (
              <section key={month.value} className="admin-finance-month-group" aria-label={`Extratos de ${month.label}`}>
                <div className="admin-finance-month-group__header">
                  <strong>{month.label}</strong>
                  <small>{month.entries.length} item(ns)</small>
                </div>
                {month.entries.map((entry) => (
                  <article key={entry.id} className="admin-finance-statement-row admin-finance-statement-row--half">
                    <span className="admin-finance-row-icon"><StatementIcon /></span>
                    <div>
                      <strong>{entry.title}</strong>
                      <small>{formatShortDate(entry.date)} · {entry.time} · {entry.city ?? "Cidade"}</small>
                    </div>
                    <em>{entry.category}</em>
                    <b>{formatCurrency(entry.amount)}</b>
                  </article>
                ))}
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

type AdminHistoryHalfModalProps = {
  open: boolean;
  historyEvents: CalendarEvent[];
  onClose: () => void;
};

function AdminHistoryHalfModal({ open, historyEvents, onClose }: AdminHistoryHalfModalProps) {
  const monthOptions = useMemo(() => getAdminCurrentPreviousMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value ?? "");
  const historyPeriodLabel = monthOptions.map((month) => month.label).join(" • ");

  const formatShortDate = (iso: string) => new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(toLocalDate(iso)).replace(".", "");

  const realEntries = useMemo<AdminHistoryEntry[]>(() => historyEvents
    .filter((event) => event.date.slice(0, 7) === selectedMonth)
    .map((event) => ({
      id: event.id,
      title: event.serviceLabel ?? event.title ?? "Serviço",
      date: event.date,
      time: event.startTime,
      description: `${event.customerName ?? "Cliente"} · ${event.city ?? "Cidade não informada"}`,
      city: event.city,
    })), [historyEvents, selectedMonth]);
  const useMock = realEntries.length === 0;
  const entries = useMock ? buildMockHistoryEntries(selectedMonth) : realEntries;

  if (!open) return null;

  return (
    <section className="admin-half-modal admin-half-modal--history" role="dialog" aria-modal="true" aria-label="Histórico de agendamentos">
      <header className="admin-half-modal__header">
        <div>
          <span>Admin</span>
          <h2>Histórico</h2>
        </div>
        <button type="button" className="admin-tool-page__back" onClick={onClose} aria-label="Fechar histórico"><span>Fechar</span></button>
      </header>

      <div className="admin-half-modal__body admin-history-wireframe">
        <div className="admin-history-timeline-header admin-history-timeline-header--half">
          <div>
            <span>Timeline · mês atual e mês anterior</span>
            <h3>Agendamentos</h3>
            <small>Período salvo no Supabase: {historyPeriodLabel}</small>
          </div>
          <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} aria-label="Filtrar mês do histórico">
            {monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
          </select>
        </div>

        {useMock ? <AdminMockNotice label="histórico para pré-visualização" /> : null}

        <div className="admin-history-timeline-scroll admin-history-timeline-scroll--half">
          {entries.map((entry, index) => (
            <article key={entry.id} className={[
              "admin-history-timeline-item",
              "admin-history-timeline-item--half",
              index === 0 ? "is-featured" : "",
            ].filter(Boolean).join(" ")}>
              <span className="admin-history-timeline-dot" />
              <div className="admin-history-timeline-card">
                <header>
                  <strong>{entry.title}</strong>
                  <time>{entry.time}</time>
                </header>
                <p>{entry.description}</p>
                <small>{formatShortDate(entry.date)}</small>
              </div>
            </article>
          ))}
        </div>
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
  type PeriodKey = "day" | "week" | "month" | "year";
  type BookingWithValue = ServicoResponse & {
    amount?: number | string;
    price?: number | string;
    value?: number | string;
    total?: number | string;
    totalValue?: number | string;
    servicePrice?: number | string;
  };

  const monthOptions = useMemo(() => {
    const now = new Date();
    return [0, -1].map((delta) => {
      const date = new Date(now.getFullYear(), now.getMonth() + delta, 1);
      const value = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
      const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
        .format(date)
        .replace(/^./, (letter) => letter.toUpperCase());
      return { value, label };
    });
  }, []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value ?? "");
  const [period] = useState<PeriodKey>("month");
  const [chartMode, setChartMode] = useState<"money" | "time">("money");

  const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

  const formatShortDate = (iso: string) => new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(toLocalDate(iso)).replace(".", "");

  const getBookingDate = (booking: ServicoResponse) => booking.start.slice(0, 10);
  const getBookingTime = (booking: ServicoResponse) => booking.start.slice(11, 16);
  const getBookingAmount = (booking: ServicoResponse) => {
    const source = booking as BookingWithValue;
    const raw = source.totalValue ?? source.amount ?? source.price ?? source.value ?? source.total ?? source.servicePrice ?? 0;
    const value = typeof raw === "number" ? raw : Number(String(raw).replace(/[^0-9,.-]/g, "").replace(",", "."));
    return Number.isFinite(value) ? value : 0;
  };
  const getBookingDurationMinutes = (booking: ServicoResponse) => {
    const start = new Date(booking.start).getTime();
    const end = new Date(booking.end).getTime();
    const duration = Math.round((end - start) / 60000);
    return Number.isFinite(duration) && duration > 0 ? duration : 60;
  };

  const filteredBookings = useMemo(
    () => bookings.filter((booking) => booking.start.slice(0, 7) === selectedMonth),
    [bookings, selectedMonth],
  );
  const filteredHistory = useMemo(
    () => historyEvents.filter((event) => event.date.slice(0, 7) === selectedMonth),
    [historyEvents, selectedMonth],
  );
  const totalMoney = filteredBookings.reduce((sum, booking) => sum + getBookingAmount(booking), 0);
  const totalAppointments = filteredBookings.length;
  const totalSavedMinutes = filteredBookings.reduce((sum, booking) => sum + getBookingDurationMinutes(booking), 0);

  const chartData = useMemo(() => {
    const groups = new Map<string, { label: string; money: number; minutes: number; count: number }>();
    filteredBookings.forEach((booking) => {
      const date = getBookingDate(booking);
      const day = Number(date.slice(8, 10));
      const groupIndex = period === "day" ? day : period === "week" ? Math.ceil(day / 7) : period === "year" ? Number(date.slice(5, 7)) : Math.ceil(day / 7);
      const label = period === "day" ? `${day}` : period === "year" ? new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(toLocalDate(`${date.slice(0, 7)}-01`)).replace(".", "") : `${groupIndex}ª sem.`;
      const key = `${period}-${groupIndex}`;
      const current = groups.get(key) ?? { label, money: 0, minutes: 0, count: 0 };
      current.money += getBookingAmount(booking);
      current.minutes += getBookingDurationMinutes(booking);
      current.count += 1;
      groups.set(key, current);
    });
    const values = Array.from(groups.values());
    if (values.length) return values;
    return ["1ª sem.", "2ª sem.", "3ª sem.", "4ª sem."].map((label) => ({ label, money: 0, minutes: 0, count: 0 }));
  }, [filteredBookings, period]);
  const chartMax = Math.max(...chartData.map((item) => chartMode === "money" ? item.money : item.minutes), 1);
  const chartPoints = chartData.map((item, index) => {
    const x = chartData.length === 1 ? 50 : 8 + (index * 84) / (chartData.length - 1);
    const value = chartMode === "money" ? item.money : item.minutes;
    const y = 82 - (value / chartMax) * 58;
    return `${x},${y}`;
  }).join(" ");
  const chartAreaPoints = `8,88 ${chartPoints} 92,88`;

  const selectedMonthLabel = monthOptions.find((item) => item.value === selectedMonth)?.label ?? "Mês selecionado";

  return (
    <section className="admin-tool-page admin-tool-page--finance admin-finance-wireframe">
      <AdminPageHeader eyebrow="Admin" title="Histórico e extrato" onBack={onBack} />

      <div className="admin-finance-shell">
        <section className="admin-finance-statement-panel" aria-label="Extrato financeiro">
          <div className="admin-statement-period-summary"><span>Período salvo no Supabase</span><strong>Todos os registros disponíveis</strong></div>

          <article className="admin-finance-chart-card">
            <header>
              <div>
                <span>{chartMode === "money" ? "Dinheiro x tempo salvo" : "Tempo salvo total"}</span>
                <strong>{selectedMonthLabel}</strong>
              </div>
              <div className="admin-finance-chart-switch">
                <button type="button" aria-label="Ver dinheiro" className={chartMode === "money" ? "is-active" : ""} onClick={() => setChartMode("money")}><MoneyIcon /></button>
                <button type="button" aria-label="Ver tempo salvo" className={chartMode === "time" ? "is-active" : ""} onClick={() => setChartMode("time")}><TrendIcon /></button>
              </div>
            </header>
            <svg className="admin-finance-line-chart" viewBox="0 0 100 100" role="img" aria-label="Gráfico do extrato">
              <polygon points={chartAreaPoints} />
              <polyline points={chartPoints} />
              {chartData.map((item, index) => {
                const [x, y] = chartPoints.split(" ")[index].split(",").map(Number);
                return <circle key={`${item.label}-${index}`} cx={x} cy={y} r="2.2" />;
              })}
            </svg>
            <div className="admin-finance-chart-labels">
              {chartData.map((item, index) => <span key={`${item.label}-${index}`}>{item.label}</span>)}
            </div>
          </article>

          <div className="admin-finance-metrics">
            <article>
              <span className="admin-finance-metric-icon admin-finance-metric-icon--money"><TotalMoneyIcon /></span>
              <small>Dinheiro total</small>
              <strong>{formatCurrency(totalMoney)}</strong>
            </article>
            <article>
              <span className="admin-finance-metric-icon admin-finance-metric-icon--bookings"><TotalBookingsIcon /></span>
              <small>Total de agendamentos</small>
              <strong>{totalAppointments}</strong>
            </article>
          </div>

          <div className="admin-finance-statement-list">
            <header>
              <h3>Extratos</h3>
              <span>{Math.floor(totalSavedMinutes / 60)}h {totalSavedMinutes % 60}min salvos</span>
            </header>
            <div className="admin-finance-statement-scroll">
              {filteredBookings.length ? filteredBookings.map((booking) => (
                <article key={booking.eventId} className="admin-finance-statement-row">
                  <span className="admin-finance-row-icon"><StatementIcon /></span>
                  <div>
                    <strong>{booking.serviceType}</strong>
                    <small>{formatShortDate(getBookingDate(booking))} · {getBookingTime(booking)} · {booking.clientCity}</small>
                  </div>
                  <em>{booking.status || "agendado"}</em>
                  <b>{formatCurrency(getBookingAmount(booking))}</b>
                </article>
              )) : <small className="admin-finance-empty">Nenhum extrato para o mês selecionado.</small>}
            </div>
          </div>
        </section>

        <section className="admin-history-timeline-panel" aria-label="Histórico de agendamentos">
          <header className="admin-history-timeline-header">
            <div>
              <span>Histórico</span>
              <h3>Agendamentos concluídos</h3>
            </div>
            <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} aria-label="Filtrar mês do histórico">
              {monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
            </select>
          </header>

          <div className="admin-history-timeline-scroll">
            {filteredHistory.length ? filteredHistory.map((event, index) => (
              <article key={event.id} className={["admin-history-timeline-item", index === 0 ? "is-featured" : ""].filter(Boolean).join(" ")}>
                <span className="admin-history-timeline-dot" />
                <div className="admin-history-timeline-card">
                  <header>
                    <strong>{event.serviceLabel ?? event.title}</strong>
                    <time>{event.startTime}</time>
                  </header>
                  <p>{event.customerName ?? "Cliente"} · {event.city ?? "Cidade não informada"}</p>
                  <small>{formatShortDate(event.date)}</small>
                </div>
              </article>
            )) : <small className="admin-finance-empty">Nenhum histórico para o mês selecionado.</small>}
          </div>
        </section>
      </div>
    </section>
  );
}

function TotalMoneyIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M10 7h7v7M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" /></svg>; }
function TotalBookingsIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v3M16 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Zm5 9 2 2 4-5" /></svg>; }
function MoneyIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v10H4V7Zm3 3h.01M17 14h.01M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /></svg>; }
function TrendIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17 10 11l4 4 6-8M15 7h5v5" /></svg>; }

function BackIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>; }
function CalendarIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /></svg>; }
function HistoryIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.35-5.65L4 8.7M4 4v4.7h4.7M12 8v5l3 2" /></svg>; }
function StatementIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 0 1 2-2Zm2 6h6M9 13h6" /></svg>; }
function LockIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6V10Zm6 4v3" /></svg>; }
function ProfileIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" /></svg>; }
function splitCustomerName(value?: string) {
  const parts = (value ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "Cliente", lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function mergeServicoResponses(primary: ServicoResponse[], secondary: ServicoResponse[]) {
  const map = new Map<string, ServicoResponse>();
  for (const booking of [...primary, ...secondary]) {
    const key = booking.eventId || `${booking.start}-${booking.serviceType}-${booking.clientPhone}`;
    map.set(key, booking);
  }
  return Array.from(map.values()).sort((a, b) => a.start.localeCompare(b.start));
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
  const token = getStoredAdminToken();
  const todayIso = toIsoDate(new Date());
  const currentAllowedMonth = `${todayIso.slice(0, 7)}-01`;
  const nextAllowedMonth = shiftMonth(currentAllowedMonth, 1);
  const bookingsFrom = currentAllowedMonth;
  const bookingsTo = shiftMonth(nextAllowedMonth, 1);
  const historyFrom = shiftMonth(currentAllowedMonth, -2);
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [selectedSlot, setSelectedSlot] = useState<HomeSelectedSlot>(null);
  const [viewportSize, setViewportSize] = useState<ViewportSize>(() => getViewportSize());
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
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [selectedMobileBooking, setSelectedMobileBooking] = useState<CalendarEvent | null>(null);
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>(() => getLocalCalendarEvents().filter((event) => event.date >= todayIso));
  const [manualBlockedDates, setManualBlockedDates] = useState<string[]>(() => readStringArray(ADMIN_BLOCKED_DAYS_KEY));
  const [blockedSlots, setBlockedSlots] = useState<string[]>(() => readStringArray(ADMIN_BLOCKED_SLOTS_KEY));
  const [unlockedScaleDates, setUnlockedScaleDates] = useState<string[]>(() => readStringArray(ADMIN_SCALE_UNLOCKS_KEY));
  const [cancelledDays, setCancelledDays] = useState<string[]>(() => readStringArray(ADMIN_CANCELLED_DAYS_KEY));

  const adminBookingsQuery = useAdminBookings({ from: bookingsFrom, to: bookingsTo }, Boolean(token));
  const adminHistoryQuery = useAdminBookings({ from: historyFrom, to: todayIso }, Boolean(token));

  const viewportWidth = viewportSize.width;
  const viewportHeight = viewportSize.height;
  const isCompactHeight = viewportHeight <= ADMIN_COMPACT_HEIGHT;
  const isDesktop = viewportWidth >= ADMIN_DESKTOP_MIN_WIDTH;
  const isMobileLandscape = isDesktop && viewportWidth > viewportHeight && isCompactHeight;
  const shouldUseMobileActions = !isDesktop;
  const hasAdminCriticalSurfaceOpen = isBlocksOpen || isBlockedDetailsOpen || isFinanceHistoryOpen;
  const hasHalfToolOpen = historyOpen || statementOpen;

  useEffect(() => {
    document.body.classList.toggle("admin-critical-surface-open", hasAdminCriticalSurfaceOpen);
    return () => document.body.classList.remove("admin-critical-surface-open");
  }, [hasAdminCriticalSurfaceOpen]);

  useEffect(() => {
    document.body.classList.toggle("admin-half-tools-open", hasHalfToolOpen);
    return () => document.body.classList.remove("admin-half-tools-open");
  }, [hasHalfToolOpen]);

  useEffect(() => {
    const bookingsPanelOpen = isMobileBookingsOpen || (isDesktop && isSidebarExpanded);
    document.body.classList.toggle("admin-bookings-surface-open", bookingsPanelOpen);
    return () => document.body.classList.remove("admin-bookings-surface-open");
  }, [isMobileBookingsOpen, isDesktop, isSidebarExpanded]);

  const scaleBlockedDates = useMemo(
    () => [...build4x4UnavailableDates(currentAllowedMonth, currentAllowedMonth), ...build4x4UnavailableDates(nextAllowedMonth, currentAllowedMonth)],
    [currentAllowedMonth, nextAllowedMonth],
  );

  const unavailableDates = useMemo(() => {
    const scale = scaleBlockedDates.filter((date) => !unlockedScaleDates.includes(date));
    return Array.from(new Set([...scale, ...manualBlockedDates])).sort();
  }, [manualBlockedDates, scaleBlockedDates, unlockedScaleDates]);

  const allEvents = useMemo(() => {
    const localFutureEvents = localEvents.filter((event) => event.date >= todayIso);
    const mergedEvents = mergeEvents(adminBookingsQuery.calendarEvents, localFutureEvents);
    return mergedEvents.filter((event) => !cancelledDays.includes(event.date));
  }, [adminBookingsQuery.calendarEvents, cancelledDays, todayIso, localEvents]);

  const historyEvents = useMemo(() => {
    const localPastEvents = getLocalCalendarEvents().filter((event) => event.date < todayIso);
    return mergeEvents(adminHistoryQuery.calendarEvents, localPastEvents)
      .filter((event) => event.date < todayIso)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [adminHistoryQuery.calendarEvents, todayIso]);

  const sheetBookings = useMemo(() => allEvents.map(calendarEventToServicoResponse), [allEvents]);
  const sheetHistoryBookings = useMemo(() => historyEvents.map(calendarEventToServicoResponse), [historyEvents]);
  const statementBookings = useMemo(
    () => mergeServicoResponses(sheetBookings, sheetHistoryBookings),
    [sheetBookings, sheetHistoryBookings],
  );

  useEffect(() => {
    const handleResize = () => setViewportSize(getViewportSize());
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
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
    if (!isDesktop) return;
    setIsMobileBookingsOpen(false);
    setSelectedMobileBooking(null);
  }, [isDesktop]);

  useEffect(() => {
    const closeHeaderSurfaces = () => {
      setIsMobileBookingsOpen(false);
      setHistoryOpen(false);
      setStatementOpen(false);
      setIsBlocksOpen(false);
      setIsBlockedDetailsOpen(false);
      setIsFinanceHistoryOpen(false);
    };

    const openBooking = () => {
      closeHeaderSurfaces();
      setIsActionsOpen(false);
      setIsProfileOpen(false);
      setIsBookingOpen(true);
    };

    const openProfile = () => {
      closeHeaderSurfaces();
      setIsActionsOpen(false);
      setIsProfileOpen((current) => !current);
    };

    const openActions = () => {
      closeHeaderSurfaces();
      setIsProfileOpen(false);
      setIsActionsOpen((current) => !current);
    };

    const focusBookings = () => {
      setIsActionsOpen(false);
      setIsProfileOpen(false);
      const { width } = getViewportSize();
      if (width < ADMIN_DESKTOP_MIN_WIDTH) {
        setIsMobileBookingsOpen((current) => !current);
        return;
      }
      setIsSidebarExpanded(true);
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
    setIsSidebarExpanded(true);
  };

  const handleApplyBlock = (dates: string[], slots: string[], shouldCancel: boolean) => {
    const slotDateSet = new Set(slots.map((slot) => slot.split("|")[0]).filter(Boolean));
    const fullDayDates = dates.filter((date) => !slotDateSet.has(date));
    setAndSave(ADMIN_BLOCKED_DAYS_KEY, setManualBlockedDates, [...manualBlockedDates, ...fullDayDates]);
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

  const handleApplyManagedBlockChanges = (datesToRelease: string[], slotsToRelease: string[], slotsToKeep: string[]) => {
    const releaseDateSet = new Set(datesToRelease);
    const releaseSlotSet = new Set(slotsToRelease);

    setAndSave(ADMIN_BLOCKED_DAYS_KEY, setManualBlockedDates, manualBlockedDates.filter((date) => !releaseDateSet.has(date)));
    setAndSave(ADMIN_BLOCKED_SLOTS_KEY, setBlockedSlots, [
      ...blockedSlots.filter((slot) => {
        const [slotDate] = slot.split("|");
        return !releaseSlotSet.has(slot) && !releaseDateSet.has(slotDate);
      }),
      ...slotsToKeep,
    ]);

    const scaleDates = datesToRelease.filter((date) => scaleBlockedDates.includes(date));
    if (scaleDates.length) {
      setAndSave(ADMIN_SCALE_UNLOCKS_KEY, setUnlockedScaleDates, [...unlockedScaleDates, ...scaleDates]);
    }
  };

  const handleBookingCreated = (event: CalendarEvent) => {
    setLocalEvents((current) => mergeEvents(current, [event]));
    setTimelineMonth(toMonthStart(event.date));
    setSelectedDate(event.date);
  };

  const closeMobileAdminSurfaces = () => {
    setIsActionsOpen(false);
    setIsMobileBookingsOpen(false);
    setHistoryOpen(false);
    setStatementOpen(false);
    setIsBlocksOpen(false);
    setIsBlockedDetailsOpen(false);
    setIsFinanceHistoryOpen(false);
    setIsProfileOpen(false);
  };

  const closeCriticalAdminSurfaces = () => {
    setIsActionsOpen(false);
    setIsMobileBookingsOpen(false);
    setIsBlocksOpen(false);
    setIsBlockedDetailsOpen(false);
    setIsFinanceHistoryOpen(false);
    setIsProfileOpen(false);
  };

  const toggleMobileBookings = () => {
    const shouldOpen = !isMobileBookingsOpen;
    closeMobileAdminSurfaces();
    setIsMobileBookingsOpen(shouldOpen);
  };

  const toggleMobileHistory = () => {
    closeCriticalAdminSurfaces();
    setHistoryOpen((current) => !current);
  };

  const toggleMobileBlocks = () => {
    const shouldOpen = !isBlocksOpen;
    closeMobileAdminSurfaces();
    setIsBlocksOpen(shouldOpen);
  };

  const toggleMobileStatement = () => {
    closeCriticalAdminSurfaces();
    setStatementOpen((current) => !current);
  };

  const toggleMobileProfile = () => {
    const shouldOpen = !isProfileOpen;
    closeMobileAdminSurfaces();
    setIsProfileOpen(shouldOpen);
  };

  return (
    <div
      className={[
        "admin-dashboard-root",
        isCompactHeight ? "admin-dashboard-root--compact-height" : "",
        isMobileLandscape ? "admin-dashboard-root--landscape" : "",
        shouldUseMobileActions ? "admin-dashboard-root--mobile-actions" : "",
        hasHalfToolOpen ? "admin-dashboard-root--half-tools-open" : "",
      ].filter(Boolean).join(" ")}
    >
      <div className={["home-page", "home-page--admin", "home-page--sidebar-layout", isMobileLandscape ? "home-page--admin-landscape" : ""].filter(Boolean).join(" ")}>
        <div
          className={[
            "home-grid",
            isDesktop ? "home-grid--desktop" : "home-grid--mobile",
            isDesktop && isSidebarExpanded ? "home-grid--sidebar-open" : "",
            isDesktop && !isSidebarExpanded ? "home-grid--sidebar-collapsed" : "",
            isMobileLandscape ? "home-grid--admin-landscape" : "",
          ].filter(Boolean).join(" ")}
        >
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
                onToggleExpanded={() => setIsSidebarExpanded((current) => !current)}
                onSelectRailDate={(date) => handleDateSelect(date)}
                isExpanded={isSidebarExpanded}
                isDesktop
                isAdminMode
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="admin-dashboard-actions" aria-label="Ações rápidas do admin">
        <button type="button" className={["admin-dashboard-actions__button", "admin-dashboard-actions__button--history", historyOpen ? "is-active" : ""].filter(Boolean).join(" ")} onClick={() => { closeCriticalAdminSurfaces(); setHistoryOpen((current) => !current); }}><HistoryIcon /><span>Histórico</span></button>
        <button type="button" className={["admin-dashboard-actions__button", "admin-dashboard-actions__button--blocks", isBlocksOpen ? "is-active" : ""].filter(Boolean).join(" ")} onClick={() => { setHistoryOpen(false); setStatementOpen(false); setIsFinanceHistoryOpen(false); setIsBlockedDetailsOpen(false); setIsBlocksOpen(true); }}><LockIcon /><span>Bloqueios</span></button>
        <button type="button" className={["admin-dashboard-actions__button", "admin-dashboard-actions__button--statement", statementOpen ? "is-active" : ""].filter(Boolean).join(" ")} onClick={() => { closeCriticalAdminSurfaces(); setStatementOpen((current) => !current); }}><StatementIcon /><span>Extrato</span></button>
      </div>

        {!isDesktop ? (
          <>
        <nav className="admin-mobile-bottom-bar" aria-label="Ações do admin">
          <button type="button" className={["admin-mobile-bottom-bar__item", "admin-mobile-bottom-bar__item--agenda", isMobileBookingsOpen ? "admin-mobile-bottom-bar__item--active" : ""].filter(Boolean).join(" ")} onClick={toggleMobileBookings}><CalendarIcon /><span>Agenda</span></button>
          <button type="button" className={["admin-mobile-bottom-bar__item", "admin-mobile-bottom-bar__item--history", historyOpen ? "admin-mobile-bottom-bar__item--active" : ""].filter(Boolean).join(" ")} onClick={toggleMobileHistory}><HistoryIcon /><span>Histórico</span></button>
          <button type="button" className={["admin-mobile-bottom-bar__item", "admin-mobile-bottom-bar__center", "admin-mobile-bottom-bar__item--blocks", isBlocksOpen ? "admin-mobile-bottom-bar__item--active" : ""].filter(Boolean).join(" ")} onClick={toggleMobileBlocks}><LockIcon /><span>Bloqueios</span></button>
          <button type="button" className={["admin-mobile-bottom-bar__item", "admin-mobile-bottom-bar__item--statement", statementOpen ? "admin-mobile-bottom-bar__item--active" : ""].filter(Boolean).join(" ")} onClick={toggleMobileStatement}><StatementIcon /><span>Extrato</span></button>
          <button type="button" className={["admin-mobile-bottom-bar__item", "admin-mobile-bottom-bar__item--profile", isProfileOpen ? "admin-mobile-bottom-bar__item--active" : ""].filter(Boolean).join(" ")} onClick={toggleMobileProfile}><ProfileIcon /><span>Perfil</span></button>
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
          </>
        ) : null}

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
          allowedMonths={[currentAllowedMonth, nextAllowedMonth]}
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
            events={allEvents}
            blockedDates={manualBlockedDates}
            scaleBlockedDates={scaleBlockedDates}
            unlockedScaleDates={unlockedScaleDates}
            blockedSlots={blockedSlots}
            onBack={() => setIsBlockedDetailsOpen(false)}
            onApplyManageChanges={handleApplyManagedBlockChanges}
          />
        ) : null}

        {isFinanceHistoryOpen ? (
          <AdminFinanceHistoryPage
            historyEvents={historyEvents}
            bookings={statementBookings}
            onBack={() => setIsFinanceHistoryOpen(false)}
          />
        ) : null}


        <AdminActionsMenu
          open={isActionsOpen}
          onClose={() => setIsActionsOpen(false)}
          onOpenHistory={() => { closeCriticalAdminSurfaces(); setIsActionsOpen(false); setHistoryOpen(true); }}
          onOpenStatement={() => { closeCriticalAdminSurfaces(); setIsActionsOpen(false); setStatementOpen(true); }}
          onOpenBlocks={() => { setIsActionsOpen(false); setHistoryOpen(false); setStatementOpen(false); setIsFinanceHistoryOpen(false); setIsBlockedDetailsOpen(false); setIsBlocksOpen(true); }}
          onOpenBlockedDetails={() => { setIsActionsOpen(false); setIsBlocksOpen(false); setHistoryOpen(false); setStatementOpen(false); setIsFinanceHistoryOpen(false); setIsBlockedDetailsOpen(true); }}
          onOpenFinancePage={() => { closeCriticalAdminSurfaces(); setIsActionsOpen(false); setHistoryOpen(true); setStatementOpen(true); }}
        />

        <AdminProfileModal
          open={isProfileOpen}
          blockedDates={manualBlockedDates}
          blockedSlots={blockedSlots}
          historyEvents={historyEvents}
          bookings={statementBookings}
          onClose={() => setIsProfileOpen(false)}
          onOpenBlocks={() => { setIsProfileOpen(false); setIsActionsOpen(false); setIsBlocksOpen(false); setHistoryOpen(false); setStatementOpen(false); setIsFinanceHistoryOpen(false); setIsBlockedDetailsOpen(true); }}
          onOpenFinance={() => { closeCriticalAdminSurfaces(); setIsProfileOpen(false); setHistoryOpen(true); setStatementOpen(true); }}
          onUnblockDay={(date) => handleUnblock([date], [])}
          onUnblockSlot={(slot) => handleUnblock([], [slot])}
        />

        <AdminHistoryHalfModal
          open={historyOpen}
          historyEvents={historyEvents}
          onClose={() => setHistoryOpen(false)}
        />

        <AdminStatementHalfModal
          open={statementOpen}
          bookings={statementBookings}
          onClose={() => setStatementOpen(false)}
        />
    </div>
  );
}
