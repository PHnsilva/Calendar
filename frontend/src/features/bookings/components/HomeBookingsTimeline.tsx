import { useMemo, useState } from "react";
import type { CalendarEvent } from "../../calendar/types";

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

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatDayLabel(dateString: string) {
  const date = toLocalDate(dateString);
  const todayIso = toIsoDate(new Date());
  const isToday = dateString === todayIso;

  return {
    day: isToday
      ? "Hoje"
      : new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(date),
    week: new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
      .format(date)
      .replace(".", ""),
  };
}

type HomeBookingsTimelineProps = {
  selectedDate: string;
  events: CalendarEvent[];
  activeMonth: string;
  currentAllowedMonth: string;
  nextAllowedMonth: string;
  onChangeMonth: (monthStart: string) => void;
  onQuickBooking?: () => void;
  eyebrow?: string;
  title?: string;
  hideQuickBooking?: boolean;
};

export default function HomeBookingsTimeline({
  selectedDate,
  events,
  activeMonth,
  currentAllowedMonth,
  nextAllowedMonth,
  onChangeMonth,
  onQuickBooking,
  eyebrow = "Agendamentos",
  title,
  hideQuickBooking = false,
}: HomeBookingsTimelineProps) {
  const [activeCard, setActiveCard] = useState<CalendarEvent | null>(null);
  const todayIso = toIsoDate(new Date());

  const monthTitle = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
  }).format(toLocalDate(activeMonth));

  const tabs = [
    {
      key: currentAllowedMonth,
      label: new Intl.DateTimeFormat("pt-BR", { month: "short" })
        .format(toLocalDate(currentAllowedMonth))
        .replace(".", ""),
    },
    {
      key: nextAllowedMonth,
      label: new Intl.DateTimeFormat("pt-BR", { month: "short" })
        .format(toLocalDate(nextAllowedMonth))
        .replace(".", ""),
    },
  ];

  const grouped = useMemo(() => {
    const filtered = events
      .filter((event) => event.date >= todayIso)
      .filter((event) => toMonthStart(event.date) === activeMonth)
      .sort((a, b) => {
        const byDate = a.date.localeCompare(b.date);
        if (byDate !== 0) return byDate;
        return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      });

    const map = new Map<string, CalendarEvent[]>();

    for (const event of filtered) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }

    if (selectedDate.startsWith(activeMonth.slice(0, 7)) && selectedDate >= todayIso && !map.has(selectedDate)) {
      map.set(selectedDate, []);
    }

    return Array.from(map.entries()).sort(([dateA], [dateB]) => {
      if (dateA === selectedDate) return -1;
      if (dateB === selectedDate) return 1;
      return dateA.localeCompare(dateB);
    });
  }, [events, activeMonth, selectedDate, todayIso]);

  return (
    <>
      <section className="timeline-panel">
        <header className="timeline-panel__header">
          <div className="timeline-panel__title-block">
            <span className="timeline-panel__eyebrow">{eyebrow}</span>
            <h2 className="timeline-panel__title">{title ?? monthTitle}</h2>
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
              <strong>Sem agendamentos</strong>
              <span>Esse mês ainda não possui atendimentos futuros.</span>
            </div>
          ) : (
            grouped.map(([date, items]) => {
              const label = formatDayLabel(date);
              const isSelectedGroup = date === selectedDate;

              return (
                <div
                  key={date}
                  className={[
                    "timeline-group",
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
                      <div className="timeline-card timeline-card--empty timeline-card--placeholder">
                        <strong>Sem agendamentos para esse dia</strong>
                        <span>Escolha outro dia ou crie um novo atendimento.</span>
                      </div>
                    ) : (
                      items.map((item, index) => {
                        const clickable = Boolean(item.customerName || item.addressLine || item.email || item.phone);
                        const className = [
                          "timeline-card",
                          index === 0 ? "timeline-card--primary" : "timeline-card--secondary",
                          clickable ? "timeline-card--button" : "",
                        ]
                          .filter(Boolean)
                          .join(" ");

                        const content = (
                          <>
                            <div className="timeline-card__main">
                              <strong>{item.title}</strong>
                              <span>{item.startTime}</span>
                            </div>

                            {item.customerName ? <small>{item.customerName}</small> : null}
                            {item.addressLine ? <p className="timeline-card__address">{item.addressLine}</p> : null}
                            {!item.customerName && !item.addressLine ? <small>{item.city ?? "Atendimento"}</small> : null}
                          </>
                        );

                        if (clickable) {
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className={className}
                              onClick={() => setActiveCard(item)}
                            >
                              {content}
                            </button>
                          );
                        }

                        return (
                          <div key={item.id} className={className}>
                            {content}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {!hideQuickBooking && onQuickBooking ? (
          <button
            type="button"
            className="timeline-panel__fab"
            onClick={onQuickBooking}
            aria-label="Novo agendamento"
            title="Novo agendamento"
          >
            +
          </button>
        ) : null}
      </section>

      {activeCard ? (
        <div className="timeline-detail-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="timeline-detail-modal__backdrop"
            onClick={() => setActiveCard(null)}
            aria-label="Fechar detalhes"
          />
          <div className="timeline-detail-modal__card">
            <div className="timeline-detail-modal__header">
              <div>
                <span className="timeline-panel__eyebrow">Detalhes do agendamento</span>
                <h3>{activeCard.customerName ?? activeCard.title}</h3>
              </div>
              <button type="button" className="timeline-detail-modal__close" onClick={() => setActiveCard(null)}>
                Fechar
              </button>
            </div>

            <div className="timeline-detail-modal__grid">
              <div className="timeline-detail-modal__item">
                <span>Cliente</span>
                <strong>{activeCard.customerName ?? "Não informado"}</strong>
              </div>
              <div className="timeline-detail-modal__item">
                <span>Serviço</span>
                <strong>{activeCard.title}</strong>
              </div>
              <div className="timeline-detail-modal__item">
                <span>Horário</span>
                <strong>{activeCard.date} · {activeCard.startTime} às {activeCard.endTime}</strong>
              </div>
              <div className="timeline-detail-modal__item timeline-detail-modal__item--full">
                <span>Endereço</span>
                <strong>{activeCard.addressLine ?? "Não informado"}</strong>
              </div>
              <div className="timeline-detail-modal__item">
                <span>E-mail</span>
                <strong>{activeCard.email ?? "Não informado"}</strong>
              </div>
              <div className="timeline-detail-modal__item">
                <span>Telefone</span>
                <strong>{activeCard.phone ?? "Não informado"}</strong>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
