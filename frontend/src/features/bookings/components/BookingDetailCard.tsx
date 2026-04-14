import { useEffect, useMemo, useState } from "react";
import type { BookingRecord } from "../../../types/booking";
import type { ServicoRequest } from "../../../types/api";
import { useAvailableSlots } from "../../calendar/hooks/useAvailableSlots";
import { BookingActions } from "./BookingActions";
import { BookingStatusBadge } from "./BookingStatusBadge";

function toDateInput(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function toTimeInput(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(11, 16);
}

function buildPayload(booking: BookingRecord, date: string, time: string): ServicoRequest {
  return {
    serviceType: booking.serviceType,
    date,
    time,
    clientFirstName: booking.clientFirstName,
    clientLastName: booking.clientLastName,
    clientEmail: booking.clientEmail,
    clientPhone: booking.clientPhone,
    clientCep: booking.clientCep,
    clientStreet: booking.clientStreet,
    clientNeighborhood: booking.clientNeighborhood,
    clientNumber: booking.clientNumber,
    clientComplement: booking.clientComplement,
    clientCity: booking.clientCity,
    clientState: booking.clientState,
  };
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short" }).format(parsed);
}

type BookingDetailCardProps = {
  booking: BookingRecord;
  onSave: (eventId: string, payload: ServicoRequest) => Promise<void> | void;
  onDelete: (eventId: string) => Promise<void> | void;
  isSaving: boolean;
  isDeleting: boolean;
};

export function BookingDetailCard({ booking, onSave, onDelete, isSaving, isDeleting }: BookingDetailCardProps) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(toDateInput(booking.start));
  const [time, setTime] = useState(toTimeInput(booking.start));

  useEffect(() => {
    setEditing(false);
    setDate(toDateInput(booking.start));
    setTime(toTimeInput(booking.start));
  }, [booking]);

  const slotsQuery = useAvailableSlots(date, 60, editing && Boolean(date));
  const slots = slotsQuery.data ?? [];
  const currentTimeExists = slots.some((slot) => slot.startTime === time);
  const canSave = Boolean(date && time);

  const payload = useMemo(() => buildPayload(booking, date, time), [booking, date, time]);

  return (
    <section
      style={{
        border: "1px solid rgba(15,23,42,0.12)",
        borderRadius: 20,
        padding: 18,
        background: "white",
        display: "grid",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
        <div>
          <h2 style={{ margin: 0 }}>{booking.serviceType || "Agendamento"}</h2>
          <p style={{ margin: "6px 0 0", opacity: 0.8 }}>{formatDateTime(booking.start)}</p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <div><strong>Cliente:</strong> {booking.clientFirstName} {booking.clientLastName}</div>
        <div><strong>Telefone:</strong> {booking.clientPhone}</div>
        <div><strong>E-mail:</strong> {booking.clientEmail}</div>
        <div><strong>Endereço:</strong> {booking.clientAddressLine || `${booking.clientStreet}, ${booking.clientNumber}`}</div>
        <div><strong>Cidade:</strong> {booking.clientCity} / {booking.clientState}</div>
      </div>

      {editing ? (
        <div style={{ display: "grid", gap: 12, borderTop: "1px solid rgba(15,23,42,0.08)", paddingTop: 16 }}>
          <strong>Reagendar</strong>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Nova data</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="booking-form__input" />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Novo horário</span>
            <select value={time} onChange={(event) => setTime(event.target.value)} className="booking-form__input">
              {currentTimeExists ? null : <option value={time}>{time || "Selecione"}</option>}
              {slots.map((slot) => (
                <option key={`${slot.date}-${slot.startTime}`} value={slot.startTime}>
                  {slot.label}
                </option>
              ))}
            </select>
          </label>

          {slotsQuery.isLoading ? <small>Carregando horários disponíveis...</small> : null}
          {slotsQuery.error ? <small style={{ color: "#b91c1c" }}>{slotsQuery.error.message}</small> : null}
        </div>
      ) : null}

      <BookingActions
        editing={editing}
        canSave={canSave}
        isSaving={isSaving}
        isDeleting={isDeleting}
        onStartEdit={() => setEditing(true)}
        onCancelEdit={() => {
          setEditing(false);
          setDate(toDateInput(booking.start));
          setTime(toTimeInput(booking.start));
        }}
        onSave={async () => {
          await onSave(booking.eventId, payload);
          setEditing(false);
        }}
        onDelete={() => onDelete(booking.eventId)}
      />
    </section>
  );
}
