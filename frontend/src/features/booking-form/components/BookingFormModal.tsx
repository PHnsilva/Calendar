import { useEffect, useMemo, useState } from "react";
import { useAvailableSlots } from "../../calendar/hooks/useAvailableSlots";
import type { CalendarEvent } from "../../calendar/types";
import { useCreateBooking } from "../../bookings/hooks/useCreateBooking";
import OtpConfirmModal from "../../otp/components/OtpConfirmModal";
import AddressAutocompleteField from "./AddressAutocompleteField";
import type { AddressSuggestion } from "../hooks/useAddressSuggestions";
import { saveLocalCalendarEvent, saveManageToken } from "../../../lib/storage";
import type { ServicoResponse } from "../../../types/api";
import type { BookingFormValues } from "../../../types/booking";
import type { HomeSelectedSlot } from "../../home/types";
import { OTHER_CITIES, PRIMARY_CITY, SECONDARY_CITY } from "../../../data/allowed-cities";
import { usePublicBootstrap } from "../../public-config/hooks/usePublicBootstrap";

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

type ValidationErrors = Partial<Record<keyof BookingFormValues | "addressInput" | "draftSlot", string>>;

const DEFAULT_SERVICE_TYPE = "Visita técnica";
const GENERIC_ADDRESS_ERROR = "Informe um endereço válido.";
const INITIAL_FORM: BookingFormValues = {
  clientFirstName: "",
  clientLastName: "",
  clientEmail: "",
  clientPhone: "",
  clientCep: "",
  clientStreet: "",
  clientNeighborhood: "",
  clientNumber: "",
  clientComplement: "",
  clientCity: PRIMARY_CITY,
  clientState: "MG",
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

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function getTodayIso() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function isEmailValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizeText(value: string) {
  return value.trim();
}

function normalizeCity(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function validateForm(values: BookingFormValues, addressInput: string, selectedCity: string, selectedSuggestion: AddressSuggestion | null, selectedSlot: HomeSelectedSlot): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!normalizeText(values.clientFirstName)) errors.clientFirstName = "Informe seu nome.";
  if (!normalizeText(values.clientLastName)) errors.clientLastName = "Informe seu sobrenome.";
  if (!isEmailValid(values.clientEmail)) errors.clientEmail = "Informe um e-mail válido.";
  const phoneDigits = digitsOnly(values.clientPhone);
  if (phoneDigits.length < 10 || phoneDigits.length > 11) errors.clientPhone = "Informe um telefone válido com DDD.";
  if (!selectedSlot) errors.draftSlot = "Selecione um horário para continuar.";

  const cepDigits = digitsOnly(values.clientCep);
  const hasStructuredAddress = Boolean(
    selectedSuggestion &&
    normalizeText(values.clientStreet) &&
    normalizeText(values.clientNeighborhood) &&
    normalizeText(values.clientNumber) &&
    cepDigits.length === 8,
  );
  const suggestionMatchesCity = Boolean(
    selectedSuggestion &&
    (!selectedSuggestion.city || normalizeCity(selectedSuggestion.city) === normalizeCity(selectedCity)),
  );

  if (!normalizeText(addressInput) || !hasStructuredAddress || !suggestionMatchesCity) {
    errors.addressInput = GENERIC_ADDRESS_ERROR;
  }

  return errors;
}

