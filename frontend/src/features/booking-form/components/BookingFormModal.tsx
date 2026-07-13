import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import '../../../styles/components/booking-modal-day-picker.css';
import { useAvailableSlots } from '../../calendar/hooks/useAvailableSlots';
import { useAvailableMonthDates } from '../../calendar/hooks/useAvailableMonthDates';
import type { CalendarEvent } from '../../calendar/types';
import { useCreateBooking } from '../../bookings/hooks/useCreateBooking';
import OtpConfirmModal from '../../otp/components/OtpConfirmModal';
import AddressAutocompleteField from './AddressAutocompleteField';
import type { AddressSuggestion } from '../hooks/useAddressSuggestions';
import { getStoredPhoneVerification, saveLocalCalendarEvent, saveManageToken, savePhoneVerification } from '../../../lib/storage';
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
  getMaxFutureMonthsAhead,
  getSlotMinutes,
} from '../../../lib/bootstrap-config';
import { usePublicBootstrap } from '../../public-config/hooks/usePublicBootstrap';
import AlertNotice from '../../../components/ui/AlertNotice';
import { normalizeApiErrorMessage } from '../../../lib/errors';
import cityBeloHorizonteIcon from '../../../assets/wireframes/icons/city-belo-horizonte.svg';
import cityItabiritoIcon from '../../../assets/wireframes/icons/city-itabirito.svg';
import cityMoedaIcon from '../../../assets/wireframes/icons/city-moeda.svg';
import cityNovaLimaIcon from '../../../assets/wireframes/icons/city-nova-lima.svg';
import cityOuroPretoIcon from '../../../assets/wireframes/icons/city-ouro-preto.svg';
import { buildSuggestionInputValue, buildSuggestionStreetLine, getSuggestionHouseNumber, shouldShowManualHouseNumber } from '../utils/address-selection';
import { getBookingDayButtonClassName } from '../utils/day-picker';
import { formatPhoneInput as formatBrazilianPhoneInput, isValidMobilePhone, normalizePhone } from '../../../lib/authRole';

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
  serviceNotes: '',
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

function endOfMonth(monthStart: string): string {
  const base = toLocalDate(monthStart);
  return toIsoDate(new Date(base.getFullYear(), base.getMonth() + 1, 0));
}

function buildCalendarCells(monthStart: string, disabledDates: Set<string>, minDate: string, maxDate: string): CalendarCell[] {
  const monthDate = toLocalDate(monthStart);
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + index);
    const iso = toIsoDate(cellDate);
    const isCurrentMonth = cellDate.getMonth() === monthDate.getMonth();
    const isDisabled = !isCurrentMonth || iso < minDate || iso > maxDate || disabledDates.has(iso);

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

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(toLocalDate(dateString));
}

function formatPhoneInput(value: string): string {
  return formatBrazilianPhoneInput(value);
}

function isHouseNumberValid(value: string) {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) return false;
  if (/^(s\/?n|sem numero|sem número)$/.test(normalized)) return true;
  if (/^\d{1,6}[a-z]?([-/]\d{1,4})?$/i.test(normalized)) return true;
  return /^(casa|apto|apartamento|lote|loja|sala|bloco|fundos|galpao|galpão)\s+[a-z0-9 ./-]{1,24}$/i.test(normalized);
}

function normalizeHouseNumber(value: string) {
  const normalized = normalizeText(value).replace(/\s+/g, ' ');
  if (/^(s\/?n|sem numero|sem número)$/i.test(normalized)) return 'S/N';
  return normalized;
}

