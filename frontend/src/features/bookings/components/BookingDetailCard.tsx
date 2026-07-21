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
import { formatDateTime, isWithinTwelveHours } from "../../../lib/dates";
import { formatPhoneInput, isValidPhone, normalizePhone } from "../../../lib/authRole";
import { normalizeApiErrorMessage } from "../../../lib/errors";
import { removeLocalCalendarEvent, removeManageToken, resolveManageToken } from "../../../lib/storage";
import { buildClientServiceOptions, normalizeClientServiceLabel } from "../services/client-service-options";
import { BookingActions } from "./BookingActions";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { useBookingMutations } from "../hooks/useBookingMutations";

export type BookingDetailMode = "view" | "edit" | "cancel";

type BookingDetailCardProps = {
  booking: Booking;
  initialMode?: BookingDetailMode;
  onDeleted?: () => void;
};

type EditableField =
  | "serviceType"
  | "clientEmail"
  | "clientPhone"
  | "clientStreet"
  | "clientNumber";

function toFormState(booking: Booking): ServicoRequest {
  const start = booking.startsAt;
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    serviceType: normalizeClientServiceLabel(booking.serviceType),
    date: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    time: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    clientFirstName: booking.client.firstName,
    clientLastName: booking.client.lastName,
    clientEmail: booking.client.email ?? "",
    clientPhone: formatPhoneInput(booking.client.phone ?? ""),
    clientCep: booking.client.address.postalCode ?? "",
    clientStreet: booking.client.address.street ?? "",
    clientNeighborhood: booking.client.address.neighborhood ?? "",
    clientNumber: booking.client.address.number ?? "",
    clientComplement: booking.client.address.complement ?? undefined,
    clientCity: booking.client.address.city ?? "",
    clientState: booking.client.address.state ?? "",
    clientLatitude: booking.client.address.latitude ?? undefined,
    clientLongitude: booking.client.address.longitude ?? undefined,
  };
}

function splitFullName(value: string): { firstName: string; lastName: string } {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts.shift() ?? "",
    lastName: parts.join(" "),
  };
}

