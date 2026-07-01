import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useHomeBookingSelection } from "../../../app/home-booking-provider";
import { getCityTone } from "../../../data/allowed-cities";
import { apiClient } from "../../../lib/api-client";
import { normalizeApiErrorMessage } from "../../../lib/errors";
import {
  getManageTokenByEventId,
  getManageTokens,
  getPhoneVerificationChangedEventName,
  getStoredPhoneVerification,
  removeLocalCalendarEvent,
  saveLocalCalendarEvent,
  saveManageToken,
} from "../../../lib/storage";
import { useAdminRoute } from "../../admin/hooks/useAdminRoute";
import type { CalendarEvent } from "../../calendar/types";
import RouteSummaryCard from "../../maps/components/RouteSummaryCard";
import { useUserGeolocation } from "../../maps/hooks/useUserGeolocation";
import { useLocationPreview } from "../../maps/hooks/useLocationPreview";
import { buildMapsSearchUrl, buildStaticPlaceMapUrl, buildStaticRouteMapUrl } from "../../maps/utils/map-formatters";
import { usePublicBootstrap } from "../../public-config/hooks/usePublicBootstrap";
import { deleteBooking } from "../api/delete-booking";
import { getBookingByToken } from "../api/get-booking-by-token";
import { updateBooking } from "../api/update-booking";
import type { ServicoRequest, ServicoResponse } from "../../../types/api";

type TimelineGroup = {
  date: string;
  items: CalendarEvent[];
};

type HomeBookingsTimelineProps = {
  selectedDate: string;
  events: CalendarEvent[];
  activeMonth: string;
  currentAllowedMonth: string;
  nextAllowedMonth: string;
  onChangeMonth: (monthStart: string) => void;
  onQuickBooking: () => void;
  hideQuickBooking?: boolean;
  eyebrow?: string;
  title?: string;
  isAdminMode?: boolean;
  focusRequestId?: number;
};

type EditDraft = {
  date: string;
  time: string;
  addressLine: string;
  reservedPhonePassword: string;
};

function toLocalDate(dateString: string): Date {
  return new Date(`${dateString}T12:00:00`);
}

