import { useMemo, useState } from "react";
import calendarIcon from "../../../assets/wireframes/icons/booking-meta-calendar.svg";
import clockIcon from "../../../assets/wireframes/icons/booking-meta-clock.svg";
import locationIcon from "../../../assets/wireframes/icons/booking-field-location.svg";
import serviceIcon from "../../../assets/wireframes/icons/booking-field-service.svg";
import userIcon from "../../../assets/wireframes/icons/booking-field-user.svg";
import phoneIcon from "../../../assets/wireframes/icons/booking-field-phone.svg";
import editIcon from "../../../assets/wireframes/icons/booking-action-pencil.svg";
import cancelIcon from "../../../assets/wireframes/icons/booking-action-cancel.svg";
import viewIcon from "../../../assets/wireframes/icons/booking-action-eye.svg";
import type { Booking } from "../../../entities/booking";
import type { ServicoRequest } from "../../../types/api";
import { formatDateTime, isWithinTwoHours } from "../../../lib/dates";
import { normalizeApiErrorMessage } from "../../../lib/errors";
import { removeLocalCalendarEvent, removeManageToken, resolveManageToken } from "../../../lib/storage";
import { BookingActions } from "./BookingActions";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { useBookingMutations } from "../hooks/useBookingMutations";

export type BookingDetailMode = "view" | "edit" | "cancel";

type BookingDetailCardProps = {
  booking: Booking;
  initialMode?: BookingDetailMode;
  onDeleted?: () => void;
};

function toFormState(booking: Booking): ServicoRequest {
  const start = booking.startsAt;
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    serviceType: booking.serviceType,
    serviceNotes: booking.serviceNotes || "Observacao detalhada nao informada.",
    date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    time: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    clientFirstName: booking.client.firstName,
    clientLastName: booking.client.lastName,
    clientEmail: booking.client.email ?? "",
    clientPhone: booking.client.phone ?? "",
    clientCep: booking.client.address.postalCode ?? "",
    clientStreet: booking.client.address.street ?? "",
    clientNeighborhood: booking.client.address.neighborhood ?? "",
    clientNumber: booking.client.address.number ?? "",
    clientComplement: booking.client.address.complement ?? undefined,
    clientCity: booking.client.address.city ?? "",
    clientState: booking.client.address.state ?? "",
  };
}

function DetailIcon({ src }: { src: string }) {
  return <img className="booking-detail__icon" src={src} alt="" aria-hidden="true" />;
}

