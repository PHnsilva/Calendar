import { useMemo, useState } from "react";
import { mapBookingStatus } from "../../../entities/booking";
import type { ServicoRequest, ServicoResponse } from "../../../types/api";
import { formatDateTime, isWithinTwoHours } from "../../../lib/dates";
import { resolveManageToken } from "../../../lib/storage";
import { BookingActions } from "./BookingActions";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { useBookingMutations } from "../hooks/useBookingMutations";

type BookingDetailCardProps = {
  booking: ServicoResponse;
};

function toFormState(booking: ServicoResponse): ServicoRequest {
  const start = new Date(booking.start);
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    serviceType: booking.serviceType,
    serviceNotes: booking.serviceNotes || "Observacao detalhada nao informada.",
    date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    time: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
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

export function BookingDetailCard({ booking }: BookingDetailCardProps) {
  const token = useMemo(() => resolveManageToken(booking), [booking]);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [form, setForm] = useState<ServicoRequest>(() => toFormState(booking));
  const { updateBooking, deleteBooking, isUpdating, isDeleting, updateError, deleteError } = useBookingMutations();

  const lockedByTime = isWithinTwoHours(booking.start);
  const canManage = Boolean(token) && !lockedByTime;

  const onChange = (field: keyof ServicoRequest, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitUpdate = async () => {
    if (!token) return;
    await updateBooking({ eventId: booking.eventId, token, payload: form });
    setIsEditing(false);
  };

  const submitDelete = async () => {
    if (!token) return;
    await deleteBooking({ eventId: booking.eventId, token });
    setConfirmCancel(false);
  };

  return (
    <section className="booking-detail">
      <div className="booking-detail__header">
        <div>
          <h2>{booking.serviceType}</h2>
          <p>{formatDateTime(booking.start)}</p>
        </div>
        <BookingStatusBadge status={mapBookingStatus(booking.status)} />
      </div>

      {lockedByTime ? <p className="booking-detail__notice">Alterações só podem ser feitas com pelo menos 2 horas de antecedência.</p> : null}
      {!token ? <p className="booking-detail__notice">Esse atendimento não tem token salvo neste navegador. Use a recuperação para restaurar o acesso.</p> : null}

      {isEditing ? (
        <div className="booking-detail__form">
          <label><span>Serviço</span><input value={form.serviceType} onChange={(e) => onChange("serviceType", e.target.value)} /></label>
          <label><span>Observação</span><textarea value={form.serviceNotes} onChange={(e) => onChange("serviceNotes", e.target.value)} /></label>
          <div className="booking-detail__form-grid">
            <label><span>Data</span><input type="date" value={form.date} onChange={(e) => onChange("date", e.target.value)} /></label>
            <label><span>Horário</span><input type="time" value={form.time} onChange={(e) => onChange("time", e.target.value)} /></label>
          </div>
          <div className="booking-detail__form-grid">
            <label><span>Nome</span><input value={form.clientFirstName} onChange={(e) => onChange("clientFirstName", e.target.value)} /></label>
            <label><span>Sobrenome</span><input value={form.clientLastName} onChange={(e) => onChange("clientLastName", e.target.value)} /></label>
          </div>
          <div className="booking-detail__form-grid">
            <label><span>E-mail</span><input value={form.clientEmail} onChange={(e) => onChange("clientEmail", e.target.value)} /></label>
            <label><span>Telefone</span><input value={form.clientPhone} onChange={(e) => onChange("clientPhone", e.target.value)} /></label>
          </div>
          <div className="booking-detail__form-grid">
            <label><span>CEP</span><input value={form.clientCep} onChange={(e) => onChange("clientCep", e.target.value)} /></label>
            <label><span>Número</span><input value={form.clientNumber} onChange={(e) => onChange("clientNumber", e.target.value)} /></label>
          </div>
          <label><span>Rua</span><input value={form.clientStreet} onChange={(e) => onChange("clientStreet", e.target.value)} /></label>
          <label><span>Bairro</span><input value={form.clientNeighborhood} onChange={(e) => onChange("clientNeighborhood", e.target.value)} /></label>
          <label><span>Complemento</span><input value={form.clientComplement ?? ""} onChange={(e) => onChange("clientComplement", e.target.value)} /></label>
          <div className="booking-detail__form-grid">
            <label><span>Cidade</span><input value={form.clientCity} readOnly /></label>
            <label><span>Estado</span><input value={form.clientState} readOnly /></label>
          </div>
          {updateError ? <p className="booking-detail__error">{(updateError as Error).message}</p> : null}
          <div className="booking-detail__actions">
            <button type="button" className="secondary-action" onClick={() => setIsEditing(false)}>Fechar edição</button>
            <button type="button" className="primary-action" onClick={() => void submitUpdate()} disabled={!canManage || isUpdating}>
              {isUpdating ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </div>
      ) : (
        <div className="booking-detail__content">
          <div className="booking-detail__section">
            <h3>Cliente</h3>
            <p>{booking.clientFirstName} {booking.clientLastName}</p>
            <p>{booking.clientEmail}</p>
            <p>{booking.clientPhone}</p>
          </div>
          <div className="booking-detail__section">
            <h3>Endereço</h3>
            <p>{booking.clientAddressLine}</p>
            <p>{booking.clientCity} - {booking.clientState}</p>
          </div>
        </div>
      )}

      {!isEditing ? <BookingActions canManage={canManage} onEdit={() => setIsEditing(true)} onCancel={() => setConfirmCancel(true)} /> : null}

      {confirmCancel ? (
        <div className="booking-detail__confirm">
          <p>Deseja cancelar este agendamento?</p>
          {deleteError ? <p className="booking-detail__error">{(deleteError as Error).message}</p> : null}
          <div className="booking-detail__actions">
            <button type="button" className="secondary-action" onClick={() => setConfirmCancel(false)}>Voltar</button>
            <button type="button" className="primary-action primary-action--danger" onClick={() => void submitDelete()} disabled={!canManage || isDeleting}>
              {isDeleting ? "Cancelando..." : "Confirmar cancelamento"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
