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

function toEditableAddress(booking: BookingRecord): string {
  if (booking.clientStreet?.trim() && booking.clientNumber?.trim()) {
    return `${booking.clientStreet.trim()}, ${booking.clientNumber.trim()}`;
  }
  return booking.clientStreet?.trim() || booking.clientAddressLine || "";
}

function parseStreetAndNumber(addressLine: string, booking: BookingRecord) {
  const normalized = addressLine.trim();
  if (!normalized) {
    return {
      street: booking.clientStreet,
      number: booking.clientNumber,
    };
  }

  const parts = normalized.split(",");
  if (parts.length < 2) {
    return {
      street: normalized,
      number: booking.clientNumber,
    };
  }

  return {
    street: parts.slice(0, -1).join(",").trim() || booking.clientStreet,
    number: parts[parts.length - 1].trim() || booking.clientNumber,
  };
}

function buildPayload(booking: BookingRecord, date: string, time: string, addressLine: string): ServicoRequest {
  const parsedAddress = parseStreetAndNumber(addressLine, booking);
  return {
    serviceType: booking.serviceType,
    date,
    time,
    clientFirstName: booking.clientFirstName,
    clientLastName: booking.clientLastName,
    clientEmail: booking.clientEmail,
    clientPhone: booking.clientPhone,
    clientCep: booking.clientCep,
    clientStreet: parsedAddress.street,
    clientNeighborhood: booking.clientNeighborhood,
    clientNumber: parsedAddress.number,
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

function isManageAllowed(start: string): boolean {
  const parsed = new Date(start);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() - Date.now() > 2 * 60 * 60 * 1000;
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
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [date, setDate] = useState(toDateInput(booking.start));
  const [time, setTime] = useState(toTimeInput(booking.start));
  const [addressLine, setAddressLine] = useState(toEditableAddress(booking));

  useEffect(() => {
    setEditing(false);
    setConfirmingDelete(false);
    setDate(toDateInput(booking.start));
    setTime(toTimeInput(booking.start));
    setAddressLine(toEditableAddress(booking));
  }, [booking]);

  const canManage = isManageAllowed(booking.start);
  const disableReason = canManage
    ? ""
    : "Edição e cancelamento exigem pelo menos 2 horas de antecedência em relação ao início do atendimento.";

  const slotsQuery = useAvailableSlots(date, booking.clientCity, 60, editing && Boolean(date));
  const slots = slotsQuery.data ?? [];
  const currentTimeExists = slots.some((slot) => slot.startTime === time);
  const canSave = Boolean(date && time && addressLine.trim()) && canManage;

  const payload = useMemo(() => buildPayload(booking, date, time, addressLine), [booking, date, time, addressLine]);

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
          <strong>Editar atendimento</strong>
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

          <label style={{ display: "grid", gap: 6 }}>
            <span>Endereço</span>
            <input
              type="text"
              value={addressLine}
              onChange={(event) => setAddressLine(event.target.value)}
              className="booking-form__input"
              placeholder="Rua, número"
            />
          </label>

          <div style={{ display: "grid", gap: 6, fontSize: 14, opacity: 0.8 }}>
            <div><strong>Bairro:</strong> {booking.clientNeighborhood || "Não informado"}</div>
            <div><strong>CEP:</strong> {booking.clientCep || "Não informado"}</div>
            <div><strong>Cidade:</strong> {booking.clientCity} / {booking.clientState} (não pode ser alterada)</div>
            <div><strong>Complemento:</strong> {booking.clientComplement || "Não informado"} (somente leitura)</div>
          </div>

          {slotsQuery.isLoading ? <small>Carregando horários disponíveis...</small> : null}
          {slotsQuery.error ? <small style={{ color: "#b91c1c" }}>{slotsQuery.error.message}</small> : null}
        </div>
      ) : null}

      <BookingActions
        editing={editing}
        confirmingDelete={confirmingDelete}
        canSave={canSave}
        canManage={canManage}
        disableReason={disableReason}
        isSaving={isSaving}
        isDeleting={isDeleting}
        onStartEdit={() => {
          setConfirmingDelete(false);
          setEditing(true);
        }}
        onCancelEdit={() => {
          setEditing(false);
          setDate(toDateInput(booking.start));
          setTime(toTimeInput(booking.start));
          setAddressLine(toEditableAddress(booking));
        }}
        onSave={async () => {
          await onSave(booking.eventId, payload);
          setEditing(false);
        }}
        onAskDelete={() => {
          setEditing(false);
          setConfirmingDelete(true);
        }}
        onCancelDelete={() => setConfirmingDelete(false)}
        onDelete={async () => {
          await onDelete(booking.eventId);
          setConfirmingDelete(false);
        }}
      />
    </section>
  );
}
