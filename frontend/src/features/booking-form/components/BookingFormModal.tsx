import { useEffect, useMemo, useState } from "react";
import {
  ALLOWED_CITIES,
  OTHER_CITIES,
  PRIMARY_CITY,
} from "../../../data/allowed-cities";
import { saveLocalCalendarEvent, saveManageToken } from "../../../lib/storage";
import type { ServicoResponse } from "../../../types/api";
import type { BookingFormValues } from "../../../types/booking";
import { useCreateBooking } from "../../bookings/hooks/useCreateBooking";
import { useAvailableSlots } from "../../calendar/hooks/useAvailableSlots";
import type { CalendarEvent } from "../../calendar/types";
import type { HomeSelectedSlot } from "../../home/types";
import OtpConfirmModal from "../../otp/components/OtpConfirmModal";

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

type CityMode = "belo-horizonte" | "others";

const DEFAULT_SERVICE_TYPE = "Visita técnica";
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

function mapServicoToCalendarEvent(servico: ServicoResponse): CalendarEvent {
  const customerName = `${servico.clientFirstName} ${servico.clientLastName}`.trim();

  return {
    id: servico.eventId,
    title: customerName || "Cliente",
    date: servico.start.slice(0, 10),
    startTime: servico.start.slice(11, 16),
    endTime: servico.end.slice(11, 16),
    city: servico.clientCity,
    customerName,
    customerAddress: servico.clientAddressLine,
    customerEmail: servico.clientEmail,
    customerPhone: servico.clientPhone,
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
  const [cityMode, setCityMode] = useState<CityMode>("belo-horizonte");
  const [selectedOtherCity, setSelectedOtherCity] = useState<string>(OTHER_CITIES[0]);
  const [verificationState, setVerificationState] = useState<VerificationState | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: availableSlots = [], isLoading: isLoadingSlots, error: slotsError } =
    useAvailableSlots(selectedDate, open && !isUnavailable);
  const createBookingMutation = useCreateBooking();

  const dayEvents = useMemo(
    () => events.filter((event) => event.date === selectedDate),
    [events, selectedDate],
  );

  useEffect(() => {
    if (!open) return;

    setDraftSlot(selectedSlot);
    setFormValues(INITIAL_FORM);
    setCityMode("belo-horizonte");
    setSelectedOtherCity(OTHER_CITIES[0]);
    setSuccessMessage(null);
  }, [open, selectedDate, selectedSlot]);

  useEffect(() => {
    if (!open) return;

    const selectedStillAvailable = availableSlots.some(
      (slot: any) => slot.startTime === draftSlot?.startTime && slot.date === draftSlot?.date,
    );

    if (!selectedStillAvailable) {
      setDraftSlot(
        selectedSlot && availableSlots.some((slot: any) => slot.startTime === selectedSlot.startTime)
          ? selectedSlot
          : null,
      );
    }
  }, [availableSlots, draftSlot, open, selectedSlot]);

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

  if (!open) {
    return null;
  }

  const canSubmit = Boolean(draftSlot) && !isUnavailable && isRequiredFormValid(formValues);
  const selectedCity = cityMode === "belo-horizonte" ? PRIMARY_CITY : selectedOtherCity;

  const handleFieldChange = <K extends keyof BookingFormValues>(
    key: K,
    value: BookingFormValues[K],
  ) => {
    setFormValues((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!draftSlot || !canSubmit) return;

    const fullAddress = formValues.clientAddress.trim();

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
        clientCity: ALLOWED_CITIES.includes(selectedCity as any)
          ? selectedCity
          : PRIMARY_CITY,
        clientState: "MG",
      });

      saveManageToken(response.manageToken);

      const newEvent = mapServicoToCalendarEvent(response.servico);
      saveLocalCalendarEvent(newEvent);
      onBookingCreated?.(newEvent);

      setSuccessMessage("Agendamento criado. Agora confirme o telefone para concluir.");
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

          <div className="booking-preview-modal__body booking-preview-modal__body--form booking-preview-modal__body--compact">
            <div className="booking-preview-modal__summary booking-preview-modal__summary--compact booking-preview-modal__summary--slots">
              <div>
                <span>Janela da visita</span>
                <strong>
                  {draftSlot
                    ? `${draftSlot.startTime} - ${draftSlot.endTime ?? ""}`
                    : "Selecione um horário"}
                </strong>
              </div>
              <small>{dayEvents.length} já marcado(s) no dia</small>
            </div>

            {successMessage ? (
              <p className="booking-form__feedback booking-form__feedback--success">{successMessage}</p>
            ) : null}

            {isUnavailable ? (
              <div className="booking-preview-modal__empty">
                <strong>{isPastDate ? "Data indisponível" : "Dia indisponível"}</strong>
                <p>
                  {isPastDate
                    ? "Escolha um dia atual ou futuro para continuar."
                    : "Escolha outro dia no calendário para iniciar um agendamento."}
                </p>
              </div>
            ) : (
              <>
                <div className="booking-preview-modal__section-heading">
                  <span>Horário</span>
                </div>

                {isLoadingSlots ? (
                  <div className="booking-preview-modal__empty">
                    <strong>Carregando horários...</strong>
                  </div>
                ) : null}
                {slotsError ? (
                  <p className="booking-form__feedback booking-form__feedback--error">
                    {slotsError.message}
                  </p>
                ) : null}

                {!isLoadingSlots && availableSlots.length === 0 ? (
                  <div className="booking-preview-modal__empty">
                    <strong>Sem horários disponíveis</strong>
                    <p>Esse dia está sem slots livres no momento.</p>
                  </div>
                ) : null}

                {availableSlots.length > 0 ? (
                  <div className="booking-preview-modal__slots-grid booking-preview-modal__slots-grid--compact">
                    {availableSlots.map((slot: any) => {
                      const isSelected =
                        draftSlot?.date === slot.date && draftSlot?.startTime === slot.startTime;

                      return (
                        <button
                          key={`${slot.date}-${slot.startTime}`}
                          type="button"
                          className={[
                            "booking-slot",
                            "booking-slot--available",
                            isSelected ? "booking-slot--selected" : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() =>
                            setDraftSlot({
                              date: slot.date,
                              startTime: slot.startTime,
                              endTime: slot.endTime,
                            })
                          }
                        >
                          <strong>{slot.startTime}</strong>
                          <small>{slot.endTime}</small>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <div className="booking-preview-modal__section-heading">
                  <span>Seus dados</span>
                </div>

                <div className="booking-form-grid booking-form-grid--compact">
                  <label className="booking-form__field">
                    <span>Nome</span>
                    <input
                      value={formValues.clientFirstName}
                      onChange={(event: any) =>
                        handleFieldChange("clientFirstName", event.target.value)
                      }
                      className="booking-form__input"
                      placeholder="Pedro"
                    />
                  </label>

                  <label className="booking-form__field">
                    <span>Sobrenome</span>
                    <input
                      value={formValues.clientLastName}
                      onChange={(event: any) =>
                        handleFieldChange("clientLastName", event.target.value)
                      }
                      className="booking-form__input"
                      placeholder="Silva"
                    />
                  </label>

                  <label className="booking-form__field">
                    <span>E-mail</span>
                    <input
                      value={formValues.clientEmail}
                      onChange={(event: any) => handleFieldChange("clientEmail", event.target.value)}
                      className="booking-form__input"
                      type="email"
                      placeholder="voce@email.com"
                    />
                  </label>

                  <label className="booking-form__field">
                    <span>Telefone</span>
                    <input
                      value={formValues.clientPhone}
                      onChange={(event: any) =>
                        handleFieldChange(
                          "clientPhone",
                          formatPhoneInput(event.target.value),
                        )
                      }
                      className="booking-form__input"
                      inputMode="tel"
                      placeholder="(31) 99999-9999"
                    />
                  </label>

                  <label className="booking-form__field booking-form__field--full">
                    <span>Endereço</span>
                    <input
                      value={formValues.clientAddress}
                      onChange={(event: any) => handleFieldChange("clientAddress", event.target.value)}
                      className="booking-form__input"
                      placeholder="Digite o endereço completo"
                    />
                  </label>

                  <div className="booking-form__field booking-form__field--full booking-form__field--city">
                    <span>Cidade</span>
                    <div className="city-choice-row">
                      <button
                        type="button"
                        className={[
                          "city-choice-button",
                          cityMode === "belo-horizonte" ? "city-choice-button--active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => setCityMode("belo-horizonte")}
                      >
                        <span className="city-choice-button__icon" aria-hidden="true">
                          🏙️
                        </span>
                        <span className="city-choice-button__text">Belo Horizonte</span>
                      </button>

                      <button
                        type="button"
                        className={[
                          "city-choice-button",
                          cityMode === "others" ? "city-choice-button--active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => setCityMode("others")}
                      >
                        <span className="city-choice-button__icon" aria-hidden="true">
                          🏘️
                        </span>
                        <span className="city-choice-button__text">Outros</span>
                      </button>
                    </div>

                    {cityMode === "others" ? (
                      <select
                        className="booking-form__input city-choice-select"
                        value={selectedOtherCity}
                        onChange={(event) => setSelectedOtherCity(event.target.value)}
                      >
                        {OTHER_CITIES.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                </div>

                <p className="booking-form__hint">
                  O tipo de serviço é enviado automaticamente como <strong>{DEFAULT_SERVICE_TYPE}</strong>.
                </p>

                {createBookingMutation.error ? (
                  <p className="booking-form__feedback booking-form__feedback--error">
                    {createBookingMutation.error.message}
                  </p>
                ) : null}
              </>
            )}
          </div>

          <div className="booking-preview-modal__footer booking-preview-modal__footer--compact">
            <button type="button" className="secondary-action" onClick={onClose}>
              Cancelar
            </button>

            <button
              type="button"
              className="primary-action"
              disabled={!canSubmit || createBookingMutation.isPending}
              onClick={() => void handleSubmit()}
            >
              {createBookingMutation.isPending ? "Agendando..." : "Agendar visita"}
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