function isEmailValid(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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
  const [fullName, setFullName] = useState(() => booking.client.fullName || `${booking.client.firstName} ${booking.client.lastName}`.trim());
  const [validationError, setValidationError] = useState("");
  const { updateBooking, deleteBooking, isUpdating, isDeleting, updateError, deleteError } = useBookingMutations();

  const serviceOptions = useMemo(
    () => buildClientServiceOptions([], form.serviceType),
    [form.serviceType],
  );
  const displayedService = normalizeClientServiceLabel(booking.serviceType) || "Serviço não informado";
  const lockedByTime = isWithinTwelveHours(booking.startsAt);
  const isCancelled = booking.status.code === "cancelled";
  const canManage = Boolean(token) && !lockedByTime && !isCancelled;
  const parsedFullName = splitFullName(fullName);
  const addressChanged =
    form.clientStreet.trim() !== (booking.client.address.street ?? "").trim()
    || form.clientNumber.trim() !== (booking.client.address.number ?? "").trim();
  const contactAndAddressAreValid =
    Boolean(parsedFullName.firstName && parsedFullName.lastName)
    && isEmailValid(form.clientEmail)
    && isValidPhone(form.clientPhone)
    && Boolean(form.clientStreet.trim() && form.clientNumber.trim());
  const formIsValid = Boolean(form.serviceType.trim())
    && contactAndAddressAreValid;

  const onChange = (field: EditableField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setValidationError("");
  };

  const onFullNameChange = (value: string) => {
    setFullName(value);
    setValidationError("");
  };

  const submitUpdate = async () => {
    if (!token) return;
    if (!form.serviceType.trim()) {
      setValidationError("Escolha um serviço.");
      return;
    }
    const { firstName, lastName } = splitFullName(fullName);
    if (!firstName || !lastName) {
      setValidationError("Informe o nome e o sobrenome do cliente.");
      return;
    }
    if (!isEmailValid(form.clientEmail)) {
      setValidationError("Informe um e-mail válido.");
      return;
    }
    if (!isValidPhone(form.clientPhone)) {
      setValidationError("Informe um telefone válido com DDD.");
      return;
    }
    if (!form.clientStreet.trim() || !form.clientNumber.trim()) {
      setValidationError("Informe o endereço e o número do local do serviço.");
      return;
    }

    try {
      await updateBooking({
        eventId: booking.id,
        token,
        payload: {
          ...form,
          serviceType: form.serviceType.trim(),
          serviceNotes: undefined,
          clientFirstName: firstName,
          clientLastName: lastName,
          clientEmail: form.clientEmail.trim(),
          clientPhone: normalizePhone(form.clientPhone),
          clientStreet: form.clientStreet.trim(),
          clientNumber: form.clientNumber.trim(),
          clientLatitude: addressChanged ? undefined : form.clientLatitude,
          clientLongitude: addressChanged ? undefined : form.clientLongitude,
          reservedPhonePassword: undefined,
        },
      });
      setValidationError("");
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
          <h2>{displayedService}</h2>
          <p>{formatDateTime(booking.startsAt)}</p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      {lockedByTime && !isCancelled ? <p className="booking-detail__notice">Alterações só podem ser feitas com pelo menos 12 horas de antecedência.</p> : null}
      {isCancelled ? <p className="booking-detail__notice">Este agendamento já foi cancelado e não pode mais ser alterado.</p> : null}
      {!token ? <p className="booking-detail__notice">Este atendimento não tem código de acesso salvo neste navegador. Use a recuperação para restaurar o acesso.</p> : null}

      {isEditing ? (
        <div className="booking-detail__form booking-detail__form--essential">
          <p className="booking-detail__edit-intro">Altere o serviço, os dados de contato ou o endereço do atendimento.</p>
          <label>
            <span>Serviço</span>
            <select value={form.serviceType} onChange={(event) => onChange("serviceType", event.target.value)}>
              {serviceOptions.map((service) => <option key={service} value={service}>{service}</option>)}
            </select>
          </label>
          <p className="booking-detail__edit-rule">
            A data e o horário não podem ser alterados por aqui. Para reagendar, entre em contato com o prestador responsável pelo atendimento.
          </p>
          <label><span>Nome completo</span><input type="text" autoComplete="name" value={fullName} onChange={(event) => onFullNameChange(event.target.value)} /></label>
          <div className="booking-detail__form-grid">
            <label><span>E-mail</span><input type="email" autoComplete="email" value={form.clientEmail} onChange={(event) => onChange("clientEmail", event.target.value)} /></label>
            <label><span>Telefone</span><input type="tel" inputMode="tel" autoComplete="tel" value={form.clientPhone} onChange={(event) => onChange("clientPhone", formatPhoneInput(event.target.value))} /></label>
          </div>
          <div className="booking-detail__form-grid booking-detail__form-grid--address">
            <label><span>Endereço</span><input type="text" autoComplete="street-address" value={form.clientStreet} onChange={(event) => onChange("clientStreet", event.target.value)} /></label>
            <label><span>Número</span><input type="text" inputMode="text" value={form.clientNumber} onChange={(event) => onChange("clientNumber", event.target.value)} /></label>
          </div>
          <p className="booking-detail__edit-rule">As demais alterações podem ser feitas até 12 horas antes do atendimento. Não é necessária senha administrativa para o cliente.</p>
          {validationError ? <p className="booking-detail__error">{validationError}</p> : null}
          {updateError ? <p className="booking-detail__error">{normalizeApiErrorMessage(updateError, { context: "editBooking" })}</p> : null}
          <div className="booking-detail__actions">
            <button type="button" className="secondary-action" onClick={() => { setValidationError(""); setIsEditing(false); }}>
              <DetailIcon src={viewIcon} />
              Fechar edição
            </button>
            <button type="button" className="primary-action" onClick={() => void submitUpdate()} disabled={!canManage || isUpdating || !formIsValid}>
              <DetailIcon src={editIcon} />
              {isUpdating ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </div>
      ) : (
        <div className="booking-detail__content">
          <div className="booking-detail__section booking-detail__section--service">
            <h3><DetailIcon src={serviceIcon} /> Agendamento</h3>
            <div className="booking-detail__info-grid">
              <span><b>Data</b>{formatDateOnly(booking.startsAt)}</span>
              <span><b>Horário</b>{formatTimeOnly(booking.startsAt)} - {formatTimeOnly(booking.endsAt)}</span>
              <span><b>Status</b>{booking.status.label}</span>
            </div>
            {booking.eventLink ? (
              <a className="booking-detail__calendar-link" href={booking.eventLink} target="_blank" rel="noreferrer">
                <DetailIcon src={calendarIcon} />
                Abrir no calendário
              </a>
            ) : null}
          </div>
          <div className="booking-detail__section">
            <h3><DetailIcon src={userIcon} /> Cliente</h3>
            <div className="booking-detail__info-grid">
              <span><b>Nome</b>{booking.client.fullName || "Não informado"}</span>
              <span><b>E-mail</b>{booking.client.email || "Não informado"}</span>
              <span><b>Telefone</b>{booking.client.phone || "Não informado"}</span>
            </div>
          </div>
          <div className="booking-detail__section">
            <h3><DetailIcon src={locationIcon} /> Endereço</h3>
            <p>{booking.client.address.formatted || "Endereço não informado"}</p>
            <p>{booking.client.address.city ?? ""} - {booking.client.address.state ?? ""}</p>
          </div>
          <div className="booking-detail__section">
            <h3><DetailIcon src={phoneIcon} /> Atendimento</h3>
            <p>{booking.assignedProvider?.name || "Prestador ainda não definido"}</p>
            <p>{booking.assignedProvider?.phone || "Contato indisponível no momento"}</p>
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
              <p>Esta ação remove o serviço da sua lista e libera o horário para novos atendimentos.</p>
            </div>
          </div>
          <div className="booking-detail__cancel-summary">
            <span><DetailIcon src={serviceIcon} /> {displayedService}</span>
            <span><DetailIcon src={clockIcon} /> {formatDateTime(booking.startsAt)}</span>
            <span><DetailIcon src={locationIcon} /> {booking.client.address.formatted || "Endereço não informado"}</span>
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
