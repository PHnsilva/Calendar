import { useEffect, useMemo, useState } from 'react';
import '../../../app/booking-modal-day-picker.css';
import { useAvailableSlots } from '../../calendar/hooks/useAvailableSlots';
import type { CalendarEvent } from '../../calendar/types';
import { useCreateBooking } from '../../bookings/hooks/useCreateBooking';
import OtpConfirmModal from '../../otp/components/OtpConfirmModal';
import AddressAutocompleteField from './AddressAutocompleteField';
import type { AddressSuggestion } from '../hooks/useAddressSuggestions';
import { getStoredPhoneVerification, saveLocalCalendarEvent, saveManageToken } from '../../../lib/storage';
import type { ServicoResponse } from '../../../types/api';
import type { BookingFormValues } from '../../../types/booking';
import type { HomeSelectedSlot } from '../../home/types';
import { useHomeBookingSelection } from '../../../app/home-booking-provider';
import {
  formatDurationLabel,
  getAllowedCities,
  getBookingDurationMinutesByCity,
  getDefaultCity,
  getDefaultState,
  getSlotMinutes,
} from '../../../lib/bootstrap-config';
import { usePublicBootstrap } from '../../public-config/hooks/usePublicBootstrap';
import AlertNotice from '../../../components/ui/AlertNotice';

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

type ValidationErrors = Partial<Record<keyof BookingFormValues | 'addressInput' | 'draftSlot', string>>;

type CalendarCell = {
  date: string;
  label: number;
  isCurrentMonth: boolean;
  isDisabled: boolean;
};

const DEFAULT_SERVICE_TYPE = 'Visita técnica';
const GENERIC_ADDRESS_ERROR = 'Informe um endereço válido.';
const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const INITIAL_FORM: BookingFormValues = {
  clientFirstName: '',
  clientLastName: '',
  clientEmail: '',
  clientPhone: '',
  clientCep: '',
  clientStreet: '',
  clientNeighborhood: '',
  clientNumber: '',
  clientComplement: '',
  clientCity: '',
  clientState: 'MG',
};
const BOOKING_DRAFT_STORAGE_KEY = 'calendar.booking.prefill';

type StoredBookingDraft = Partial<BookingFormValues> & { addressInput?: string };

function readStoredBookingDraft(): StoredBookingDraft {
  try {
    const raw = window.localStorage.getItem(BOOKING_DRAFT_STORAGE_KEY);
    return raw ? JSON.parse(raw) as StoredBookingDraft : {};
  } catch {
    return {};
  }
}

function saveStoredBookingDraft(values: BookingFormValues, addressInput: string) {
  try {
    window.localStorage.setItem(BOOKING_DRAFT_STORAGE_KEY, JSON.stringify({
      ...values,
      addressInput,
    }));
  } catch {
    // O preenchimento automático é apenas uma conveniência local.
  }
}

function buildInitialForm(defaultCity = '', defaultState = 'MG'): BookingFormValues {
  const storedDraft = readStoredBookingDraft();
  const storedPhone = getStoredPhoneVerification()?.phone ?? storedDraft.clientPhone ?? '';

  return {
    ...INITIAL_FORM,
    ...storedDraft,
    clientPhone: storedPhone ? formatPhoneInput(storedPhone) : '',
    clientCity: storedDraft.clientCity || defaultCity,
    clientState: storedDraft.clientState || defaultState,
  };
}

function buildInitialAddressInput() {
  const storedDraft = readStoredBookingDraft();
  return storedDraft.addressInput || storedDraft.clientStreet || '';
}