function toMonthStart(dateString: string) {
  return `${dateString.slice(0, 7)}-01`;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function pad(value: number) {
  return `${value}`.padStart(2, "0");
}

function getTodayIso() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toStartDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

function addMinutes(time: string, minutesToAdd: number): string {
  const total = timeToMinutes(time) + minutesToAdd;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

function formatDayLabel(dateString: string) {
  const date = toLocalDate(dateString);
  const todayIso = getTodayIso();
  const isToday = dateString === todayIso;

  return {
    day: isToday
      ? "Hoje"
      : new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(date),
    week: new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
      .format(date)
      .replace(".", ""),
    isToday,
  };
}

function formatLongDate(dateString: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(toLocalDate(dateString));
}

function getDetailDateCard(dateString: string, startTime: string, endTime: string) {
  const date = toLocalDate(dateString);
  return {
    day: new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(date),
    timeRange: `${startTime} - ${endTime}`,
  };
}

function getMonthBadgeParts(monthStart: string) {
  const date = toLocalDate(monthStart);
  return {
    shortMonth: new Intl.DateTimeFormat("pt-BR", { month: "short" })
      .format(date)
      .replace(".", "")
      .toUpperCase(),
    monthNumber: `${date.getMonth() + 1}`.padStart(2, "0"),
    year: `${date.getFullYear()}`,
  };
}

function mapServicoToCalendarEvent(servico: ServicoResponse): CalendarEvent {
  const customerName = `${servico.clientFirstName} ${servico.clientLastName}`.trim();
  return {
    id: servico.eventId,
    title: customerName || "Cliente",
    date: servico.start.slice(0, 10),
    startTime: servico.start.slice(11, 16),
    endTime: servico.end.slice(11, 16),
    city: servico.clientCity,
    customerName,
    customerAddress: servico.clientAddressLine,
    customerEmail: servico.clientEmail,
    customerPhone: servico.clientPhone,
    serviceLabel: servico.serviceType,
    status: "booked",
  };
}

function resolveManageToken(eventId: string): string {
  const direct = getManageTokenByEventId(eventId);
  if (direct) return direct;
  const tokens = getManageTokens();
  return tokens.length === 1 ? tokens[0] ?? "" : "";
}

function canManageEvent(event: CalendarEvent | null): boolean {
  if (!event) return false;
  const now = new Date();
  const limit = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  return toStartDateTime(event.date, event.startTime).getTime() >= limit.getTime();
}

function extractAddressDraft(servico: ServicoResponse): string {
  return servico.clientAddressLine || [
    [servico.clientStreet, servico.clientNumber].filter(Boolean).join(", "),
    servico.clientNeighborhood,
    `${servico.clientCity}/${servico.clientState}`,
    servico.clientCep ? `CEP: ${servico.clientCep}` : "",
  ].filter(Boolean).join(" - ");
}

function parseAddressLine(addressLine: string, fallback: ServicoResponse): Pick<ServicoRequest, "clientStreet" | "clientNumber" | "clientNeighborhood" | "clientCep" | "clientComplement"> {
  let value = addressLine.trim();
  const cepMatch = value.match(/CEP\s*:?\s*([0-9]{5}-?[0-9]{3})/i);
  const cep = cepMatch?.[1]?.replace(/\D/g, "") || fallback.clientCep;
  value = value.replace(/CEP\s*:?\s*[0-9]{5}-?[0-9]{3}/i, "").trim();

  const citySuffix = ` - ${fallback.clientCity}/${fallback.clientState}`;
  if (value.endsWith(citySuffix)) {
    value = value.slice(0, -citySuffix.length).trim();
  }

  const parts = value.split(" - ").map((part) => part.trim()).filter(Boolean);
  const firstPart = parts[0] ?? "";
  let clientStreet = fallback.clientStreet;
  let clientNumber = fallback.clientNumber;

  if (firstPart.includes(",")) {
    const chunks = firstPart.split(",");
    clientNumber = chunks.pop()?.trim() || fallback.clientNumber;
    clientStreet = chunks.join(",").trim() || fallback.clientStreet;
  } else if (firstPart) {
    clientStreet = firstPart;
  }

  return {
    clientStreet,
    clientNumber,
    clientNeighborhood: parts[1] ?? fallback.clientNeighborhood,
    clientCep: cep,
    clientComplement: fallback.clientComplement ?? "",
  };
}

function buildUpdatePayload(servico: ServicoResponse, draft: EditDraft): ServicoRequest {
  const parsedAddress = parseAddressLine(draft.addressLine, servico);
  return {
    serviceType: servico.serviceType,
    serviceNotes: servico.serviceNotes || "Observacao detalhada nao informada.",
    date: draft.date,
    time: draft.time,
    clientFirstName: servico.clientFirstName,
    clientLastName: servico.clientLastName,
    clientEmail: servico.clientEmail,
    clientPhone: servico.clientPhone,
    clientCity: servico.clientCity,
    clientState: servico.clientState,
    clientStreet: parsedAddress.clientStreet,
    clientNumber: parsedAddress.clientNumber,
    clientNeighborhood: parsedAddress.clientNeighborhood,
    clientCep: parsedAddress.clientCep,
    clientComplement: parsedAddress.clientComplement,
    reservedPhonePassword: draft.reservedPhonePassword.trim() || undefined,
  };
}

function DetailPortal({ children }: { children: ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

export default function HomeBookingsTimeline({
  selectedDate,
  events,
  activeMonth,
  currentAllowedMonth,
  nextAllowedMonth,
  onChangeMonth,
  onQuickBooking,
  hideQuickBooking = false,
  eyebrow = "Agendamentos",
  title,
  isAdminMode = false,
  focusRequestId = 0,
}: HomeBookingsTimelineProps) {
  const resolvedTitle =
    title ??
    new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(toLocalDate(activeMonth));
  const todayIso = getTodayIso();
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [bookingDetails, setBookingDetails] = useState<ServicoResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<EditDraft>({ date: "", time: "", addressLine: "", reservedPhonePassword: "" });
  const [editTimes, setEditTimes] = useState<string[]>([]);
  const [editLoadingTimes, setEditLoadingTimes] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(() => Boolean(getStoredPhoneVerification()));
  const { requestOpenProfile } = useHomeBookingSelection();
  const { data: bootstrap } = usePublicBootstrap(Boolean(activeEvent));
  const slotMinutes = bootstrap?.booking?.slotMinutes ?? 60;
  const { coords, error: locationError, isLoading: isLocating, requestLocation } = useUserGeolocation();
  const routeQuery = useAdminRoute(
    activeEvent?.id ?? "",
    coords?.lat,
    coords?.lng,
    isAdminMode && Boolean(activeEvent) && Boolean(coords),
  );

  const manageToken = activeEvent && !isAdminMode ? resolveManageToken(activeEvent.id) : "";
  const canManage = !isAdminMode && canManageEvent(activeEvent);

  useEffect(() => {
    if (isAdminMode) return;

    const updatePhoneVerification = () => {
      setPhoneVerified(Boolean(getStoredPhoneVerification()));
    };

    window.addEventListener(getPhoneVerificationChangedEventName(), updatePhoneVerification);
    window.addEventListener("storage", updatePhoneVerification);

    return () => {
      window.removeEventListener(getPhoneVerificationChangedEventName(), updatePhoneVerification);
      window.removeEventListener("storage", updatePhoneVerification);
    };
  }, [isAdminMode]);

  useEffect(() => {
    setActiveEvent(null);
    setBookingDetails(null);
    setEditOpen(false);
    setCancelOpen(false);
    setDetailError(null);
  }, [selectedDate, activeMonth]);

  useEffect(() => {
    if (!isAdminMode || !activeEvent || coords || isLocating) return;
    requestLocation();
  }, [activeEvent, coords, isAdminMode, isLocating, requestLocation]);

  useEffect(() => {
    if (!activeEvent || isAdminMode) return;
    if (!manageToken) {
      setBookingDetails(null);
      setDetailError("Não foi possível localizar o código de acesso deste agendamento neste navegador.");
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    getBookingByToken(manageToken)
      .then((response) => {
        if (cancelled) return;
        setBookingDetails(response);
        saveManageToken(manageToken, response.eventId);
        setEditDraft({
          date: response.start.slice(0, 10),
          time: response.start.slice(11, 16),
          addressLine: extractAddressDraft(response),
          reservedPhonePassword: "",
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setBookingDetails(null);
        setDetailError(normalizeApiErrorMessage(error, { context: "bookingDetails" }));
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeEvent, isAdminMode, manageToken]);

  useEffect(() => {
    if (!editOpen || !bookingDetails) return;
    let cancelled = false;
    setEditLoadingTimes(true);
    setEditError(null);
    apiClient<Array<{ startTime?: string; start?: string } | string>>("/api/servicos/available", {
      method: "GET",
      query: {
        date: editDraft.date,
        slotMinutes,
        city: bookingDetails.clientCity,
      },
    })
      .then((response) => {
        if (cancelled) return;
        const times = (Array.isArray(response) ? response : [])
          .map((item) => typeof item === "string" ? item : item.startTime ?? item.start ?? "")
          .filter(Boolean)
          .map((value) => value.slice(0, 5))
          .sort();
        setEditTimes(times);
        if (!times.includes(editDraft.time) && times.length > 0) {
          setEditDraft((current) => ({ ...current, time: times[0] ?? current.time }));
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setEditTimes([]);
        setEditError(normalizeApiErrorMessage(error, { context: "availability" }));
      })
      .finally(() => {
        if (!cancelled) setEditLoadingTimes(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingDetails, editDraft.date, editDraft.time, editOpen, slotMinutes]);

  const tabs = useMemo(
    () =>
      Array.from(new Set([currentAllowedMonth, nextAllowedMonth])).map((monthStart) => ({
        key: monthStart,
        label: new Intl.DateTimeFormat("pt-BR", { month: "short" })
          .format(toLocalDate(monthStart))
          .replace(".", ""),
      })),
    [currentAllowedMonth, nextAllowedMonth],
  );

  const grouped = useMemo<TimelineGroup[]>(() => {
    const monthEvents = events
      .filter((event) => event.date >= todayIso)
      .filter((event) => toMonthStart(event.date) === activeMonth)
      .sort((a, b) => {
        const byDate = a.date.localeCompare(b.date);
        if (byDate !== 0) return byDate;
        return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      });

    const map = new Map<string, CalendarEvent[]>();
    for (const event of monthEvents) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }

    const normalizedSelectedDate = selectedDate && selectedDate.length >= 10 ? selectedDate : "";
    const baseDate =
      normalizedSelectedDate &&
      toMonthStart(normalizedSelectedDate) === activeMonth &&
      normalizedSelectedDate >= todayIso
        ? normalizedSelectedDate
        : activeMonth === currentAllowedMonth
          ? todayIso
          : activeMonth;

    if (!map.has(baseDate) && toMonthStart(baseDate) === activeMonth) {
      map.set(baseDate, []);
    }

    return Array.from(map.entries())
      .filter(([date]) => date >= baseDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({ date, items }));
  }, [events, activeMonth, currentAllowedMonth, selectedDate, todayIso]);

  const timelineBodyRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!selectedDate) return;
    timelineBodyRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [selectedDate, focusRequestId]);

  const placeAddress = activeEvent?.customerAddress ?? "";
  const placeCity = activeEvent?.city ?? "";
  const locationPreview = useLocationPreview(placeAddress, placeCity, Boolean(activeEvent));
  const placeMapUrl = buildStaticPlaceMapUrl(locationPreview.data?.latitude, locationPreview.data?.longitude);
  const mapsSearchUrl = buildMapsSearchUrl(placeAddress, placeCity);
  const primaryRoute = routeQuery.data?.primary ?? null;
  const staticMapUrl = buildStaticRouteMapUrl(primaryRoute);
  const detailDateCard = activeEvent ? getDetailDateCard(activeEvent.date, activeEvent.startTime, activeEvent.endTime) : null;
  const monthBadge = getMonthBadgeParts(activeMonth);

  function requirePhoneVerification() {
    if (isAdminMode || phoneVerified) return false;

    const phone = activeEvent?.customerPhone?.trim();
    if (phone) {
      window.sessionStorage.setItem("calendar.recovery.prefillPhone", phone);
    }

    requestOpenProfile();
    return true;
  }

  function handleEditRequest() {
    if (requirePhoneVerification()) return;
    setEditOpen(true);
  }

  function handleCancelRequest() {
    if (requirePhoneVerification()) return;
    setCancelOpen(true);
  }

  async function handleSaveEdit() {
    if (!activeEvent || !bookingDetails || !manageToken) return;
    try {
      setActionLoading(true);
      setEditError(null);
      const payload = buildUpdatePayload(bookingDetails, editDraft);
      const updated = await updateBooking({ eventId: activeEvent.id, token: manageToken, payload });
      const updatedEvent = mapServicoToCalendarEvent(updated);
      saveLocalCalendarEvent(updatedEvent);
      saveManageToken(manageToken, updated.eventId);
      setActiveEvent(updatedEvent);
      setBookingDetails(updated);
      setEditOpen(false);
    } catch (error) {
      setEditError(normalizeApiErrorMessage(error, { context: "editBooking" }));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmCancel() {
    if (!activeEvent || !manageToken) return;
    try {
      setActionLoading(true);
      setDetailError(null);
      await deleteBooking({ eventId: activeEvent.id, token: manageToken });
      removeLocalCalendarEvent(activeEvent.id);
      setCancelOpen(false);
      setActiveEvent(null);
      setBookingDetails(null);
    } catch (error) {
      setDetailError(normalizeApiErrorMessage(error, { context: "cancelBooking" }));
    } finally {
      setActionLoading(false);
    }
  }

  const detailContent = activeEvent ? (
    <DetailPortal>
      <div className="booking-detail-modal booking-detail-modal--centered" role="dialog" aria-modal="true">
        <button type="button" className="booking-detail-modal__backdrop" onClick={() => setActiveEvent(null)} aria-label="Fechar detalhes" />
        <div className="booking-detail-modal__card booking-detail-modal__card--centered booking-detail-modal__card--route">
          <div className="booking-detail-modal__header">
            <div>
              <span className="booking-preview-modal__eyebrow">Detalhes do atendimento</span>
              <h3 className="booking-preview-modal__title">{activeEvent.customerName ?? activeEvent.title}</h3>
              <p className="booking-detail-modal__subtitle">{activeEvent.serviceLabel ?? "Visita técnica"}</p>
            </div>
            <button type="button" className="booking-preview-modal__close" onClick={() => setActiveEvent(null)} aria-label="Fechar">×</button>
          </div>

          <div className="booking-detail-modal__hero">
            <div className="booking-detail-modal__hero-main">
              <span className="booking-detail-modal__status-pill">{isAdminMode ? "Admin" : activeEvent.serviceLabel ?? "Atendimento"}</span>
              {!isAdminMode ? (
                <div className="booking-detail-modal__notice booking-detail-modal__notice--inline">
                  <strong>
                    {canManage
                      ? "Você ainda pode editar ou cancelar este atendimento."
                      : "Esse atendimento só pode ser alterado com pelo menos 2 horas de antecedência."}
                  </strong>
                  {!manageToken ? <span>{detailError ?? "Não foi possível localizar o código de acesso deste agendamento neste navegador."}</span> : null}
                  {manageToken && detailError && !detailLoading ? <span>{detailError}</span> : null}
                </div>
              ) : null}
              <div className="booking-detail-modal__hero-card">
                <div className="booking-detail-modal__hero-media">
                  {placeMapUrl || staticMapUrl ? (
                    <img src={placeMapUrl || staticMapUrl} alt="Mapa do agendamento" className="booking-detail-modal__hero-image" />
                  ) : (
                    <div className="booking-detail-modal__hero-fallback">
                      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M24 25.5C27.3137 25.5 30 22.8137 30 19.5C30 16.1863 27.3137 13.5 24 13.5C20.6863 13.5 18 16.1863 18 19.5C18 22.8137 20.6863 25.5 24 25.5Z" stroke="currentColor" strokeWidth="2.4" />
                        <path d="M24 40.5C24 40.5 34.5 31.3788 34.5 21C34.5 15.201 29.799 10.5 24 10.5C18.201 10.5 13.5 15.201 13.5 21C13.5 31.3788 24 40.5 24 40.5Z" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
                {detailDateCard ? (
                  <div className="booking-detail-modal__date-card">
                    <strong>{detailDateCard.day}</strong>
                    <span>{detailDateCard.month}</span>
                    <small>{detailDateCard.timeRange}</small>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <section className="booking-detail-modal__map-panel">
            <div className="booking-detail-modal__map-header">
              <div>
                <span className="booking-preview-modal__eyebrow">Local do serviço</span>
                <h4 className="booking-detail-modal__map-title">{activeEvent.customerAddress ?? "Endereço não informado"}</h4>
              </div>
              {mapsSearchUrl ? (
                <a className="secondary-action booking-detail-modal__map-link" href={mapsSearchUrl} target="_blank" rel="noreferrer">
                  Abrir no mapa
                </a>
              ) : null}
            </div>

            {locationPreview.isLoading ? <div className="booking-preview-modal__empty"><strong>Buscando localização do endereço...</strong></div> : null}
            {locationPreview.error ? <p className="booking-form__feedback booking-form__feedback--error">{normalizeApiErrorMessage(locationPreview.error, { context: "address", fallbackMessage: "Não foi possível localizar o endereço no mapa." })}</p> : null}
            {!locationPreview.isLoading && placeMapUrl ? (
              <div className="route-map-card route-map-card--place">
                <img src={placeMapUrl} alt="Mapa do endereço do atendimento" className="route-map-card__image" />
                <small className="route-map-card__caption">Powered by Geoapify, OpenStreetMap e OpenMapTiles</small>
              </div>
            ) : null}
            {!locationPreview.isLoading && !placeMapUrl ? (
              <div className="booking-detail-modal__map-empty">
                <strong>Mapa indisponível no momento</strong>
                <span>O endereço continua disponível abaixo e pode ser aberto em um aplicativo de mapas.</span>
              </div>
            ) : null}
          </section>

          <div className="booking-detail-modal__grid">
            <section className="booking-detail-modal__section">
              <h4>Agenda</h4>
              <div className="booking-detail-modal__body">
                <div className="booking-detail-modal__row"><span>Data</span><strong>{formatLongDate(activeEvent.date)}</strong></div>
                <div className="booking-detail-modal__row"><span>Horário</span><strong>{activeEvent.startTime} - {activeEvent.endTime}</strong></div>
                <div className="booking-detail-modal__row"><span>Cidade</span><strong>{activeEvent.city ?? "Não informada"}</strong></div>
              </div>
            </section>
            <section className="booking-detail-modal__section">
              <h4>Cliente</h4>
              <div className="booking-detail-modal__body">
                <div className="booking-detail-modal__row booking-detail-modal__row--location"><span>Endereço</span><strong>{activeEvent.customerAddress ?? "Não informado"}</strong></div>
                <div className="booking-detail-modal__row"><span>E-mail</span><strong>{activeEvent.customerEmail ?? "Não informado"}</strong></div>
                <div className="booking-detail-modal__row"><span>Telefone</span><strong>{activeEvent.customerPhone ?? "Não informado"}</strong></div>
              </div>
            </section>
          </div>

          {isAdminMode ? (
            <div className="booking-detail-modal__route">
              <div className="booking-detail-modal__route-header">
                <div>
                  <span className="booking-preview-modal__eyebrow">Rota administrativa</span>
                  <h4 className="booking-detail-modal__map-title">Deslocamento até o serviço</h4>
                </div>
                <button type="button" className="secondary-action" onClick={requestLocation}>
                  {coords ? "Atualizar localização" : "Usar minha localização"}
                </button>
              </div>
              {locationError ? <p className="booking-form__feedback booking-form__feedback--error">{locationError}</p> : null}
              {isLocating ? <div className="booking-preview-modal__empty"><strong>Buscando sua localização...</strong></div> : null}
              {routeQuery.isLoading ? <div className="booking-preview-modal__empty"><strong>Calculando rota...</strong></div> : null}
              {routeQuery.error ? <p className="booking-form__feedback booking-form__feedback--error">{normalizeApiErrorMessage(routeQuery.error, { context: "route" })}</p> : null}
              {primaryRoute ? <RouteSummaryCard route={primaryRoute} /> : null}
              {staticMapUrl ? <div className="route-map-card"><img src={staticMapUrl} alt="Mapa da rota calculada" className="route-map-card__image" /><small className="route-map-card__caption">Powered by Geoapify, OpenStreetMap e OpenMapTiles</small></div> : null}
            </div>
          ) : null}

          {!isAdminMode ? (
            <div className="booking-detail-modal__actions">
              <button type="button" className="secondary-action" onClick={handleEditRequest} disabled={!canManage || !manageToken || detailLoading}>Editar</button>
              <button type="button" className="secondary-action booking-detail-modal__danger" onClick={handleCancelRequest} disabled={!canManage || !manageToken || detailLoading}>Cancelar</button>
              <button type="button" className="primary-action" onClick={() => setActiveEvent(null)}>Fechar</button>
            </div>
          ) : null}

          {editOpen ? (
            <div className="booking-detail-modal__overlay" role="dialog" aria-modal="true">
              <button type="button" className="booking-detail-modal__overlay-backdrop" onClick={() => setEditOpen(false)} aria-label="Fechar edição" />
              <div className="booking-detail-modal__overlay-card">
                <div className="booking-detail-modal__header booking-detail-modal__header--compact">
                  <div>
                    <span className="booking-preview-modal__eyebrow">Editar atendimento</span>
                    <h3 className="booking-preview-modal__title">Escolha nova data e horário</h3>
                  </div>
                  <button type="button" className="booking-preview-modal__close" onClick={() => setEditOpen(false)} aria-label="Fechar edição">×</button>
                </div>
                <div className="booking-detail-modal__edit-grid">
                  <label className="booking-detail-modal__field booking-detail-modal__field--full"><span>Senha da equipe</span><input type="password" value={editDraft.reservedPhonePassword} placeholder="Somente admin/prestador" onChange={(event) => setEditDraft((current) => ({ ...current, reservedPhonePassword: event.target.value }))} /></label>
                  <label className="booking-detail-modal__field"><span>Data</span><input type="date" value={editDraft.date} min={todayIso} onChange={(event) => setEditDraft((current) => ({ ...current, date: event.target.value }))} /></label>
                  <label className="booking-detail-modal__field"><span>Horário</span><select value={editDraft.time} onChange={(event) => setEditDraft((current) => ({ ...current, time: event.target.value }))} disabled={editLoadingTimes || editTimes.length === 0}>{editTimes.map((time) => <option key={time} value={time}>{time} - {addMinutes(time, slotMinutes)}</option>)}</select></label>
                  <label className="booking-detail-modal__field"><span>Cidade</span><input type="text" value={bookingDetails?.clientCity ?? activeEvent.city ?? ""} readOnly /></label>
                  <label className="booking-detail-modal__field booking-detail-modal__field--full"><span>Endereço</span><textarea rows={3} value={editDraft.addressLine} onChange={(event) => setEditDraft((current) => ({ ...current, addressLine: event.target.value }))} /></label>
                </div>
                <p className="booking-detail-modal__helper">O endereço fica em um único campo na edição. O complemento permanece como está e não pode ser alterado aqui.</p>
                {editError ? <p className="booking-form__feedback booking-form__feedback--error">{editError}</p> : null}
                <div className="booking-detail-modal__actions booking-detail-modal__actions--overlay">
                  <button type="button" className="secondary-action" onClick={() => setEditOpen(false)}>Voltar</button>
                  <button type="button" className="primary-action" onClick={handleSaveEdit} disabled={actionLoading || !editDraft.date || !editDraft.time || !editDraft.addressLine.trim()}>Salvar edição</button>
                </div>
              </div>
            </div>
          ) : null}

          {cancelOpen ? (
            <div className="booking-detail-modal__overlay" role="dialog" aria-modal="true">
              <button type="button" className="booking-detail-modal__overlay-backdrop" onClick={() => setCancelOpen(false)} aria-label="Fechar confirmação" />
              <div className="booking-detail-modal__overlay-card booking-detail-modal__overlay-card--narrow">
                <div className="booking-detail-modal__header booking-detail-modal__header--compact">
                  <div>
                    <span className="booking-preview-modal__eyebrow">Confirmação</span>
                    <h3 className="booking-preview-modal__title">Cancelar este atendimento?</h3>
                  </div>
                  <button type="button" className="booking-preview-modal__close" onClick={() => setCancelOpen(false)} aria-label="Fechar confirmação">×</button>
                </div>
                <p className="booking-detail-modal__helper">Esse atendimento será cancelado e removido da sua agenda.</p>
                <div className="booking-detail-modal__actions booking-detail-modal__actions--overlay">
                  <button type="button" className="secondary-action" onClick={() => setCancelOpen(false)}>Voltar</button>
                  <button type="button" className="primary-action booking-detail-modal__danger-solid" onClick={handleConfirmCancel} disabled={actionLoading}>Confirmar cancelamento</button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </DetailPortal>
  ) : null;

  return (
    <>
      <section className="timeline-panel">
        <header className="timeline-panel__header timeline-panel__header--with-badge">
          <div className="timeline-panel__header-main">
            <div className="timeline-panel__title-block">
              <span className="timeline-panel__eyebrow">{eyebrow}</span>
              <h2 className="timeline-panel__title">{resolvedTitle}</h2>
            </div>
            {tabs.length > 1 ? (
              <div className="timeline-panel__tabs">
                {tabs.map((tab) => (
                  <button key={tab.key} type="button" className={["timeline-panel__tab", activeMonth === tab.key ? "timeline-panel__tab--active" : ""].filter(Boolean).join(" ")} onClick={() => onChangeMonth(tab.key)}>{tab.label}</button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="timeline-month-badge" aria-label={`Mês ${resolvedTitle}`}>
            <span className="timeline-month-badge__month">{monthBadge.shortMonth}</span>
            <strong className="timeline-month-badge__number">{monthBadge.monthNumber}</strong>
            <span className="timeline-month-badge__year">{monthBadge.year}</span>
          </div>
        </header>

        <div ref={timelineBodyRef} className="timeline-panel__body">
          {grouped.length === 0 ? (
            <div className={["timeline-card", "timeline-card--empty", !isAdminMode ? "timeline-card--empty-state" : ""].filter(Boolean).join(" ")}>
              {!isAdminMode ? (
                <div className="timeline-empty-emoji" aria-hidden="true">
                  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="32" cy="32" r="24" fill="url(#timeline-empty-gradient)" />
                    <circle cx="24" cy="28" r="2.8" fill="#5F4CA8" />
                    <circle cx="40" cy="28" r="2.8" fill="#5F4CA8" />
                    <path d="M23 41C25.6 37.8 29 36.2 32 36.2C35 36.2 38.4 37.8 41 41" stroke="#5F4CA8" strokeWidth="3" strokeLinecap="round" />
                    <defs>
                      <linearGradient id="timeline-empty-gradient" x1="16" y1="14" x2="48" y2="50" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FFD66B" />
                        <stop offset="1" stopColor="#FFB54D" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              ) : null}
              <strong>{isAdminMode ? "Nenhum agendamento futuro" : "Ainda não tem agendamentos"}</strong>
              <span>{isAdminMode ? "Nenhum atendimento retornado para os filtros atuais." : "Toque no botão + para criar seu primeiro atendimento."}</span>
            </div>
          ) : grouped.map(({ date, items }) => {
            const label = formatDayLabel(date);
            const isSelectedGroup = selectedDate === date;
            const groupTone = items[0] ? getCityTone(items[0].city) : "violet";
            return (
              <div key={date} className={["timeline-group", `timeline-group--tone-${groupTone}`, isSelectedGroup ? "timeline-group--selected" : ""].filter(Boolean).join(" ")}>
                <div className={["timeline-group__date", label.isToday ? "timeline-group__date--today" : ""].filter(Boolean).join(" ")}><strong>{label.day}</strong><span>{label.week}</span></div>
                <div className="timeline-group__content">
                  {items.length === 0 ? (
                    <div className="timeline-card timeline-card--empty timeline-card--today-empty">
                      <strong>{label.isToday ? "Sem agendamentos para hoje" : "Sem agendamentos para esse dia"}</strong>
                      <span>{label.isToday ? "Use o botão abaixo para criar um novo atendimento." : "Esse dia ainda não possui atendimentos na agenda."}</span>
                    </div>
                  ) : items.map((item) => {
                    const tone = item.status === "blocked" ? "amber" : getCityTone(item.city);
                    return (
                      <button key={item.id} type="button" className={["timeline-card", "timeline-card--button", `timeline-card--tone-${tone}`].filter(Boolean).join(" ")} onClick={() => setActiveEvent(item)}>
                        <div className="timeline-card__main"><strong>{item.status === "blocked" ? item.title : item.customerName ?? item.title}</strong><span className="timeline-card__time">{item.startTime}</span></div>
                        <small className="timeline-card__city">{item.status === "blocked" ? "Agenda bloqueada" : item.city ?? "Cidade"}</small>
                        <small className="timeline-card__address">{item.customerAddress ?? item.city ?? "Endereço não informado"}</small>
                        <small className="timeline-card__meta">{item.serviceLabel ?? "Visita técnica"}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {!hideQuickBooking && !isAdminMode ? (
          <footer className="timeline-panel__footer">
            <button type="button" className="timeline-panel__cta" onClick={onQuickBooking} aria-label="Novo agendamento" title="Novo agendamento">
              <span className="timeline-panel__cta-icon" aria-hidden="true">+</span>
              <span className="timeline-panel__cta-label">Agendamentos</span>
            </button>
          </footer>
        ) : null}
      </section>
      {detailContent}
    </>
  );
}
