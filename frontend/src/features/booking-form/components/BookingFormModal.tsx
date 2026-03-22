import { useEffect, useMemo, useState } from "react";
import { useAvailableSlots } from "../../calendar/hooks/useAvailableSlots";
import type { CalendarEvent } from "../../calendar/types";
import { useCreateBooking } from "../../bookings/hooks/useCreateBooking";
import OtpConfirmModal from "../../otp/components/OtpConfirmModal";
import { saveLocalCalendarEvent, saveManageToken } from "../../../lib/storage";
import type { ServicoResponse } from "../../../types/api";
import type { BookingFormValues } from "../../../types/booking";
import type { HomeSelectedSlot } from "../../home/types";
import { OTHER_ALLOWED_CITIES, PRIMARY_CITY } from "../../../data/allowed-cities";

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

type CityChoice = "bh" | "other";

type SlotOption = {
  startTime: string;
  endTime: string;
  available: boolean;
  label: string;
};

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

function isRequiredFormValid(values: BookingFormValues, cityChoice: CityChoice, selectedOtherCity: string) {
  return Boolean(
    values.clientFirstName.trim() &&
      values.clientLastName.trim() &&
      values.clientEmail.trim() &&
      values.clientPhone.replace(/\D/g, "").length >= 10 &&
      values.clientAddress.trim() &&
      (cityChoice === "bh" || selectedOtherCity),
  );
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

function getSelectedCity(cityChoice: CityChoice, selectedOtherCity: string) {
  if (cityChoice === "bh") return PRIMARY_CITY;
  return selectedOtherCity || OTHER_ALLOWED_CITIES[0];
}

function buildSelectableSlots(availableSlots: Array<{ startTime: string; endTime: string }>): SlotOption[] {
  const map = new Map(availableSlots.map((slot) => [slot.startTime, slot.endTime]));

  return Array.from({ length: 11 }, (_, index) => {
    const hour = 8 + index;
    const startTime = `${`${hour}`.padStart(2, "0")}:00`;
    const fallbackEnd = `${`${hour + 1}`.padStart(2, "0")}:00`;
    const endTime = map.get(startTime) ?? fallbackEnd;

    return {
      startTime,
      endTime,
      available: map.has(startTime),
      label: startTime,
    };
  });
}

function MetropoleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="6" y="20" width="12" height="18" rx="2" />
      <rect x="20" y="10" width="10" height="28" rx="2" />
      <rect x="32" y="16" width="10" height="22" rx="2" />
      <path d="M4 40h40" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function HousesIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M8 24l8-7 8 7v12H8z" />
      <path d="M24 27l7-6 7 6v9H24z" />
      <path d="M4 40h40" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
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
  const [cityChoice, setCityChoice] = useState<CityChoice>("bh");
  const [selectedOtherCity, setSelectedOtherCity] = useState<string>(OTHER_ALLOWED_CITIES[0]);

  const { data: availableSlots = [], isLoading: isLoadingSlots, error: slotsError } = useAvailableSlots(
    selectedDate,
    open && !isUnavailable,
  );
  const createBookingMutation = useCreateBooking();

  const dayEvents = useMemo(
    () => events.filter((event) => event.date === selectedDate),
    [events, selectedDate],
  );

  const selectOptions = useMemo(() => buildSelectableSlots(availableSlots), [availableSlots]);

  useEffect(() => {
    if (!open) return;
    setDraftSlot(selectedSlot);
    setFormValues(INITIAL_FORM);
    setCityChoice("bh");
    setSelectedOtherCity(OTHER_ALLOWED_CITIES[0]);
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
    if (!draftSlot) {
      const firstAvailable = selectOptions.find((slot) => slot.available);
      if (firstAvailable) {
        setDraftSlot({
          date: selectedDate,
          startTime: firstAvailable.startTime,
          endTime: firstAvailable.endTime,
        });
      }
    }
  }, [selectOptions, draftSlot, selectedDate]);

  if (!open) {
    return null;
  }

  const canSubmit = Boolean(draftSlot) && !isUnavailable && isRequiredFormValid(formValues, cityChoice, selectedOtherCity) && !createBookingMutation.isPending;

  const handleFieldChange = <K extends keyof BookingFormValues>(key: K, value: BookingFormValues[K]) => {
    setFormValues((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSlotChange = (startTime: string) => {
    const chosen = selectOptions.find((slot) => slot.startTime === startTime && slot.available);
    if (!chosen) return;

    setDraftSlot({
      date: selectedDate,
      startTime: chosen.startTime,
      endTime: chosen.endTime,
    });
  };

  const handleSubmit = async () => {
    if (!draftSlot || !canSubmit) return;

    const fullAddress = formValues.clientAddress.trim();
    const city = getSelectedCity(cityChoice, selectedOtherCity);

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

        <div className="booking-preview-modal__card booking-preview-modal__card--form booking-preview-modal__card--glass">
          <div className="booking-preview-modal__header booking-preview-modal__header--spaced">
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

          <div className="booking-preview-modal__body booking-preview-modal__body--split">
            <section className="booking-preview-modal__panel booking-preview-modal__panel--summary">
              <div className="booking-preview-modal__spotlight">
                <span className="booking-preview-modal__spotlight-label">Visita técnica</span>
                <strong>{draftSlot ? `${draftSlot.startTime} · ${draftSlot.endTime}` : "Selecione um horário"}</strong>
                <small>{dayEvents.length} atendimento(s) previsto(s) neste dia</small>
              </div>

              <div className="booking-preview-modal__note-card">
                <strong>Escolha a cidade da visita</strong>
                <span>Isso ajuda a manter os cards da agenda com a cor correta.</span>
              </div>

              {successMessage ? <p className="booking-form__feedback booking-form__feedback--success">{successMessage}</p> : null}
              {slotsError instanceof Error ? <p className="booking-form__feedback booking-form__feedback--error">{slotsError.message}</p> : null}
              {createBookingMutation.error instanceof Error ? (
                <p className="booking-form__feedback booking-form__feedback--error">{createBookingMutation.error.message}</p>
              ) : null}
            </section>

            <section className="booking-preview-modal__panel booking-preview-modal__panel--form">
              {isUnavailable ? (
                <div className="booking-preview-modal__empty booking-preview-modal__empty--danger">
                  <strong>Dia indisponível</strong>
                  <p>Datas passadas e dias bloqueados não aceitam agendamento.</p>
                </div>
              ) : (
                <div className="booking-form booking-form--compact">
                  <label className="booking-form__field booking-form__field--full">
                    <span>Horário da visita</span>
                    <div className="booking-form__schedule-inline">
                      <select
                        className="booking-form__select booking-form__select--compact"
                        value={draftSlot?.startTime ?? ""}
                        onChange={(event) => handleSlotChange(event.target.value)}
                        disabled={isLoadingSlots}
                      >
                        <option value="">Selecione</option>
                        {selectOptions.map((slot) => (
                          <option key={slot.startTime} value={slot.startTime} disabled={!slot.available}>
                            {slot.label}{slot.available ? "" : " · indisponível"}
                          </option>
                        ))}
                      </select>
                      <small>{isLoadingSlots ? "Carregando horários..." : "Apenas horários livres ficam ativos."}</small>
                    </div>
                  </label>

                  <div className="booking-form__city-choice">
                    <button
                      type="button"
                      className={[
                        "booking-form__city-chip",
                        cityChoice === "bh" ? "booking-form__city-chip--active" : "",
                      ].filter(Boolean).join(" ")}
                      onClick={() => setCityChoice("bh")}
                    >
                      <MetropoleIcon />
                      <span>Belo Horizonte</span>
                    </button>

                    <button
                      type="button"
                      className={[
                        "booking-form__city-chip",
                        cityChoice === "other" ? "booking-form__city-chip--active" : "",
                      ].filter(Boolean).join(" ")}
                      onClick={() => setCityChoice("other")}
                    >
                      <HousesIcon />
                      <span>Outros</span>
                    </button>
                  </div>

                  {cityChoice === "other" ? (
                    <label className="booking-form__field booking-form__field--full">
                      <span>Cidade</span>
                      <select
                        className="booking-form__select"
                        value={selectedOtherCity}
                        onChange={(event) => setSelectedOtherCity(event.target.value)}
                      >
                        {OTHER_ALLOWED_CITIES.map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </label>
                  ) : null}

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
                </div>
              )}
            </section>
          </div>

          <div className="booking-preview-modal__footer booking-preview-modal__footer--dialog">
            <button type="button" className="secondary-action secondary-action--soft" onClick={onClose}>
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
