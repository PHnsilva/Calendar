import { useEffect, useMemo, useState } from "react";
import type { CalendarEvent, CalendarSlot } from "../../calendar/types";
import type { HomeSelectedSlot } from "../../home/types";

type BookingFormModalProps = {
  open: boolean;
  selectedDate: string;
  selectedSlot: HomeSelectedSlot;
  events: CalendarEvent[];
  unavailableDates: string[];
  onClose: () => void;
};

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateString}T12:00:00`));
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number): string {
  const hours = `${Math.floor(value / 60)}`.padStart(2, "0");
  const minutes = `${value % 60}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

function buildSlots(
  date: string,
  dayEvents: CalendarEvent[],
  unavailable: boolean,
): CalendarSlot[] {
  if (unavailable) {
    return [];
  }

  const blockedStarts = new Set<string>();

  for (const event of dayEvents) {
    let cursor = timeToMinutes(event.startTime);
    const end = timeToMinutes(event.endTime);

    while (cursor < end) {
      blockedStarts.add(minutesToTime(cursor));
      cursor += 30;
    }
  }

  const slots: CalendarSlot[] = [];

  for (let minutes = 8 * 60; minutes < 18 * 60; minutes += 30) {
    if (minutes >= 12 * 60 && minutes < 13 * 60) {
      continue;
    }

    const startTime = minutesToTime(minutes);
    const endTime = minutesToTime(minutes + 30);
    const available = !blockedStarts.has(startTime);

    slots.push({
      date,
      startTime,
      endTime,
      available,
      label: `${startTime} - ${endTime}`,
    });
  }

  return slots;
}

export default function BookingFormModal({
  open,
  selectedDate,
  selectedSlot,
  events,
  unavailableDates,
  onClose,
}: BookingFormModalProps) {
  const dayEvents = useMemo(
    () => events.filter((event) => event.date === selectedDate),
    [events, selectedDate],
  );

  const isUnavailable = unavailableDates.includes(selectedDate);

  const slots = useMemo(
    () => buildSlots(selectedDate, dayEvents, isUnavailable),
    [selectedDate, dayEvents, isUnavailable],
  );

  const [draftSlot, setDraftSlot] = useState<HomeSelectedSlot>(selectedSlot);

  useEffect(() => {
    setDraftSlot(selectedSlot);
  }, [selectedSlot, selectedDate]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="booking-preview-modal" role="dialog" aria-modal="true">
      <button
        type="button"
        className="booking-preview-modal__backdrop"
        onClick={onClose}
        aria-label="Fechar modal"
      />

      <div className="booking-preview-modal__card">
        <div className="booking-preview-modal__header">
          <div>
            <span className="booking-preview-modal__eyebrow">Novo agendamento</span>
            <h3 className="booking-preview-modal__title">{formatDate(selectedDate)}</h3>
          </div>

          <button
            type="button"
            className="booking-preview-modal__close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="booking-preview-modal__body">
          <div className="booking-preview-modal__summary">
            <span>Agendamentos existentes no dia</span>
            <strong>
              {dayEvents.length}{" "}
              {dayEvents.length === 1 ? "agendamento" : "agendamentos"}
            </strong>
          </div>

          {isUnavailable ? (
            <div className="booking-preview-modal__empty">
              <strong>Dia indisponível</strong>
              <p>Escolha outro dia no calendário para iniciar um agendamento.</p>
            </div>
          ) : (
            <>
              <div className="booking-preview-modal__slots-header">
                <span>Horários disponíveis</span>
              </div>

              <div className="booking-preview-modal__slots-grid">
                {slots.map((slot) => {
                  const isSelected =
                    draftSlot?.date === slot.date &&
                    draftSlot.startTime === slot.startTime;

                  return (
                    <button
                      key={`${slot.date}-${slot.startTime}`}
                      type="button"
                      disabled={!slot.available}
                      className={[
                        "booking-slot",
                        slot.available ? "booking-slot--available" : "booking-slot--busy",
                        isSelected ? "booking-slot--selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() =>
                        slot.available
                          ? setDraftSlot({
                              date: slot.date,
                              startTime: slot.startTime,
                              endTime: slot.endTime,
                            })
                          : undefined
                      }
                    >
                      <strong>{slot.startTime}</strong>
                      <small>{slot.available ? "Disponível" : "Ocupado"}</small>
                    </button>
                  );
                })}
              </div>

              <div className="booking-preview-modal__summary">
                <span>Horário selecionado</span>
                <strong>
                  {draftSlot
                    ? `${draftSlot.startTime} - ${draftSlot.endTime ?? ""}`
                    : "Selecione um horário"}
                </strong>
              </div>
            </>
          )}
        </div>

        <div className="booking-preview-modal__footer">
          <button type="button" className="secondary-action" onClick={onClose}>
            Fechar
          </button>

          <button
            type="button"
            className="primary-action"
            disabled={!draftSlot || isUnavailable}
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}