function toLocalDate(dateString: string): Date {
  return new Date(`${dateString}T12:00:00`);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toMonthStart(dateString: string): string {
  return `${dateString.slice(0, 7)}-01`;
}

function shiftMonth(monthStart: string, delta: number): string {
  const base = toLocalDate(monthStart);
  const shifted = new Date(base.getFullYear(), base.getMonth() + delta, 1);
  return toIsoDate(shifted).slice(0, 10);
}


function buildCalendarCells(monthStart: string, disabledDates: Set<string>, minDate: string, maxDate: string): CalendarCell[] {
  const monthDate = toLocalDate(monthStart);
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 35 }, (_, index) => {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + index);
    const iso = toIsoDate(cellDate);
    const isCurrentMonth = cellDate.getMonth() === monthDate.getMonth();
    const isDisabled = iso < minDate || iso > maxDate || disabledDates.has(iso);

    return {
      date: iso,
      label: cellDate.getDate(),
      isCurrentMonth,
      isDisabled,
    };
  });
}

function getTodayIso() {
  return toIsoDate(new Date());
}

function findNextAvailableDate(startDate: string, unavailableDates: string[]): string {
  const blocked = new Set(unavailableDates);
  const cursor = toLocalDate(startDate);

  for (let index = 0; index < 62; index += 1) {
    const iso = toIsoDate(cursor);
    if (!blocked.has(iso)) return iso;
    cursor.setDate(cursor.getDate() + 1);
  }

  return startDate;
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(toLocalDate(dateString));
}

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

function mapServicoToCalendarEvent(servico: ServicoResponse): CalendarEvent {
  const customerName = `${servico.clientFirstName} ${servico.clientLastName}`.trim();
  return {
    id: servico.eventId,
    title: customerName || 'Cliente',
    date: servico.start.slice(0, 10),
    startTime: servico.start.slice(11, 16),
    endTime: servico.end.slice(11, 16),
    city: servico.clientCity,
    customerName,
    customerAddress: servico.clientAddressLine,
    customerEmail: servico.clientEmail,
    customerPhone: servico.clientPhone,
    serviceLabel: servico.serviceType,
    status: 'booked',
  };
}

function isEmailValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizeText(value: string) {
  return value.trim();
}

function normalizeCity(value?: string | null) {
  return (value ?? '').trim().toLowerCase();
}

function buildPersistedNumber(number: string, complement: string) {
  const normalizedNumber = normalizeText(number);
  const normalizedComplement = normalizeText(complement);
  return normalizedComplement ? `${normalizedNumber} - Compl.: ${normalizedComplement}` : normalizedNumber;
}

function validateForm(
  values: BookingFormValues,
  addressInput: string,
  selectedCity: string,
  selectedSuggestion: AddressSuggestion | null,
  selectedSlot: HomeSelectedSlot,
): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!normalizeText(values.clientFirstName)) errors.clientFirstName = 'Informe seu nome.';
  if (!normalizeText(values.clientLastName)) errors.clientLastName = 'Informe seu sobrenome.';
  if (!isEmailValid(values.clientEmail)) errors.clientEmail = 'Informe um e-mail válido.';
  const phoneDigits = digitsOnly(values.clientPhone);
  if (phoneDigits.length < 10 || phoneDigits.length > 11) errors.clientPhone = 'Informe um telefone válido com DDD.';
  if (!selectedSlot) errors.draftSlot = 'Selecione um horário para continuar.';

  const cepDigits = digitsOnly(values.clientCep);
  const hasStructuredAddress = Boolean(
    selectedSuggestion &&
    normalizeText(values.clientStreet) &&
    normalizeText(values.clientNeighborhood) &&
    cepDigits.length === 8,
  );
  const suggestionMatchesCity = Boolean(
    selectedSuggestion &&
    (!selectedSuggestion.city || normalizeCity(selectedSuggestion.city) === normalizeCity(selectedCity)),
  );

  if (selectedSuggestion && !normalizeText(values.clientNumber)) {
    errors.clientNumber = 'Informe o número.';
  }

  if (!normalizeText(addressInput) || !hasStructuredAddress || !suggestionMatchesCity) {
    errors.addressInput = GENERIC_ADDRESS_ERROR;
  }

  return errors;
}