function isServiceNotesValid(value: string) {
  return normalizeText(value).replace(/\s+/g, ' ').length >= 10;
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
    notes: servico.serviceNotes,
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

function validateForm(
  values: BookingFormValues,
  addressInput: string,
  selectedCity: string,
  selectedSuggestion: AddressSuggestion | null,
  selectedSlot: HomeSelectedSlot,
): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!normalizeText(values.clientFirstName)) errors.clientFirstName = 'Nome: informe seu primeiro nome. Exemplo: Pedro.';
  if (!normalizeText(values.clientLastName)) errors.clientLastName = 'Sobrenome: informe pelo menos um sobrenome. Exemplo: Silva.';
  if (!isEmailValid(values.clientEmail)) errors.clientEmail = 'E-mail: use um e-mail valido com @ e dominio. Exemplo: voce@email.com.';
  const phoneDigits = normalizePhone(values.clientPhone);
  if (!isValidMobilePhone(phoneDigits)) errors.clientPhone = 'Telefone: informe um celular com DDD + 9 digitos. Exemplo: (31) 99999-9999.';
  if (!selectedSlot) errors.draftSlot = 'Horario: selecione um dos horarios disponiveis.';
  if (!isServiceNotesValid(values.serviceNotes)) errors.serviceNotes = 'Observacao: explique o que precisa de servico com pelo menos 10 caracteres. Exemplo: trocar tomada da sala.';

  const hasStructuredAddress = Boolean(
    selectedSuggestion &&
    normalizeText(values.clientStreet) &&
    normalizeText(values.clientNeighborhood),
  );
  const suggestionMatchesCity = Boolean(
    selectedSuggestion &&
    (!selectedSuggestion.city || normalizeCity(selectedSuggestion.city) === normalizeCity(selectedCity)),
  );

  const addressNumber = selectedSuggestion ? getSuggestionHouseNumber(selectedSuggestion) || values.clientNumber : values.clientNumber;
  if (selectedSuggestion && !isHouseNumberValid(addressNumber)) {
    errors.clientNumber = 'Numero: informe 123, 123A, Casa 2, Lote 5 ou S/N.';
  }

  if (!normalizeText(addressInput) || !hasStructuredAddress || !suggestionMatchesCity) {
    errors.addressInput = 'Endereco: escolha uma sugestao da lista para validar rua e bairro. Exemplo: Rua Sao Jose, Centro.';
  }

  return errors;
}

function isPendingConfirmationConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const status = Number((error as { status?: unknown }).status ?? 0);
  const code = String((error as { code?: unknown }).code ?? '');
  return status === 409 && code === 'PENDING_CONFIRMATION_EXISTS';
}

function mapCreateError(error: unknown): string {
  const message = normalizeApiErrorMessage(error, { context: 'createBooking' });
  const normalized = message.toLowerCase();
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
  return message;
}

type CityVisual = {
  background: string;
  icon: string;
};

