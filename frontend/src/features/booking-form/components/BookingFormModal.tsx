import { useEffect, useMemo, useState } from "react";
import { useAvailableSlots } from "../../calendar/hooks/useAvailableSlots";
import type { CalendarEvent } from "../../calendar/types";
import { useCreateBooking } from "../../bookings/hooks/useCreateBooking";
import OtpConfirmModal from "../../otp/components/OtpConfirmModal";
import { saveLocalCalendarEvent, saveManageToken } from "../../../lib/storage";
import type { ServicoResponse } from "../../../types/api";
import type { BookingFormValues } from "../../../types/booking";
import type { HomeSelectedSlot } from "../../home/types";

type BookingFormModalProps = {
  open: boolean;
  selectedDate: string;
  selectedSlot: HomeSelectedSlot;
  events: CalendarEvent[];
  unavailableDates: string[];
  onClose: () => void;
  onBookingCreated?: (event: CalendarEvent) => void;
};

type VerificationState = {
  phone: string;
  verificationId: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
};

const DEFAULT_SERVICE_TYPE = "Visita técnica";
const ALLOWED_CITIES = ["Itabirito", "Ouro Preto", "Moeda"];
const INITIAL_FORM: BookingFormValues = {
  clientFirstName: "",
  clientLastName: "",
  clientEmail: "",
  clientPhone: "",
  clientAddress: "",
};

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateString}T12:00:00`));
}

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function getTodayIso() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isRequiredFormValid(values: BookingFormValues) {
  return Boolean(
    values.clientFirstName.trim() &&
      values.clientLastName.trim() &&
      values.clientEmail.trim() &&
      values.clientPhone.replace(/\D/g, "").length >= 10 &&
      values.clientAddress.trim(),
  );
}

function inferCity(address: string): string {
  const lowerAddress = address.toLowerCase();
  const foundCity = ALLOWED_CITIES.find((city) => lowerAddress.includes(city.toLowerCase()));
  return foundCity ?? "Itabirito";
}

function mapServicoToCalendarEvent(servico: ServicoResponse): CalendarEvent {
  const customerName = `${servico.clientFirstName} ${servico.clientLastName}`.trim();
  return {
    id: servico.eventId,
    title: "Visita técnica",
    date: servico.start.slice(0, 10),
    startTime: servico.start.slice(11, 16),
    endTime: servico.end.slice(11, 16),
    city: servico.clientCity,
    customerName,
    addressLine: servico.clientAddressLine ?? servico.clientStreet,
    email: servico.clientEmail,
    phone: servico.clientPhone,
    serviceLabel: servico.serviceType,
    status: "booked",
  };
}

export default function BookingFormModal({
  open,
  selectedDate,
  selectedSlot,
  events,
  unavailableDates,
  onClose,
  onBookingCreated,
}: BookingFormModalProps) {
  const todayIso = getTodayIso();
  const isPastDate = selectedDate < todayIso;
  const isUnavailable = unavailableDates.includes(selectedDate) || isPastDate;

  const [draftSlot, setDraftSlot] = useState<HomeSelectedSlot>(selectedSlot);
  const [formValues, setFormValues] = useState<BookingFormValues>(INITIAL_FORM);
  const [verificationState, setVerificationState] = useState<VerificationState | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: availableSlots = [], isLoading: isLoadingSlots, error: slotsError } = useAvailableSlots(
    selectedDate,
    open && !isUnavailable,
  );
  const createBookingMutation = useCreateBooking();

  const dayEvents = useMemo(
    () => events.filter((event) => event.date === selectedDate),
    [events, selectedDate],
  );

  useEffect(() => {
    if (!open) return;
    setDraftSlot(selectedSlot);
    setFormValues(INITIAL_FORM);
    setSuccessMessage(null);
  }, [open, selectedDate, selectedSlot]);

  useEffect(() => {
    if (!open) {
      setVerificationState(null);
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (verificationState) {
          setVerificationState(null);
          return;
        }
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, verificationState]);

  useEffect(() => {
    if (!draftSlot && availableSlots.length > 0) {
      setDraftSlot({
        date: availableSlots[0].date,
        startTime: availableSlots[0].startTime,
        endTime: availableSlots[0].endTime,
      });
    }
  }, [availableSlots, draftSlot]);

  if (!open) {
    return null;
  }

  const canSubmit = Boolean(draftSlot) && !isUnavailable && isRequiredFormValid(formValues) && !createBookingMutation.isPending;

  const handleFieldChange = <K extends keyof BookingFormValues>(key: K, value: BookingFormValues[K]) => {
    setFormValues((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!draftSlot || !canSubmit) return;

    const fullAddress = formValues.clientAddress.trim();
    const city = inferCity(fullAddress);

    try {
      const response = await createBookingMutation.mutateAsync({
        serviceType: DEFAULT_SERVICE_TYPE,
        date: draftSlot.date,
        time: draftSlot.startTime,
        clientFirstName: formValues.clientFirstName.trim(),
        clientLastName: formValues.clientLastName.trim(),
        clientEmail: formValues.clientEmail.trim(),
        clientPhone: formValues.clientPhone.replace(/\D/g, ""),
        clientCep: "00000000",
        clientStreet: fullAddress,
        clientNeighborhood: "Não informado",
        clientNumber: "S/N",
        clientComplement: undefined,
        clientCity: city,
        clientState: "MG",
      });

      saveManageToken(response.manageToken);

      const newEvent = mapServicoToCalendarEvent(response.servico);
      saveLocalCalendarEvent(newEvent);
      onBookingCreated?.(newEvent);

      setSuccessMessage("Agendamento criado. Confirme o telefone para concluir.");
      setVerificationState({
        phone: formValues.clientPhone,
        verificationId: response.verificationId,
        expiresInSeconds: response.expiresInSeconds,
        resendAfterSeconds: response.resendAfterSeconds,
      });
    } catch {
      return;
    }
  };

  const handleVerified = () => {
    setVerificationState(null);
    setSuccessMessage("Agendamento confirmado com sucesso.");
    window.setTimeout(() => {
      onClose();
    }, 700);
  };

  return (
    <>
      <div className="booking-preview-modal" role="dialog" aria-modal="true">
        <button
          type="button"
          className="booking-preview-modal__backdrop"
          onClick={onClose}
          aria-label="Fechar modal"
        />

        <div className="booking-preview-modal__card booking-preview-modal__card--form booking-preview-modal__card--compact">
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

          <div className="booking-preview-modal__body booking-form booking-form--compact">
            <div className="booking-preview-modal__summary booking-preview-modal__summary--compact">
              <div className="booking-preview-modal__summary-line">
                <span>Atendimentos no dia</span>
                <strong>{dayEvents.length}</strong>
              </div>
              <div className="booking-preview-modal__summary-line booking-preview-modal__summary-line--slot">
                <span>Horário</span>
                <strong>{draftSlot ? `${draftSlot.startTime} - ${draftSlot.endTime}` : "Selecione um horário"}</strong>
              </div>
            </div>

            {isUnavailable ? (
              <div className="booking-preview-modal__empty">
                <strong>Dia indisponível</strong>
                <p>Datas passadas e dias bloqueados não aceitam agendamento.</p>
              </div>
            ) : (
              <>
                <label className="booking-form__field booking-form__field--full">
                  <span>Hora da visita</span>
                  <div className="booking-form__slots booking-form__slots--compact">
                    {isLoadingSlots ? <small>Carregando horários...</small> : null}
                    {!isLoadingSlots && availableSlots.length === 0 ? <small>Nenhum horário disponível.</small> : null}
                    {availableSlots.map((slot) => {
                      const isSelected = draftSlot?.date === slot.date && draftSlot?.startTime === slot.startTime;
                      return (
                        <button
                          key={`${slot.date}-${slot.startTime}`}
                          type="button"
                          className={[
                            "booking-form__slot-pill",
                            isSelected ? "booking-form__slot-pill--selected" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => setDraftSlot({ date: slot.date, startTime: slot.startTime, endTime: slot.endTime })}
                        >
                          {slot.startTime}
                        </button>
                      );
                    })}
                  </div>
                </label>

                <div className="booking-form__grid booking-form__grid--compact">
                  <label className="booking-form__field">
                    <span>Nome</span>
                    <input
                      className="booking-form__input"
                      value={formValues.clientFirstName}
                      onChange={(event) => handleFieldChange("clientFirstName", event.target.value)}
                      placeholder="Seu nome"
                    />
                  </label>

                  <label className="booking-form__field">
                    <span>Sobrenome</span>
                    <input
                      className="booking-form__input"
                      value={formValues.clientLastName}
                      onChange={(event) => handleFieldChange("clientLastName", event.target.value)}
                      placeholder="Seu sobrenome"
                    />
                  </label>

                  <label className="booking-form__field">
                    <span>E-mail</span>
                    <input
                      className="booking-form__input"
                      type="email"
                      value={formValues.clientEmail}
                      onChange={(event) => handleFieldChange("clientEmail", event.target.value)}
                      placeholder="voce@email.com"
                    />
                  </label>

                  <label className="booking-form__field">
                    <span>Telefone</span>
                    <input
                      className="booking-form__input"
                      inputMode="tel"
                      value={formValues.clientPhone}
                      onChange={(event) => handleFieldChange("clientPhone", formatPhoneInput(event.target.value))}
                      placeholder="(31) 99999-9999"
                    />
                  </label>

                  <label className="booking-form__field booking-form__field--full">
                    <span>Endereço</span>
                    <input
                      className="booking-form__input"
                      value={formValues.clientAddress}
                      onChange={(event) => handleFieldChange("clientAddress", event.target.value)}
                      placeholder="Rua, número, bairro e cidade"
                    />
                  </label>
                </div>

                {successMessage ? <p className="booking-form__feedback booking-form__feedback--success">{successMessage}</p> : null}
                {slotsError instanceof Error ? <p className="booking-form__feedback booking-form__feedback--error">{slotsError.message}</p> : null}
                {createBookingMutation.error instanceof Error ? (
                  <p className="booking-form__feedback booking-form__feedback--error">{createBookingMutation.error.message}</p>
                ) : null}
              </>
            )}
          </div>

          <div className="booking-preview-modal__footer">
            <button type="button" className="secondary-action" onClick={onClose}>
              Cancelar
            </button>

            <button type="button" className="primary-action" disabled={!canSubmit} onClick={handleSubmit}>
              {createBookingMutation.isPending ? "Agendando..." : "Continuar"}
            </button>
          </div>
        </div>
      </div>

      <OtpConfirmModal
        open={Boolean(verificationState)}
        phone={verificationState?.phone ?? ""}
        verificationId={verificationState?.verificationId ?? ""}
        expiresInSeconds={verificationState?.expiresInSeconds ?? 0}
        resendAfterSeconds={verificationState?.resendAfterSeconds ?? 0}
        onClose={() => setVerificationState(null)}
        onVerified={handleVerified}
      />
    </>
  );
}