function isPendingConfirmationConflict(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const status = 'status' in error ? Number((error as { status?: unknown }).status) : 0;
  return status === 409 && error.message.toLowerCase().includes('pendente de confirmação');
}

function mapCreateError(errorMessage: string): string {
  const normalized = errorMessage.toLowerCase();
  if (
    normalized.includes('cidade') ||
    normalized.includes('cep') ||
    normalized.includes('bairro') ||
    normalized.includes('rua') ||
    normalized.includes('número') ||
    normalized.includes('numero') ||
    normalized.includes('endereço') ||
    normalized.includes('endereco')
  ) {
    return GENERIC_ADDRESS_ERROR;
  }
  return errorMessage;
}

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="booking-day-picker__spinner-svg">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2.4" opacity="0.24" />
      <path d="M12 4a8 8 0 0 1 8 8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5.5 12.5 4.2 4.2L18.5 8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m12.5 7.5 4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
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
  const defaultDate = useMemo(
    () => findNextAvailableDate(selectedDate >= todayIso ? selectedDate : todayIso, unavailableDates),
    [selectedDate, todayIso, unavailableDates],
  );

  const [calendarDate, setCalendarDate] = useState(defaultDate);
  const [calendarMonth, setCalendarMonth] = useState(toMonthStart(defaultDate));
  const [confirmedDate, setConfirmedDate] = useState<string | null>(null);
  const [dateButtonState, setDateButtonState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [draftSlot, setDraftSlot] = useState<HomeSelectedSlot>(selectedSlot);
  const [formValues, setFormValues] = useState<BookingFormValues>(() => buildInitialForm());
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [addressInput, setAddressInput] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [verificationState, setVerificationState] = useState<VerificationState | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: bootstrap } = usePublicBootstrap(open);
  const allowedCities = useMemo(() => getAllowedCities(bootstrap), [bootstrap]);
  const defaultCity = useMemo(() => getDefaultCity(bootstrap), [bootstrap]);
  const defaultState = useMemo(() => getDefaultState(bootstrap), [bootstrap]);
  const slotMinutes = getSlotMinutes(bootstrap);
  const bookingDurationMinutes = getBookingDurationMinutesByCity(bootstrap, selectedCity || defaultCity);
  const primaryCities = allowedCities.slice(0, 2);
  const extraCities = allowedCities.slice(2);
  const effectiveDate = confirmedDate ?? calendarDate;
  const disabledDateSet = useMemo(() => new Set(unavailableDates), [unavailableDates]);
  const maxDate = useMemo(() => {
    const date = toLocalDate(todayIso);
    date.setDate(date.getDate() + 61);
    return toIsoDate(date);
  }, [todayIso]);

  const monthGrid = useMemo(
    () => buildCalendarCells(calendarMonth, disabledDateSet, todayIso, maxDate),
    [calendarMonth, disabledDateSet, maxDate, todayIso],
  );

  const confirmedUnavailable = Boolean(confirmedDate && disabledDateSet.has(confirmedDate));
  const { data: availableSlots = [], isLoading: isLoadingSlots, error: slotsError } = useAvailableSlots(
    effectiveDate,
    selectedCity || defaultCity,
    slotMinutes,
    bookingDurationMinutes,
    open && Boolean(confirmedDate) && !confirmedUnavailable,
  );
  const createBookingMutation = useCreateBooking();
  const { requestOpenProfile } = useHomeBookingSelection();
  const dayEvents = useMemo(() => events.filter((event) => event.date === effectiveDate), [effectiveDate, events]);

  useEffect(() => {
    if (!allowedCities.includes(selectedCity)) setSelectedCity(defaultCity);
    setFormValues((current) => ({
      ...current,
      clientCity: allowedCities.includes(current.clientCity) ? current.clientCity : defaultCity,
      clientState: current.clientState || defaultState,
    }));
  }, [allowedCities, defaultCity, defaultState, selectedCity]);

  useEffect(() => {
    if (!open) return;
    setCalendarDate(defaultDate);
    setCalendarMonth(toMonthStart(defaultDate));
    setConfirmedDate(null);
    setDateButtonState('idle');
    setDraftSlot(null);
    const initialForm = buildInitialForm(defaultCity, defaultState);
    setFormValues(initialForm);
    setSelectedCity(initialForm.clientCity || defaultCity);
    setAddressInput(buildInitialAddressInput());
    setSelectedAddress(null);
    setValidationErrors({});
    setSuccessMessage(null);
    setVerificationState(null);
    setCalendarExpanded(false);
  }, [defaultCity, defaultDate, defaultState, open]);

  useEffect(() => {
    setFormValues((current) => {
      if (current.clientCity === selectedCity) {
        return {
          ...current,
          clientState: current.clientState || defaultState,
        };
      }

      const next = {
        ...current,
        clientCity: selectedCity,
        clientState: current.clientState || defaultState,
        clientStreet: '',
        clientNeighborhood: '',
        clientNumber: '',
        clientCep: '',
      };
      saveStoredBookingDraft(next, '');
      return next;
    });
    setAddressInput((current) => {
      if (formValues.clientCity === selectedCity) return current;
      return '';
    });
    setSelectedAddress(null);
    setValidationErrors((current) => {
      const next = { ...current };
      delete next.addressInput;
      delete next.clientNumber;
      return next;
    });
  }, [defaultState, formValues.clientCity, selectedCity]);

  useEffect(() => {
    if (!confirmedDate) {
      setDraftSlot(null);
      return;
    }
    const selectedStillAvailable = availableSlots.some(
      (slot) => slot.startTime === draftSlot?.startTime && slot.date === draftSlot?.date,
    );
    if (!selectedStillAvailable) setDraftSlot(null);
  }, [availableSlots, confirmedDate, draftSlot]);

  useEffect(() => {
    if (!open) {
      setVerificationState(null);
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (verificationState) {
          setVerificationState(null);
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, verificationState]);

  if (!open) return null;

  const handleFieldChange = <K extends keyof BookingFormValues>(key: K, value: BookingFormValues[K]) => {
    setFormValues((current) => {
      const next = { ...current, [key]: value };
      saveStoredBookingDraft(next, addressInput);
      return next;
    });
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
    setFormValues((current) => {
      const next = {
        ...current,
        clientCep: digitsOnly(suggestion.postcode ?? current.clientCep).slice(0, 8),
        clientStreet: normalizeText(suggestion.street || suggestion.addressLine1 || suggestion.formatted),
        clientNeighborhood: normalizeText(suggestion.neighborhood || current.clientNeighborhood),
        clientNumber: normalizeText(suggestion.houseNumber),
        clientComplement: '',
        clientCity: selectedCity,
        clientState: normalizeText((suggestion.stateCode || suggestion.state || current.clientState || defaultState)).toUpperCase(),
      };
      saveStoredBookingDraft(next, suggestion.formatted);
      return next;
    });
    setValidationErrors((current) => {
      const next = { ...current };
      delete next.addressInput;
      delete next.clientNumber;
      delete next.clientComplement;
      return next;
    });
  };

  const handleAddressChange = (value: string) => {
    setAddressInput(value);
    setSelectedAddress(null);
    setFormValues((current) => {
      const next = {
        ...current,
        clientStreet: value,
        clientNeighborhood: '',
        clientNumber: '',
        clientComplement: '',
        clientCep: '',
        clientCity: selectedCity,
      };
      saveStoredBookingDraft(next, value);
      return next;
    });
    setValidationErrors((current) => {
      const next = { ...current };
      delete next.addressInput;
      delete next.clientNumber;
      delete next.clientComplement;
      return next;
    });
  };

  const handleConfirmDay = async () => {
    if (disabledDateSet.has(calendarDate)) return;
    setDateButtonState('loading');
    setDraftSlot(null);
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    setConfirmedDate(calendarDate);
    setDateButtonState('success');
    setValidationErrors((current) => {
      const next = { ...current };
      delete next.draftSlot;
      return next;
    });
  };

  const handleEditDay = () => {
    setConfirmedDate(null);
    setDateButtonState('idle');
    setDraftSlot(null);
  };

  const handleSubmit = async () => {
    const errors = validateForm(formValues, addressInput, selectedCity, selectedAddress, draftSlot);
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0 || !draftSlot) return;

    const normalizedComplement = normalizeText(formValues.clientComplement);
    saveStoredBookingDraft(formValues, addressInput);

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
        clientNumber: buildPersistedNumber(formValues.clientNumber, normalizedComplement),
        clientComplement: undefined,
        clientCity: selectedCity,
        clientState: normalizeText(formValues.clientState || defaultState).slice(0, 2).toUpperCase(),
      });

      saveManageToken(response.manageToken);
      const newEvent = mapServicoToCalendarEvent(response.servico);
      saveLocalCalendarEvent(newEvent);
      onBookingCreated?.(newEvent);
      setSuccessMessage('Agendamento criado. Agora confirme o telefone para concluir.');
      setVerificationState({
        phone: formValues.clientPhone,
        verificationId: response.verificationId,
        expiresInSeconds: response.expiresInSeconds,
        resendAfterSeconds: response.resendAfterSeconds,
      });
    } catch (error) {
      createBookingMutation.reset();

      if (isPendingConfirmationConflict(error)) {
        saveStoredBookingDraft(formValues, addressInput);
        window.sessionStorage.setItem('calendar.recovery.prefillPhone', formValues.clientPhone);
        setSuccessMessage('Você já tem um agendamento pendente. Confirme o telefone para continuar.');
        requestOpenProfile();
        return;
      }

      const message = mapCreateError((error as Error).message || 'Erro ao criar agendamento.');
      setValidationErrors((current) => ({ ...current, addressInput: message === GENERIC_ADDRESS_ERROR ? message : current.addressInput }));
    }
  };

  const handleVerified = () => {
    setVerificationState(null);
    setSuccessMessage('Agendamento confirmado com sucesso.');
    window.setTimeout(() => onClose(), 700);
  };

  const submitDisabled = createBookingMutation.isPending || !confirmedDate || isLoadingSlots;
  const backendError = createBookingMutation.error ? mapCreateError(createBookingMutation.error.message) : null;
  const shouldShowComplementField = Boolean(selectedAddress);
  const shouldShowNumberField = Boolean(selectedAddress && !normalizeText(selectedAddress.houseNumber));
  const durationLabel = formatDurationLabel(bookingDurationMinutes);
  const monthTitle = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(toLocalDate(calendarMonth));
  const selectedDayDisabled = disabledDateSet.has(calendarDate);
  const sectionTitle = confirmedDate ? formatDate(confirmedDate) : 'Selecione um dia no calendário';

  return (
    <>
      <div className="booking-preview-modal" role="dialog" aria-modal="true">
        <button type="button" className="booking-preview-modal__backdrop" onClick={onClose} aria-label="Fechar modal" />

        <div className="booking-preview-modal__card booking-preview-modal__card--form booking-preview-modal__card--wide booking-preview-modal__card--city-refined booking-preview-modal__card--calendar-picker">
          <div className="booking-preview-modal__header">
            <div>
              <span className="booking-preview-modal__eyebrow">Novo agendamento</span>
              <h3 className="booking-preview-modal__title">{sectionTitle}</h3>
            </div>
            <button type="button" className="booking-preview-modal__close" onClick={onClose} aria-label="Fechar">×</button>
          </div>

          <div className="booking-preview-modal__body booking-preview-modal__body--form booking-preview-modal__body--calendar-picker">
            <section className={["booking-day-picker", calendarExpanded ? 'booking-day-picker--expanded' : ''].filter(Boolean).join(' ')}>
              <div className="booking-day-picker__intro">
                <div>
                  <strong>Selecione um dia no calendário</strong>
                  <span>O próximo dia disponível já vem pré-selecionado.</span>
                </div>
                <button type="button" className="booking-day-picker__expand" onClick={() => setCalendarExpanded((current) => !current)}>
                  {calendarExpanded ? 'Reduzir calendário' : 'Aumentar calendário'}
                </button>
              </div>

              <div className="booking-day-picker__card">
                <div className="booking-day-picker__hero">
                  <div>
                    <strong>{calendarDate.slice(8, 10)}</strong>
                    <span>{new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(toLocalDate(calendarDate))}</span>
                  </div>
                  <div className="booking-day-picker__nav">
                    <button type="button" onClick={() => setCalendarMonth(shiftMonth(calendarMonth, -1))} aria-label="Mês anterior">‹</button>
                    <button type="button" onClick={() => setCalendarMonth(shiftMonth(calendarMonth, 1))} aria-label="Próximo mês">›</button>
                  </div>
                </div>

                <div className="booking-day-picker__month-label">{monthTitle}</div>
                <div className="booking-day-picker__weekdays">
                  {WEEKDAY_LABELS.map((label) => <span key={label}>{label}</span>)}
                </div>
                <div className="booking-day-picker__grid">
                  {monthGrid.map((cell) => (
                    <button
                      key={cell.date}
                      type="button"
                      className={[
                        'booking-day-picker__day',
                        cell.isCurrentMonth ? '' : 'booking-day-picker__day--muted',
                        calendarDate === cell.date ? 'booking-day-picker__day--selected' : '',
                        confirmedDate === cell.date ? 'booking-day-picker__day--confirmed' : '',
                        cell.isDisabled ? 'booking-day-picker__day--disabled' : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => {
                        if (cell.isDisabled) return;
                        setCalendarDate(cell.date);
                        setCalendarMonth(toMonthStart(cell.date));
                        if (dateButtonState === 'success') {
                          setConfirmedDate(null);
                          setDateButtonState('idle');
                          setDraftSlot(null);
                        }
                      }}
                    >
                      {`${cell.label}`.padStart(2, '0')}
                    </button>
                  ))}
                </div>

                <div className={["booking-day-picker__actions", dateButtonState === 'success' ? 'booking-day-picker__actions--confirmed' : ''].filter(Boolean).join(' ')}>
                  <button
                    type="button"
                    className={[
                      'booking-day-picker__confirm',
                      dateButtonState === 'success' ? 'booking-day-picker__confirm--success' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => void handleConfirmDay()}
                    disabled={selectedDayDisabled || dateButtonState === 'loading'}
                  >
                    {dateButtonState === 'loading' ? <SpinnerIcon /> : null}
                    {dateButtonState === 'success' ? <CheckIcon /> : null}
                    {dateButtonState === 'idle' ? 'Selecionar dia' : null}
                    {dateButtonState === 'success' ? 'Dia confirmado' : null}
                  </button>

                  {dateButtonState === 'success' ? (
                    <button type="button" className="booking-day-picker__edit" onClick={handleEditDay} aria-label="Alterar dia">
                      <EditIcon />
                    </button>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="booking-time-panel">
              <div className="booking-preview-modal__summary booking-preview-modal__summary--slots booking-preview-modal__summary--calendar-picker">
                <div>
                  <span>Janela da visita</span>
                  <strong>{draftSlot ? `${draftSlot.startTime} - ${draftSlot.endTime ?? ''}` : confirmedDate ? 'Escolha um horário' : 'Confirme o dia acima'}</strong>
                </div>
                <small>{dayEvents.length} já marcado(s) no dia</small>
              </div>

              {successMessage ? (
                <AlertNotice variant="success" title="Fluxo iniciado com sucesso" compact>
                  <p>{successMessage}</p>
                </AlertNotice>
              ) : null}

              {!confirmedDate ? (
                <AlertNotice variant="info" title="Dia pendente de confirmação" compact>
                  <p>Escolha um dia no mini calendário e toque em <strong>Selecionar dia</strong>.</p>
                </AlertNotice>
              ) : null}

              {confirmedUnavailable ? (
                <AlertNotice variant="warning" title="Dia indisponível" compact>
                  <p>Escolha outro dia para continuar.</p>
                </AlertNotice>
              ) : null}

              {confirmedDate ? (
                <>
                  <div className="booking-preview-modal__section-heading"><span>Horários</span></div>
                  {validationErrors.draftSlot ? (
                    <AlertNotice variant="warning" title="Selecione um horário" compact>
                      <p>{validationErrors.draftSlot}</p>
                    </AlertNotice>
                  ) : null}
                  {isLoadingSlots ? <div className="booking-preview-modal__empty"><strong>Carregando horários...</strong></div> : null}
                  {slotsError ? (
                    <AlertNotice variant="danger" title="Falha ao carregar horários" compact>
                      <p>{slotsError.message}</p>
                    </AlertNotice>
                  ) : null}
                  {!isLoadingSlots && availableSlots.length === 0 ? (
                    <AlertNotice variant="warning" title="Sem horários disponíveis" compact>
                      <p>Esse dia está sem slots livres no momento.</p>
                    </AlertNotice>
                  ) : null}
                  {availableSlots.length > 0 ? (
                    <div className="booking-preview-modal__slots-grid booking-preview-modal__slots-grid--compact">
                      {availableSlots.map((slot) => {
                        const isSelected = draftSlot?.date === slot.date && draftSlot?.startTime === slot.startTime;
                        return (
                          <button
                            key={`${slot.date}-${slot.startTime}`}
                            type="button"
                            className={['booking-slot', 'booking-slot--available', isSelected ? 'booking-slot--selected' : ''].filter(Boolean).join(' ')}
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
                </>
              ) : null}

              <div className="booking-preview-modal__section-heading"><span>Seus dados</span></div>
              <div className="booking-form-grid booking-form-grid--compact">
                <label className="booking-form__field booking-form__field--with-error"><span>Nome</span><input value={formValues.clientFirstName} onChange={(event) => handleFieldChange('clientFirstName', event.target.value)} className="booking-form__input" placeholder="Pedro" />{validationErrors.clientFirstName ? <small className="booking-form__field-error">{validationErrors.clientFirstName}</small> : null}</label>
                <label className="booking-form__field booking-form__field--with-error"><span>Sobrenome</span><input value={formValues.clientLastName} onChange={(event) => handleFieldChange('clientLastName', event.target.value)} className="booking-form__input" placeholder="Silva" />{validationErrors.clientLastName ? <small className="booking-form__field-error">{validationErrors.clientLastName}</small> : null}</label>
                <label className="booking-form__field booking-form__field--with-error"><span>E-mail</span><input value={formValues.clientEmail} onChange={(event) => handleFieldChange('clientEmail', event.target.value)} className="booking-form__input" type="email" placeholder="voce@email.com" />{validationErrors.clientEmail ? <small className="booking-form__field-error">{validationErrors.clientEmail}</small> : null}</label>
                <label className="booking-form__field booking-form__field--with-error"><span>Telefone</span><input value={formValues.clientPhone} onChange={(event) => handleFieldChange('clientPhone', formatPhoneInput(event.target.value))} className="booking-form__input" inputMode="tel" placeholder="(31) 99999-9999" />{validationErrors.clientPhone ? <small className="booking-form__field-error">{validationErrors.clientPhone}</small> : null}</label>

                <div className="booking-form__field booking-form__field--full">
                  <span>Cidade</span>
                  <div className="booking-city-picker">
                    {primaryCities.map((city, index) => (
                      <button key={city} type="button" className={['booking-city-choice', selectedCity === city ? 'booking-city-choice--active' : 'booking-city-choice--muted'].join(' ')} onClick={() => setSelectedCity(city)}>
                        <span className="booking-city-choice__icon">{String.fromCharCode(65 + index)}</span>
                        <span>{city}</span>
                      </button>
                    ))}
                    {extraCities.length > 0 ? (
                      <label className={['booking-city-select', !primaryCities.includes(selectedCity) ? 'booking-city-select--active' : 'booking-city-select--muted'].join(' ')}>
                        <span className="booking-city-choice__icon">+</span>
                        <select value={primaryCities.includes(selectedCity) ? '' : selectedCity} onChange={(event) => setSelectedCity(event.target.value || extraCities[0])}>
                          <option value="">Outras</option>
                          {extraCities.map((city) => <option key={city} value={city}>{city}</option>)}
                        </select>
                      </label>
                    ) : null}
                  </div>
                  <small className="booking-form__hint">Duração estimada deste atendimento: <strong>{durationLabel}</strong>.</small>
                </div>

                {!selectedAddress ? (
                  <div className="booking-form__field booking-form__field--full">
                    <AlertNotice variant="info" title="Confirme o endereço pela lista" compact>
                      <p>Escolha uma sugestão para validar cidade, rua e CEP antes de concluir.</p>
                    </AlertNotice>
                  </div>
                ) : null}

                <label className="booking-form__field booking-form__field--full booking-form__field--with-error">
                  <span>Endereço</span>
                  <AddressAutocompleteField value={addressInput} selectedCity={selectedCity} onChange={handleAddressChange} onSelectSuggestion={handleAddressSelect} />
                  {validationErrors.addressInput ? <small className="booking-form__field-error">{validationErrors.addressInput}</small> : null}
                </label>

                {shouldShowNumberField ? (
                  <label className="booking-form__field booking-form__field--with-error">
                    <span>Número</span>
                    <input value={formValues.clientNumber} onChange={(event) => handleFieldChange('clientNumber', event.target.value)} className="booking-form__input" inputMode="numeric" placeholder="123" />
                    {validationErrors.clientNumber ? <small className="booking-form__field-error">{validationErrors.clientNumber}</small> : null}
                  </label>
                ) : null}

                {shouldShowComplementField ? (
                  <label className={['booking-form__field', shouldShowNumberField ? '' : 'booking-form__field--full'].filter(Boolean).join(' ')}>
                    <span>Complemento</span>
                    <input value={formValues.clientComplement} onChange={(event) => handleFieldChange('clientComplement', event.target.value)} className="booking-form__input" placeholder="Apto, bloco, referência..." />
                  </label>
                ) : null}
              </div>

              {backendError && backendError !== GENERIC_ADDRESS_ERROR ? (
                <AlertNotice variant="danger" title="Não foi possível concluir o agendamento" compact>
                  <p>{backendError}</p>
                </AlertNotice>
              ) : null}
            </section>
          </div>

          <div className="booking-preview-modal__footer booking-preview-modal__footer--compact">
            <button type="button" className="secondary-action" onClick={onClose}>Cancelar</button>
            <button type="button" className="primary-action" disabled={submitDisabled} onClick={() => void handleSubmit()}>
              {createBookingMutation.isPending ? 'Agendando...' : 'Agendar visita'}
            </button>
          </div>
        </div>
      </div>

      <OtpConfirmModal
        open={Boolean(verificationState)}
        phone={verificationState?.phone ?? ''}
        verificationId={verificationState?.verificationId ?? ''}
        expiresInSeconds={verificationState?.expiresInSeconds ?? 0}
        resendAfterSeconds={verificationState?.resendAfterSeconds ?? 0}
        onClose={() => setVerificationState(null)}
        onVerified={handleVerified}
      />
    </>
  );
}
