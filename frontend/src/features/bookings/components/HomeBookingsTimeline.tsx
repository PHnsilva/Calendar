import { useEffect, useMemo, useState } from "react";
import { getCityTone } from "../../../data/allowed-cities";
import { useAdminRoute } from "../../admin/hooks/useAdminRoute";
import type { CalendarEvent } from "../../calendar/types";
import RouteSummaryCard from "../../maps/components/RouteSummaryCard";
import { useUserGeolocation } from "../../maps/hooks/useUserGeolocation";
import { buildStaticRouteMapUrl } from "../../maps/utils/map-formatters";

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

function getTodayIso() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  onOpenDayBooking: (date: string) => void;
  hideQuickBooking?: boolean;
  eyebrow?: string;
  title?: string;
  isAdminMode?: boolean;
};

export default function HomeBookingsTimeline({
  selectedDate,
  events,
  activeMonth,
  currentAllowedMonth,
  nextAllowedMonth,
  onChangeMonth,
  onQuickBooking,
  onOpenDayBooking,
  hideQuickBooking = false,
  eyebrow = "Agendamentos",
  title,
  isAdminMode = false,
}: HomeBookingsTimelineProps) {
  const resolvedTitle =
    title ??
    new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(toLocalDate(activeMonth));
  const todayIso = getTodayIso();
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const { coords, error: locationError, isLoading: isLocating, requestLocation } = useUserGeolocation();
  const routeQuery = useAdminRoute(
    activeEvent?.id ?? "",
    coords?.lat,
    coords?.lng,
    isAdminMode && Boolean(activeEvent) && Boolean(coords),
  );

  useEffect(() => {
    setActiveEvent(null);
  }, [selectedDate, activeMonth]);

  useEffect(() => {
    if (!isAdminMode || !activeEvent || coords || isLocating) return;
    requestLocation();
  }, [activeEvent, coords, isAdminMode, isLocating, requestLocation]);

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

  const primaryRoute = routeQuery.data?.primary ?? null;
  const staticMapUrl = buildStaticRouteMapUrl(primaryRoute);
  const monthBadge = getMonthBadgeParts(activeMonth);

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
                  <button
                    key={tab.key}
                    type="button"
                    className={[
                      "timeline-panel__tab",
                      activeMonth === tab.key ? "timeline-panel__tab--active" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => onChangeMonth(tab.key)}
                  >
                    {tab.label}
                  </button>
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

        <div className="timeline-panel__body">
          {grouped.length === 0 ? (
            <div className="timeline-card timeline-card--empty">
              <strong>Nenhum agendamento futuro</strong>
              <span>{isAdminMode ? "Nenhum atendimento retornado para os filtros atuais." : "Crie seu primeiro atendimento neste mês para começar."}</span>
            </div>
          ) : (
            grouped.map(({ date, items }) => {
              const label = formatDayLabel(date);
              const isSelectedGroup = selectedDate === date;
              const groupTone = items[0] ? getCityTone(items[0].city) : "violet";

              return (
                <div
                  key={date}
                  className={[
                    "timeline-group",
                    `timeline-group--tone-${groupTone}`,
                    isSelectedGroup ? "timeline-group--selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="timeline-group__date">
                    <strong>{label.day}</strong>
                    <span>{label.week}</span>
                  </div>

                  <div className="timeline-group__content">
                    {items.length === 0 ? (
                      <div className="timeline-card timeline-card--empty timeline-card--today-empty">
                        <strong>
                          {label.isToday ? "Sem agendamentos para hoje" : "Sem agendamentos para esse dia"}
                        </strong>
                        <span>
                          {label.isToday
                            ? "Use o botão abaixo para criar um novo atendimento."
                            : "Esse dia ainda não possui atendimentos na agenda."}
                        </span>
                      </div>
                    ) : (
                      items.map((item) => {
                        const tone = getCityTone(item.city);

                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={[
                              "timeline-card",
                              "timeline-card--button",
                              `timeline-card--tone-${tone}`,
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() => setActiveEvent(item)}
                          >
                            <div className="timeline-card__main">
                              <strong>{item.customerName ?? item.title}</strong>
                              <span className="timeline-card__time">{item.startTime}</span>
                            </div>

                            <small className="timeline-card__city">{item.city ?? "Cidade"}</small>
                            <small className="timeline-card__address">
                              {item.customerAddress ?? item.city ?? "Endereço não informado"}
                            </small>
                            <small className="timeline-card__meta">{item.serviceLabel ?? "Visita técnica"}</small>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {!hideQuickBooking && !isAdminMode ? (
          <footer className="timeline-panel__footer">
            <button
              type="button"
              className="timeline-panel__cta"
              onClick={onQuickBooking}
              aria-label="Novo agendamento"
              title="Novo agendamento"
            >
              <span className="timeline-panel__cta-icon" aria-hidden="true">+</span>
              <span className="timeline-panel__cta-label">Agendamentos</span>
            </button>
          </footer>
        ) : null}
      </section>

      {activeEvent ? (
        <div className="booking-detail-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="booking-detail-modal__backdrop"
            onClick={() => setActiveEvent(null)}
            aria-label="Fechar detalhes"
          />

          <div className="booking-detail-modal__card booking-detail-modal__card--route">
            <div className="booking-detail-modal__header">
              <div>
                <span className="booking-preview-modal__eyebrow">Detalhes do atendimento</span>
                <h3 className="booking-preview-modal__title">
                  {activeEvent.customerName ?? activeEvent.title}
                </h3>
              </div>

              <button
                type="button"
                className="booking-preview-modal__close"
                onClick={() => setActiveEvent(null)}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="booking-detail-modal__body">
              <div className="booking-detail-modal__row">
                <span>Data</span>
                <strong>{formatLongDate(activeEvent.date)}</strong>
              </div>
              <div className="booking-detail-modal__row">
                <span>Horário</span>
                <strong>
                  {activeEvent.startTime} - {activeEvent.endTime}
                </strong>
              </div>
              <div className="booking-detail-modal__row">
                <span>Cidade</span>
                <strong>{activeEvent.city ?? "Não informada"}</strong>
              </div>
              <div className="booking-detail-modal__row">
                <span>Endereço</span>
                <strong>{activeEvent.customerAddress ?? "Não informado"}</strong>
              </div>
              <div className="booking-detail-modal__row">
                <span>E-mail</span>
                <strong>{activeEvent.customerEmail ?? "Não informado"}</strong>
              </div>
              <div className="booking-detail-modal__row">
                <span>Telefone</span>
                <strong>{activeEvent.customerPhone ?? "Não informado"}</strong>
              </div>
            </div>

            {isAdminMode ? (
              <div className="booking-detail-modal__route">
                <div className="booking-detail-modal__route-header">
                  <span className="booking-preview-modal__eyebrow">Rota administrativa</span>
                  <button type="button" className="secondary-action" onClick={requestLocation}>
                    {coords ? "Atualizar localização" : "Usar minha localização"}
                  </button>
                </div>

                {locationError ? <p className="booking-form__feedback booking-form__feedback--error">{locationError}</p> : null}
                {isLocating ? <div className="booking-preview-modal__empty"><strong>Buscando sua localização...</strong></div> : null}
                {routeQuery.isLoading ? <div className="booking-preview-modal__empty"><strong>Calculando rota...</strong></div> : null}
                {routeQuery.error ? <p className="booking-form__feedback booking-form__feedback--error">{routeQuery.error instanceof Error ? routeQuery.error.message : "Não foi possível calcular a rota."}</p> : null}
                {primaryRoute ? <RouteSummaryCard route={primaryRoute} /> : null}
                {staticMapUrl ? (
                  <div className="route-map-card">
                    <img src={staticMapUrl} alt="Mapa da rota calculada" className="route-map-card__image" />
                    <small className="route-map-card__caption">Powered by Geoapify, OpenStreetMap e OpenMapTiles</small>
                  </div>
                ) : null}
                {!locationError && !isLocating && !routeQuery.isLoading && !primaryRoute ? (
                  <div className="booking-preview-modal__empty">
                    <strong>Rota indisponível</strong>
                    <p>Permita a localização para calcular distância e tempo estimado desse agendamento.</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
