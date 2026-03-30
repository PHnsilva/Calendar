import { useEffect, useMemo, useState } from "react";
import type { CalendarEvent } from "../../calendar/types";
import { normalizeCityTone } from "../../../data/allowed-cities";

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
    day: isToday ? "Hoje" : new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(date),
    week: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", ""),
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
  bookingPickMode?: boolean;
  isCollapsed?: boolean;
  onOpenDayBooking: (date: string) => void;
  showSelectedDayCta?: boolean;
};

export default function HomeBookingsTimeline({
  selectedDate,
  events,
  activeMonth,
  currentAllowedMonth,
  nextAllowedMonth,
  onChangeMonth,
  onQuickBooking,
  bookingPickMode = false,
  isCollapsed = false,
  onOpenDayBooking,
  showSelectedDayCta = true,
}: HomeBookingsTimelineProps) {
  const title = new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(toLocalDate(activeMonth));
  const todayIso = getTodayIso();
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    setActiveEvent(null);
  }, [selectedDate, activeMonth, bookingPickMode]);

  const tabs = [
    {
      key: currentAllowedMonth,
      label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(toLocalDate(currentAllowedMonth)).replace(".", ""),
    },
    {
      key: nextAllowedMonth,
      label: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(toLocalDate(nextAllowedMonth)).replace(".", ""),
    },
  ];

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

    const baseDate =
      selectedDate && toMonthStart(selectedDate) === activeMonth && selectedDate >= todayIso
        ? selectedDate
        : activeMonth === currentAllowedMonth
          ? todayIso
          : activeMonth;

    if (toMonthStart(baseDate) === activeMonth && !map.has(baseDate)) {
      map.set(baseDate, []);
    }

    return Array.from(map.entries())
      .filter(([date]) => date >= baseDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({ date, items }));
  }, [events, activeMonth, currentAllowedMonth, selectedDate, todayIso]);

  return (
    <>
      <section
        className={[
          "timeline-panel",
          bookingPickMode ? "timeline-panel--pick-mode" : "",
          isCollapsed ? "timeline-panel--collapsed" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <header className="timeline-panel__header">
          <div className="timeline-panel__title-block">
            <span className="timeline-panel__eyebrow">Agendamentos</span>
            <h2 className="timeline-panel__title">{title}</h2>
          </div>

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
        </header>

        <div className="timeline-panel__body">
          {grouped.length === 0 ? (
            <div className="timeline-card timeline-card--empty">
              <strong>Nenhum agendamento futuro</strong>
              <span>Esse mês ainda não possui atendimentos a partir da data selecionada.</span>
            </div>
          ) : (
            grouped.map(({ date, items }) => {
              const label = formatDayLabel(date);
              const isSelectedGroup = date === selectedDate;
              const dayTone = normalizeCityTone(items[0]?.city);

              return (
                <div
                  key={date}
                  className={[
                    "timeline-group",
                    isSelectedGroup ? "timeline-group--selected" : "",
                    `timeline-group--tone-${dayTone}`,
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
                        <strong>{label.isToday ? "Sem agendamentos para hoje" : "Sem agendamentos para esse dia"}</strong>
                        <span>
                          {label.isToday
                            ? "Use o botão abaixo para criar um novo atendimento."
                            : "Esse dia ainda não possui atendimentos visíveis na agenda."}
                        </span>
                      </div>
                    ) : (
                      items.map((item, index) => {
                        const tone = normalizeCityTone(item.city);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={[
                              "timeline-card",
                              index === 0 ? "timeline-card--primary" : "timeline-card--secondary",
                              "timeline-card--button",
                              `timeline-card--tone-${tone}`,
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() => setActiveEvent(item)}
                          >
                            <div className="timeline-card__main">
                              <strong>{item.customerName ?? item.title}</strong>
                              <span>{item.startTime}</span>
                            </div>

                            <small className="timeline-card__address">{item.customerAddress ?? item.city ?? "Endereço não informado"}</small>
                          </button>
                        );
                      })
                    )}

                    {isSelectedGroup && showSelectedDayCta ? (
                      <button type="button" className="timeline-day-cta" onClick={() => onOpenDayBooking(date)}>
                        <span className="timeline-day-cta__icon" aria-hidden="true">+</span>
                        <span>Agendar nesse dia</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          type="button"
          className="timeline-panel__fab"
          onClick={onQuickBooking}
          aria-label="Novo agendamento"
          title="Novo agendamento"
        >
          +
        </button>
      </section>

      {activeEvent ? (
        <div className="booking-detail-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="booking-detail-modal__backdrop"
            onClick={() => setActiveEvent(null)}
            aria-label="Fechar detalhes"
          />

          <div className="booking-detail-modal__card">
            <div className="booking-detail-modal__header">
              <div>
                <span className="booking-preview-modal__eyebrow">Detalhes do atendimento</span>
                <h3 className="booking-preview-modal__title">{activeEvent.customerName ?? activeEvent.title}</h3>
              </div>

              <button type="button" className="booking-preview-modal__close" onClick={() => setActiveEvent(null)} aria-label="Fechar">
                ×
              </button>
            </div>

            <div className="booking-detail-modal__body">
              <div className="booking-detail-modal__row"><span>Data</span><strong>{formatLongDate(activeEvent.date)}</strong></div>
              <div className="booking-detail-modal__row"><span>Horário</span><strong>{activeEvent.startTime} - {activeEvent.endTime}</strong></div>
              <div className="booking-detail-modal__row"><span>Endereço</span><strong>{activeEvent.customerAddress ?? "Não informado"}</strong></div>
              <div className="booking-detail-modal__row"><span>E-mail</span><strong>{activeEvent.customerEmail ?? "Não informado"}</strong></div>
              <div className="booking-detail-modal__row"><span>Telefone</span><strong>{activeEvent.customerPhone ?? "Não informado"}</strong></div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