function normalizeCityKey(city: string) {
  return city.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function getCityVisual(city: string): CityVisual {
  const normalized = normalizeCityKey(city);
  if (normalized.includes('belo horizonte')) return { background: '#3559d8', icon: cityBeloHorizonteIcon };
  if (normalized.includes('ouro preto')) return { background: '#4f46e5', icon: cityOuroPretoIcon };
  if (normalized.includes('moeda')) return { background: '#d97706', icon: cityMoedaIcon };
  if (normalized.includes('nova lima')) return { background: '#0f9f6e', icon: cityNovaLimaIcon };
  return { background: '#f97316', icon: cityItabiritoIcon };
}

function CityPickerButton({
  city,
  active,
  onClick,
}: {
  city: string;
  active: boolean;
  onClick: () => void;
}) {
  const visual = getCityVisual(city);
  return (
    <button
      type="button"
      className={['booking-city-submodal__option', active ? 'booking-city-submodal__option--active' : ''].filter(Boolean).join(' ')}
      style={{ '--city-bg': visual.background } as CSSProperties}
      onClick={onClick}
    >
      <span className="booking-city-submodal__icon"><img src={visual.icon} alt="" /></span>
      <span>{city}</span>
    </button>
  );
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
  events,
  onClose,
  onBookingCreated,
}: BookingFormModalProps) {
  const todayIso = getTodayIso();
  const currentAllowedMonth = toMonthStart(todayIso);
  const { data: bootstrap } = usePublicBootstrap(open);
  const maxFutureMonthsAhead = getMaxFutureMonthsAhead(bootstrap);
  const maxAllowedMonth = shiftMonth(currentAllowedMonth, maxFutureMonthsAhead);
  const maxDate = useMemo(() => endOfMonth(maxAllowedMonth), [maxAllowedMonth]);
  const initialCalendarMonth = useMemo(
    () => selectedDate >= todayIso && selectedDate <= maxDate ? toMonthStart(selectedDate) : currentAllowedMonth,
    [currentAllowedMonth, maxDate, selectedDate, todayIso],
  );

  const [calendarDate, setCalendarDate] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(initialCalendarMonth);
  const [confirmedDate, setConfirmedDate] = useState<string | null>(null);
  const [dateButtonState, setDateButtonState] = useState<'idle' | 'loading' | 'success'>('idle');
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [draftSlot, setDraftSlot] = useState<HomeSelectedSlot>(null);
  const [formValues, setFormValues] = useState<BookingFormValues>(() => buildInitialForm());
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [addressInput, setAddressInput] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [verificationState, setVerificationState] = useState<VerificationState | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const createBookingInFlightRef = useRef(false);

  const allowedCities = useMemo(() => getAllowedCities(bootstrap), [bootstrap]);
  const defaultCity = useMemo(() => getDefaultCity(bootstrap), [bootstrap]);
  const defaultState = useMemo(() => getDefaultState(bootstrap), [bootstrap]);
  const slotMinutes = getSlotMinutes(bootstrap);
  const bookingDurationMinutes = getBookingDurationMinutesByCity(bootstrap, selectedCity || defaultCity);
  const effectiveCity = selectedCity || defaultCity;
  const selectedCityVisual = getCityVisual(effectiveCity);
  const monthAvailability = useAvailableMonthDates(
    currentAllowedMonth,
    open && Boolean(effectiveCity),
    effectiveCity,
    slotMinutes,
    bookingDurationMinutes,
    maxFutureMonthsAhead,
  );
  const availableDateSet = useMemo(() => new Set(monthAvailability.availableDates), [monthAvailability.availableDates]);
  const disabledDateSet = useMemo(
    () => new Set(monthAvailability.monthDates.filter((date) => !availableDateSet.has(date))),
    [availableDateSet, monthAvailability.monthDates],
  );
  const effectiveDate = confirmedDate ?? '';
  const visibleDate = confirmedDate ?? calendarDate;

  const monthGrid = useMemo(
    () => buildCalendarCells(calendarMonth, disabledDateSet, todayIso, maxDate),
    [calendarMonth, disabledDateSet, maxDate, todayIso],
  );

  const confirmedUnavailable = Boolean(confirmedDate && (confirmedDate < todayIso || confirmedDate > maxDate || disabledDateSet.has(confirmedDate)));
  const { data: availableSlots = [], isLoading: isLoadingSlots, error: slotsError, refetch: refetchAvailableSlots } = useAvailableSlots(
    effectiveDate,
    effectiveCity,
    slotMinutes,
    bookingDurationMinutes,
    open && Boolean(confirmedDate) && !confirmedUnavailable,
  );
  const createBookingMutation = useCreateBooking();
  const { requestOpenProfile } = useHomeBookingSelection();
  const dayEvents = useMemo(() => events.filter((event) => event.date === visibleDate), [events, visibleDate]);

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
    setCalendarDate('');
    setCalendarMonth(initialCalendarMonth);
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
    setCityPickerOpen(false);
    createBookingInFlightRef.current = false;
  }, [defaultCity, defaultState, initialCalendarMonth, open]);

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
        clientComplement: '',
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
    setCalendarDate('');
    setConfirmedDate(null);
    setDateButtonState('idle');
    setDraftSlot(null);
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
    const houseNumber = getSuggestionHouseNumber(suggestion);
    const displayAddress = buildSuggestionInputValue(suggestion);
    setSelectedAddress(suggestion);
    setAddressInput(displayAddress);
    setFormValues((current) => {
      const next = {
        ...current,
        clientCep: '',
        clientStreet: normalizeText(buildSuggestionStreetLine(suggestion)),
        clientNeighborhood: normalizeText(suggestion.neighborhood || current.clientNeighborhood),
        clientNumber: normalizeText(houseNumber),
        clientComplement: '',
        clientCity: effectiveCity,
        clientState: normalizeText((suggestion.stateCode || suggestion.state || current.clientState || defaultState)).toUpperCase(),
      };
      saveStoredBookingDraft(next, displayAddress);
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
        clientCity: effectiveCity,
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
    if (!calendarDate || calendarDate < todayIso || calendarDate > maxDate || !availableDateSet.has(calendarDate)) return;
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
    if (createBookingInFlightRef.current || createBookingMutation.isPending || successMessage) return;

    const errors = validateForm(formValues, addressInput, effectiveCity, selectedAddress, draftSlot);
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0 || !draftSlot) return;

    const normalizedComplement = normalizeText(formValues.clientComplement);
    const selectedHouseNumber = getSuggestionHouseNumber(selectedAddress);
    const effectiveHouseNumber = normalizeHouseNumber(selectedHouseNumber || formValues.clientNumber);
    saveStoredBookingDraft(formValues, addressInput);
    createBookingInFlightRef.current = true;

    try {
      const response = await createBookingMutation.mutateAsync({
        serviceType: DEFAULT_SERVICE_TYPE,
        serviceNotes: normalizeText(formValues.serviceNotes).replace(/\s+/g, ' '),
        date: draftSlot.date,
        time: draftSlot.startTime,
        clientFirstName: normalizeText(formValues.clientFirstName),
        clientLastName: normalizeText(formValues.clientLastName),
        clientEmail: normalizeText(formValues.clientEmail),
        clientPhone: normalizePhone(formValues.clientPhone),
        clientCep: '',
        clientStreet: normalizeText(formValues.clientStreet),
        clientNeighborhood: normalizeText(formValues.clientNeighborhood),
        clientNumber: effectiveHouseNumber,
        clientComplement: normalizedComplement || undefined,
        clientCity: effectiveCity,
        clientState: normalizeText(formValues.clientState || defaultState).slice(0, 2).toUpperCase(),
        clientLatitude: selectedAddress?.lat ?? selectedAddress?.latitude,
        clientLongitude: selectedAddress?.lon ?? selectedAddress?.longitude,
      });

      saveManageToken(response.manageToken, response.servico.eventId);
      const newEvent = mapServicoToCalendarEvent(response.servico);
      saveLocalCalendarEvent(newEvent);
      onBookingCreated?.(newEvent);
      if (response.verificationId) {
        setSuccessMessage('Agendamento criado. Agora confirme o telefone para concluir.');
        setVerificationState({
          phone: formValues.clientPhone,
          verificationId: response.verificationId,
          expiresInSeconds: response.expiresInSeconds,
          resendAfterSeconds: response.resendAfterSeconds,
        });
      } else {
        savePhoneVerification(formValues.clientPhone);
        setSuccessMessage('Agendamento confirmado com sucesso.');
        window.setTimeout(() => onClose(), 700);
      }
    } catch (error) {
      createBookingInFlightRef.current = false;
      createBookingMutation.reset();

      if (isPendingConfirmationConflict(error)) {
        saveStoredBookingDraft(formValues, addressInput);
        window.sessionStorage.setItem('calendar.recovery.prefillPhone', formValues.clientPhone);
        setSuccessMessage('Você já tem um agendamento pendente. Confirme o telefone para continuar.');
        requestOpenProfile();
        return;
      }

      const message = mapCreateError(error);
      setValidationErrors((current) => ({ ...current, addressInput: message === GENERIC_ADDRESS_ERROR ? message : current.addressInput }));
    }
  };

  const handleVerified = () => {
    savePhoneVerification(verificationState?.phone ?? formValues.clientPhone);
    setVerificationState(null);
    setSuccessMessage('Agendamento confirmado com sucesso.');
    window.setTimeout(() => onClose(), 700);
  };

  const submitDisabled = createBookingMutation.isPending || Boolean(successMessage) || !confirmedDate || isLoadingSlots;
  const createBookingErrorMessage = createBookingMutation.error ? mapCreateError(createBookingMutation.error) : null;
  const shouldShowComplementField = Boolean(selectedAddress);
  const shouldShowNumberField = shouldShowManualHouseNumber(selectedAddress);
  const durationLabel = formatDurationLabel(bookingDurationMinutes);
  const monthTitle = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(toLocalDate(calendarMonth));
  const canGoPrevMonth = calendarMonth > currentAllowedMonth;
  const canGoNextMonth = calendarMonth < maxAllowedMonth;
  const selectedDayDisabled = !calendarDate || calendarDate < todayIso || calendarDate > maxDate || !availableDateSet.has(calendarDate);
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
                  <span>Nenhum dia vem pré-selecionado; os dias ativos aparecem conforme a agenda disponível.</span>
                </div>
                <button type="button" className="booking-day-picker__expand" onClick={() => setCalendarExpanded((current) => !current)}>
                  {calendarExpanded ? 'Reduzir calendário' : 'Aumentar calendário'}
                </button>
              </div>

              <div className="booking-day-picker__card">
                <div className="booking-day-picker__hero">
                  <div>
                    <strong>{calendarDate ? calendarDate.slice(8, 10) : '--'}</strong>
                    <span>{calendarDate ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(toLocalDate(calendarDate)) : monthTitle}</span>
                  </div>
                  <div className="booking-day-picker__nav">
                    <button type="button" onClick={() => { if (canGoPrevMonth) setCalendarMonth(shiftMonth(calendarMonth, -1)); }} disabled={!canGoPrevMonth} aria-label="Mês anterior">‹</button>
                    <button type="button" onClick={() => { if (canGoNextMonth) setCalendarMonth(shiftMonth(calendarMonth, 1)); }} disabled={!canGoNextMonth} aria-label="Próximo mês">›</button>
                  </div>
                </div>

                <div className="booking-day-picker__month-label">{monthTitle}</div>
                {monthAvailability.isLoading ? <div className="booking-preview-modal__empty"><strong>Carregando dias disponiveis...</strong></div> : null}
                {monthAvailability.hasError ? (
                  <AlertNotice variant="warning" title="Falha ao carregar dias" compact actionLabel="Tentar novamente" onAction={() => void monthAvailability.refetch()}>
                    <p>{normalizeApiErrorMessage(monthAvailability.error, { context: 'availability' })}</p>
                  </AlertNotice>
                ) : null}
                <div className="booking-day-picker__weekdays">
                  {WEEKDAY_LABELS.map((label) => <span key={label}>{label}</span>)}
                </div>
                <div className="booking-day-picker__grid">
                  {monthGrid.map((cell) => (
                    <button
                      key={cell.date}
                      type="button"
                      className={getBookingDayButtonClassName({
                        cellDate: cell.date,
                        isCurrentMonth: cell.isCurrentMonth,
                        isDisabled: cell.isDisabled,
                        calendarDate,
                        confirmedDate,
                      })}
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
                    <AlertNotice variant="danger" title="Falha ao carregar horários" compact actionLabel="Tentar novamente" onAction={() => void refetchAvailableSlots()}>
                      <p>{normalizeApiErrorMessage(slotsError, { context: 'availability' })}</p>
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
                  <div className="booking-city-picker booking-city-picker--submodal">
                    <button
                      type="button"
                      className="booking-city-choice booking-city-choice--active booking-city-choice--launcher"
                      style={{ '--city-bg': selectedCityVisual.background } as CSSProperties}
                      onClick={() => setCityPickerOpen(true)}
                    >
                      <span className="booking-city-choice__icon"><img src={selectedCityVisual.icon} alt="" /></span>
                      <span>{effectiveCity}</span>
                    </button>
                    {cityPickerOpen ? (
                      <div className="booking-city-submodal-backdrop" onMouseDown={() => setCityPickerOpen(false)}>
                        <div className="booking-city-submodal" role="dialog" aria-modal="true" aria-labelledby="booking-city-submodal-title" onMouseDown={(event) => event.stopPropagation()}>
                          <div className="booking-city-submodal__header">
                            <strong id="booking-city-submodal-title">Selecione sua cidade</strong>
                            <button type="button" onClick={() => setCityPickerOpen(false)} aria-label="Fechar cidades">x</button>
                          </div>
                          <div className="booking-city-submodal__grid">
                            {allowedCities.map((city) => (
                              <CityPickerButton
                                key={city}
                                city={city}
                                active={effectiveCity === city}
                                onClick={() => {
                                  setSelectedCity(city);
                                  setCityPickerOpen(false);
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <small className="booking-form__hint">Duração estimada deste atendimento: <strong>{durationLabel}</strong>.</small>
                </div>

                {!selectedAddress ? (
                  <div className="booking-form__field booking-form__field--full">
                    <AlertNotice variant="info" title="Confirme o endereço pela lista" compact>
                      <p>Escolha uma sugestão para validar cidade, rua e bairro antes de concluir.</p>
                    </AlertNotice>
                  </div>
                ) : null}

                <div className={['booking-address-composite', shouldShowNumberField ? 'booking-address-composite--with-number' : ''].filter(Boolean).join(' ')}>
                  <label className="booking-form__field booking-form__field--with-error booking-address-composite__address">
                    <span>Endereço</span>
                    <AddressAutocompleteField value={addressInput} selectedCity={effectiveCity} selectedState={formValues.clientState || defaultState} onChange={handleAddressChange} onSelectSuggestion={handleAddressSelect} />
                    {validationErrors.addressInput ? <small className="booking-form__field-error">{validationErrors.addressInput}</small> : null}
                  </label>

                  {shouldShowNumberField ? (
                    <label className="booking-form__field booking-form__field--with-error booking-form__field--number-compact booking-address-composite__number">
                      <span>Número</span>
                      <input value={formValues.clientNumber} onChange={(event) => handleFieldChange('clientNumber', event.target.value)} className="booking-form__input" inputMode="text" placeholder="123 ou S/N" />
                      {validationErrors.clientNumber ? <small className="booking-form__field-error">{validationErrors.clientNumber}</small> : null}
                    </label>
                  ) : null}
                </div>

                {shouldShowComplementField ? (
                  <label className={['booking-form__field', shouldShowNumberField ? '' : 'booking-form__field--full'].filter(Boolean).join(' ')}>
                    <span>Complemento (opcional)</span>
                    <input value={formValues.clientComplement} onChange={(event) => handleFieldChange('clientComplement', event.target.value)} className="booking-form__input" placeholder="Apto, bloco ou fundos" />
                  </label>
                ) : null}

                <label className="booking-form__field booking-form__field--full booking-form__field--with-error">
                  <span>Observação</span>
                  <textarea
                    value={formValues.serviceNotes}
                    onChange={(event) => handleFieldChange('serviceNotes', event.target.value)}
                    className="booking-form__input booking-form__textarea"
                    minLength={10}
                    placeholder="Explique detalhadamente o que precisa de serviço. Exemplo: trocar tomada da sala que parou de funcionar."
                  />
                  {validationErrors.serviceNotes ? <small className="booking-form__field-error">{validationErrors.serviceNotes}</small> : null}
                </label>
              </div>

              {createBookingErrorMessage && createBookingErrorMessage !== GENERIC_ADDRESS_ERROR ? (
                <AlertNotice variant="danger" title="Não foi possível concluir o agendamento" compact>
                  <p>{createBookingErrorMessage}</p>
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