function mapCreateError(errorMessage: string): string {
  const normalized = errorMessage.toLowerCase();
  if (normalized.includes("cidade") || normalized.includes("cep") || normalized.includes("bairro") || normalized.includes("rua") || normalized.includes("número") || normalized.includes("numero") || normalized.includes("endereço") || normalized.includes("endereco")) {
    return GENERIC_ADDRESS_ERROR;
  }
  return errorMessage;
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
  const [selectedCity, setSelectedCity] = useState<string>(PRIMARY_CITY);
  const [addressInput, setAddressInput] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [verificationState, setVerificationState] = useState<VerificationState | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: bootstrap } = usePublicBootstrap(open);
  const slotMinutes = bootstrap?.booking?.slotMinutes ?? 60;

  const { data: availableSlots = [], isLoading: isLoadingSlots, error: slotsError } = useAvailableSlots(
    selectedDate,
    slotMinutes,
    open && !isUnavailable,
  );
  const createBookingMutation = useCreateBooking();

  const dayEvents = useMemo(() => events.filter((event) => event.date === selectedDate), [events, selectedDate]);

  useEffect(() => {
    if (!open) return;
    setDraftSlot(selectedSlot);
    setFormValues({ ...INITIAL_FORM, clientCity: PRIMARY_CITY });
    setSelectedCity(PRIMARY_CITY);
    setAddressInput("");
    setSelectedAddress(null);
    setValidationErrors({});
    setSuccessMessage(null);
    setVerificationState(null);
  }, [open, selectedDate, selectedSlot]);

  useEffect(() => {
    setFormValues((current) => ({
      ...current,
      clientCity: selectedCity,
      clientState: current.clientState || "MG",
    }));
    setAddressInput("");
    setSelectedAddress(null);
    setFormValues((current) => ({
      ...current,
      clientStreet: "",
      clientNeighborhood: "",
      clientNumber: "",
      clientCep: "",
      clientCity: selectedCity,
      clientState: current.clientState || "MG",
    }));
    setValidationErrors((current) => {
      const next = { ...current };
      delete next.addressInput;
      return next;
    });
  }, [selectedCity]);

  useEffect(() => {
    if (!open) return;
    const selectedStillAvailable = availableSlots.some((slot) => slot.startTime === draftSlot?.startTime && slot.date === draftSlot?.date);
    if (!selectedStillAvailable) {
      setDraftSlot(selectedSlot && availableSlots.some((slot) => slot.startTime === selectedSlot.startTime) ? selectedSlot : null);
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

  if (!open) return null;

  const handleFieldChange = <K extends keyof BookingFormValues>(key: K, value: BookingFormValues[K]) => {
    setFormValues((current) => ({ ...current, [key]: value }));
    setValidationErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    setSelectedAddress(suggestion);
    setAddressInput(suggestion.formatted);
    setFormValues((current) => ({
      ...current,
      clientCep: digitsOnly(suggestion.postcode ?? current.clientCep).slice(0, 8),
      clientStreet: normalizeText(suggestion.street || suggestion.addressLine1 || suggestion.formatted),
      clientNeighborhood: normalizeText(suggestion.neighborhood || current.clientNeighborhood),
      clientNumber: normalizeText(suggestion.houseNumber || current.clientNumber),
      clientCity: selectedCity,
      clientState: normalizeText((suggestion.stateCode || suggestion.state || current.clientState || "MG")).toUpperCase(),
    }));
    setValidationErrors((current) => {
      const next = { ...current };
      delete next.addressInput;
      return next;
    });
  };

  const handleAddressChange = (value: string) => {
    setAddressInput(value);
    setSelectedAddress(null);
    setFormValues((current) => ({
      ...current,
      clientStreet: value,
      clientNeighborhood: "",
      clientNumber: "",
      clientCep: "",
      clientCity: selectedCity,
    }));
    setValidationErrors((current) => {
      const next = { ...current };
      delete next.addressInput;
      return next;
    });
  };

  const handleSubmit = async () => {
    const errors = validateForm(formValues, addressInput, selectedCity, selectedAddress, draftSlot);
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0 || !draftSlot) return;

    try {
      const response = await createBookingMutation.mutateAsync({
        serviceType: DEFAULT_SERVICE_TYPE,
        date: draftSlot.date,
        time: draftSlot.startTime,
        clientFirstName: normalizeText(formValues.clientFirstName),
        clientLastName: normalizeText(formValues.clientLastName),
        clientEmail: normalizeText(formValues.clientEmail),
        clientPhone: digitsOnly(formValues.clientPhone),
        clientCep: digitsOnly(formValues.clientCep).slice(0, 8),
        clientStreet: normalizeText(formValues.clientStreet),
        clientNeighborhood: normalizeText(formValues.clientNeighborhood),
        clientNumber: normalizeText(formValues.clientNumber),
        clientComplement: normalizeText(formValues.clientComplement) || undefined,
        clientCity: selectedCity,
        clientState: normalizeText(formValues.clientState || "MG").slice(0, 2).toUpperCase(),
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
    } catch (error) {
      createBookingMutation.reset();
      const message = mapCreateError((error as Error).message || "Erro ao criar agendamento.");
      setValidationErrors((current) => ({ ...current, addressInput: message === GENERIC_ADDRESS_ERROR ? message : current.addressInput }));
    }
  };

  const handleVerified = () => {
    setVerificationState(null);
    setSuccessMessage("Agendamento confirmado com sucesso.");
    window.setTimeout(() => {
      onClose();
    }, 700);
  };

  const submitDisabled = createBookingMutation.isPending || isUnavailable || isLoadingSlots;
  const backendError = createBookingMutation.error ? mapCreateError(createBookingMutation.error.message) : null;

  return (
    <>
      <div className="booking-preview-modal" role="dialog" aria-modal="true">
        <button type="button" className="booking-preview-modal__backdrop" onClick={onClose} aria-label="Fechar modal" />

        <div className="booking-preview-modal__card booking-preview-modal__card--form booking-preview-modal__card--compact booking-preview-modal__card--wide booking-preview-modal__card--city-refined">
          <div className="booking-preview-modal__header">
            <div>
              <span className="booking-preview-modal__eyebrow">Novo agendamento</span>
              <h3 className="booking-preview-modal__title">{formatDate(selectedDate)}</h3>
            </div>
            <button type="button" className="booking-preview-modal__close" onClick={onClose} aria-label="Fechar">×</button>
          </div>

          <div className="booking-preview-modal__body booking-preview-modal__body--form booking-preview-modal__body--compact">
            <div className="booking-preview-modal__summary booking-preview-modal__summary--compact booking-preview-modal__summary--slots">
              <div>
                <span>Janela da visita</span>
                <strong>{draftSlot ? `${draftSlot.startTime} - ${draftSlot.endTime ?? ""}` : "Selecione um horário"}</strong>
              </div>
              <small>{dayEvents.length} já marcado(s) no dia</small>
            </div>

            {successMessage ? <p className="booking-form__feedback booking-form__feedback--success">{successMessage}</p> : null}

            {isUnavailable ? (
              <div className="booking-preview-modal__empty">
                <strong>{isPastDate ? "Data indisponível" : "Dia indisponível"}</strong>
                <p>{isPastDate ? "Escolha um dia atual ou futuro para continuar." : "Escolha outro dia no calendário para iniciar um agendamento."}</p>
              </div>
            ) : (
              <>
                <div className="booking-preview-modal__section-heading"><span>Horário</span></div>
                {validationErrors.draftSlot ? <p className="booking-form__feedback booking-form__feedback--error">{validationErrors.draftSlot}</p> : null}
                {isLoadingSlots ? <div className="booking-preview-modal__empty"><strong>Carregando horários...</strong></div> : null}
                {slotsError ? <p className="booking-form__feedback booking-form__feedback--error">{slotsError.message}</p> : null}
                {!isLoadingSlots && availableSlots.length === 0 ? <div className="booking-preview-modal__empty"><strong>Sem horários disponíveis</strong><p>Esse dia está sem slots livres no momento.</p></div> : null}
                {availableSlots.length > 0 ? (
                  <div className="booking-preview-modal__slots-grid booking-preview-modal__slots-grid--compact">
                    {availableSlots.map((slot) => {
                      const isSelected = draftSlot?.date === slot.date && draftSlot?.startTime === slot.startTime;
                      return (
                        <button
                          key={`${slot.date}-${slot.startTime}`}
                          type="button"
                          className={["booking-slot", "booking-slot--available", isSelected ? "booking-slot--selected" : ""].filter(Boolean).join(" ")}
                          onClick={() => {
                            setDraftSlot({ date: slot.date, startTime: slot.startTime, endTime: slot.endTime });
                            setValidationErrors((current) => {
                              const next = { ...current };
                              delete next.draftSlot;
                              return next;
                            });
                          }}
                        >
                          <strong>{slot.startTime}</strong>
                          <small>{slot.endTime}</small>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <div className="booking-preview-modal__section-heading"><span>Seus dados</span></div>

                <div className="booking-form-grid booking-form-grid--compact">
                  <label className="booking-form__field booking-form__field--with-error"><span>Nome</span><input value={formValues.clientFirstName} onChange={(event) => handleFieldChange("clientFirstName", event.target.value)} className="booking-form__input" placeholder="Pedro" />{validationErrors.clientFirstName ? <small className="booking-form__field-error">{validationErrors.clientFirstName}</small> : null}</label>
                  <label className="booking-form__field booking-form__field--with-error"><span>Sobrenome</span><input value={formValues.clientLastName} onChange={(event) => handleFieldChange("clientLastName", event.target.value)} className="booking-form__input" placeholder="Silva" />{validationErrors.clientLastName ? <small className="booking-form__field-error">{validationErrors.clientLastName}</small> : null}</label>
                  <label className="booking-form__field booking-form__field--with-error"><span>E-mail</span><input value={formValues.clientEmail} onChange={(event) => handleFieldChange("clientEmail", event.target.value)} className="booking-form__input" type="email" placeholder="voce@email.com" />{validationErrors.clientEmail ? <small className="booking-form__field-error">{validationErrors.clientEmail}</small> : null}</label>
                  <label className="booking-form__field booking-form__field--with-error"><span>Telefone</span><input value={formValues.clientPhone} onChange={(event) => handleFieldChange("clientPhone", formatPhoneInput(event.target.value))} className="booking-form__input" inputMode="tel" placeholder="(31) 99999-9999" />{validationErrors.clientPhone ? <small className="booking-form__field-error">{validationErrors.clientPhone}</small> : null}</label>

                  <div className="booking-form__field booking-form__field--full">
                    <span>Cidade</span>
                    <div className="booking-city-picker">
                      <button type="button" className={["booking-city-choice", selectedCity === PRIMARY_CITY ? "booking-city-choice--active" : "booking-city-choice--muted"].join(" ")} onClick={() => setSelectedCity(PRIMARY_CITY)}>
                        <span className="booking-city-choice__icon">A</span>
                        <span>{PRIMARY_CITY}</span>
                      </button>

                      <button type="button" className={["booking-city-choice", selectedCity === SECONDARY_CITY ? "booking-city-choice--active" : "booking-city-choice--muted"].join(" ")} onClick={() => setSelectedCity(SECONDARY_CITY)}>
                        <span className="booking-city-choice__icon">B</span>
                        <span>{SECONDARY_CITY}</span>
                      </button>

                      <label className={["booking-city-select", ![PRIMARY_CITY, SECONDARY_CITY].includes(selectedCity) ? "booking-city-select--active" : "booking-city-select--muted"].join(" ")}>
                        <span className="booking-city-choice__icon">C</span>
                        <select value={[PRIMARY_CITY, SECONDARY_CITY].includes(selectedCity) ? "" : selectedCity} onChange={(event) => setSelectedCity(event.target.value || OTHER_CITIES[0])}>
                          <option value="">Outros</option>
                          {OTHER_CITIES.map((city) => <option key={city} value={city}>{city}</option>)}
                        </select>
                      </label>
                    </div>
                  </div>

                  <label className="booking-form__field booking-form__field--full booking-form__field--with-error">
                    <span>Endereço</span>
                    <AddressAutocompleteField
                      value={addressInput}
                      selectedCity={selectedCity}
                      onChange={handleAddressChange}
                      onSelectSuggestion={handleAddressSelect}
                    />
                    {validationErrors.addressInput ? <small className="booking-form__field-error">{validationErrors.addressInput}</small> : null}
                  </label>
                </div>

                <p className="booking-form__hint">Escolha a cidade e selecione o endereço sugerido para preencher o agendamento com mais precisão.</p>
                <p className="booking-form__hint">O tipo de serviço é enviado automaticamente como <strong>{DEFAULT_SERVICE_TYPE}</strong>.</p>
                {backendError && backendError !== GENERIC_ADDRESS_ERROR ? <p className="booking-form__feedback booking-form__feedback--error">{backendError}</p> : null}
              </>
            )}
          </div>

          <div className="booking-preview-modal__footer booking-preview-modal__footer--compact">
            <button type="button" className="secondary-action" onClick={onClose}>Cancelar</button>
            <button type="button" className="primary-action" disabled={submitDisabled} onClick={() => void handleSubmit()}>
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