function formatDateOnly(value: Date): string {
  return value.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTimeOnly(value: Date): string {
  return value.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function BookingDetailCardContent({ booking, initialMode = "view", onDeleted }: BookingDetailCardProps) {
  const token = useMemo(
    () => resolveManageToken({ eventId: booking.id, manageToken: booking.manageToken ?? undefined }),
    [booking.id, booking.manageToken],
  );
  const [isEditing, setIsEditing] = useState(initialMode === "edit");
  const [confirmCancel, setConfirmCancel] = useState(initialMode === "cancel");
  const [form, setForm] = useState<ServicoRequest>(() => toFormState(booking));
  const [reservedPhonePassword, setReservedPhonePassword] = useState("");
  const { updateBooking, deleteBooking, isUpdating, isDeleting, updateError, deleteError } = useBookingMutations();

  const lockedByTime = isWithinTwoHours(booking.startsAt);
  const isCancelled = booking.status.code === "cancelled";
  const canManage = Boolean(token) && !lockedByTime && !isCancelled;

  const onChange = (field: keyof ServicoRequest, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitUpdate = async () => {
    if (!token) return;
    try {
      await updateBooking({
        eventId: booking.id,
        token,
        payload: {
          ...form,
          reservedPhonePassword: reservedPhonePassword.trim() || undefined,
        },
      });
      setIsEditing(false);
    } catch {
      // React Query exposes the normalized mutation error below.
    }
  };

  const submitDelete = async () => {
    if (!token) return;
    try {
      await deleteBooking({ eventId: booking.id, token });
      removeManageToken(token, booking.id);
      removeLocalCalendarEvent(booking.id);
      setConfirmCancel(false);
      onDeleted?.();
    } catch {
      // React Query exposes the normalized mutation error below.
    }
  };

  return (
    <section className="booking-detail">
      <div className="booking-detail__header">
        <div>
          <h2>{booking.serviceType}</h2>
          <p>{formatDateTime(booking.startsAt)}</p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      {lockedByTime && !isCancelled ? <p className="booking-detail__notice">Alteracoes so podem ser feitas com pelo menos 2 horas de antecedencia.</p> : null}
      {isCancelled ? <p className="booking-detail__notice">Este agendamento ja foi cancelado e nao pode mais ser alterado.</p> : null}
      {!token ? <p className="booking-detail__notice">Esse atendimento nao tem codigo de acesso salvo neste navegador. Use a recuperacao para restaurar o acesso.</p> : null}

      {isEditing ? (
        <div className="booking-detail__form">
          <label><span>Servico</span><input value={form.serviceType} onChange={(e) => onChange("serviceType", e.target.value)} /></label>
          <label><span>Observacao</span><textarea value={form.serviceNotes} onChange={(e) => onChange("serviceNotes", e.target.value)} /></label>
          <div className="booking-detail__form-grid">
            <label><span>Data</span><input type="date" value={form.date} onChange={(e) => onChange("date", e.target.value)} /></label>
            <label><span>Horario</span><input type="time" value={form.time} onChange={(e) => onChange("time", e.target.value)} /></label>
          </div>
          <div className="booking-detail__form-grid">
            <label><span>Nome</span><input value={form.clientFirstName} onChange={(e) => onChange("clientFirstName", e.target.value)} /></label>
            <label><span>Sobrenome</span><input value={form.clientLastName} onChange={(e) => onChange("clientLastName", e.target.value)} /></label>
          </div>
          <div className="booking-detail__form-grid">
            <label><span>E-mail</span><input value={form.clientEmail} onChange={(e) => onChange("clientEmail", e.target.value)} /></label>
            <label><span>Telefone</span><input value={form.clientPhone} onChange={(e) => onChange("clientPhone", e.target.value)} /></label>
          </div>
          <label><span>Senha da equipe</span><input type="password" value={reservedPhonePassword} onChange={(e) => setReservedPhonePassword(e.target.value)} placeholder="Somente admin/prestador" /></label>
          <div className="booking-detail__form-grid">
            <label><span>CEP</span><input value={form.clientCep} onChange={(e) => onChange("clientCep", e.target.value)} /></label>
            <label><span>Numero</span><input value={form.clientNumber} onChange={(e) => onChange("clientNumber", e.target.value)} /></label>
          </div>
          <label><span>Rua</span><input value={form.clientStreet} onChange={(e) => onChange("clientStreet", e.target.value)} /></label>
          <label><span>Bairro</span><input value={form.clientNeighborhood} onChange={(e) => onChange("clientNeighborhood", e.target.value)} /></label>
          <label><span>Complemento</span><input value={form.clientComplement ?? ""} onChange={(e) => onChange("clientComplement", e.target.value)} /></label>
          <div className="booking-detail__form-grid">
            <label><span>Cidade</span><input value={form.clientCity} readOnly /></label>
            <label><span>Estado</span><input value={form.clientState} readOnly /></label>
          </div>
          {updateError ? <p className="booking-detail__error">{normalizeApiErrorMessage(updateError, { context: "editBooking" })}</p> : null}
          <div className="booking-detail__actions">
            <button type="button" className="secondary-action" onClick={() => setIsEditing(false)}>
              <DetailIcon src={viewIcon} />
              Fechar edicao
            </button>
            <button type="button" className="primary-action" onClick={() => void submitUpdate()} disabled={!canManage || isUpdating}>
              <DetailIcon src={editIcon} />
              {isUpdating ? "Salvando..." : "Salvar alteracoes"}
            </button>
          </div>
        </div>
      ) : (
        <div className="booking-detail__content">
          <div className="booking-detail__section booking-detail__section--service">
            <h3><DetailIcon src={serviceIcon} /> Agendamento</h3>
            <div className="booking-detail__info-grid">
              <span><b>Data</b>{formatDateOnly(booking.startsAt)}</span>
              <span><b>Horario</b>{formatTimeOnly(booking.startsAt)} - {formatTimeOnly(booking.endsAt)}</span>
              <span><b>Status</b>{booking.status.label}</span>
            </div>
            {booking.serviceNotes ? <p className="booking-detail__notes">{booking.serviceNotes}</p> : null}
            {booking.eventLink ? (
              <a className="booking-detail__calendar-link" href={booking.eventLink} target="_blank" rel="noreferrer">
                <DetailIcon src={calendarIcon} />
                Abrir no calendario
              </a>
            ) : null}
          </div>
          <div className="booking-detail__section">
            <h3><DetailIcon src={userIcon} /> Cliente</h3>
            <div className="booking-detail__info-grid">
              <span><b>Nome</b>{booking.client.fullName || "Nao informado"}</span>
              <span><b>E-mail</b>{booking.client.email || "Nao informado"}</span>
              <span><b>Telefone</b>{booking.client.phone || "Nao informado"}</span>
            </div>
          </div>
          <div className="booking-detail__section">
            <h3><DetailIcon src={locationIcon} /> Endereco</h3>
            <p>{booking.client.address.formatted || "Endereco nao informado"}</p>
            <p>{booking.client.address.city ?? ""} - {booking.client.address.state ?? ""}</p>
          </div>
          <div className="booking-detail__section">
            <h3><DetailIcon src={phoneIcon} /> Atendimento</h3>
            <p>{booking.assignedProvider?.name || "Prestador ainda nao definido"}</p>
            <p>{booking.assignedProvider?.phone || "Contato indisponivel no momento"}</p>
          </div>
        </div>
      )}

      {!isEditing && !confirmCancel ? <BookingActions canManage={canManage} onEdit={() => setIsEditing(true)} onCancel={() => setConfirmCancel(true)} /> : null}

      {confirmCancel ? (
        <div className="booking-detail__confirm">
          <div className="booking-detail__confirm-heading">
            <DetailIcon src={cancelIcon} />
            <div>
              <h3>Cancelar agendamento</h3>
              <p>Esta acao remove o servico da sua lista e libera o horario para novos atendimentos.</p>
            </div>
          </div>
          <div className="booking-detail__cancel-summary">
            <span><DetailIcon src={serviceIcon} /> {booking.serviceType}</span>
            <span><DetailIcon src={clockIcon} /> {formatDateTime(booking.startsAt)}</span>
            <span><DetailIcon src={locationIcon} /> {booking.client.address.formatted || "Endereco nao informado"}</span>
          </div>
          {deleteError ? <p className="booking-detail__error">{normalizeApiErrorMessage(deleteError, { context: "cancelBooking" })}</p> : null}
          <div className="booking-detail__actions">
            <button type="button" className="secondary-action" onClick={() => setConfirmCancel(false)}>
              <DetailIcon src={viewIcon} />
              Voltar
            </button>
            <button type="button" className="primary-action primary-action--danger" onClick={() => void submitDelete()} disabled={!canManage || isDeleting}>
              <DetailIcon src={cancelIcon} />
              {isDeleting ? "Cancelando..." : "Confirmar cancelamento"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function BookingDetailCard({ booking, initialMode = "view", onDeleted }: BookingDetailCardProps) {
  return <BookingDetailCardContent key={`${booking.id}:${initialMode}`} booking={booking} initialMode={initialMode} onDeleted={onDeleted} />;
}
