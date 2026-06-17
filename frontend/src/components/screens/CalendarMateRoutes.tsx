import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type InputHTMLAttributes, type PointerEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import logo from '../../assets/brand/logowithname.png';
import heroClient from '../../assets/wireframes/landing/client-hero-composite.png';
import heroClientMobile from '../../assets/wireframes/landing/client-hero-composite-mobile.png';
import heroAdmin from '../../assets/wireframes/landing/admin-hero-composite.png';
import heroAdminMobile from '../../assets/wireframes/landing/admin-hero-composite-mobile.png';
import houseCard from '../../assets/wireframes/cards/client-house-card.png';
import clientCreateCalendarIcon from '../../assets/wireframes/icons/client-create-calendar.png';
import clientFollowCalendarIcon from '../../assets/wireframes/icons/client-follow-calendar.png';
import clientPhoneIcon from '../../assets/wireframes/icons/client-phone.png';
import clientChatIcon from '../../assets/wireframes/icons/client-chat.png';
import contactWhatsAppIcon from '../../assets/wireframes/icons/contact-whatsapp.png';
import contactInstagramIcon from '../../assets/wireframes/icons/contact-instagram.png';
import contactPhoneIcon from '../../assets/wireframes/icons/contact-phone.png';
import contactEmailIcon from '../../assets/wireframes/icons/contact-email.png';
import footerSecurityIcon from '../../assets/wireframes/icons/footer-security-shield.png';
import servicePinturaCard from '../../assets/images/landing-carousel/01-servicos-de-pintor.png';
import serviceMontagemCard from '../../assets/images/landing-carousel/02-montagem-e-instalacao.png';
import servicePedreiroCard from '../../assets/images/landing-carousel/03-servicos-de-pedreiro.png';
import serviceDroneCard from '../../assets/images/landing-carousel/04-filmagem-com-drone.png';
import serviceHidraulicaCard from '../../assets/images/landing-carousel/05-hidraulica.png';
import serviceEletricaCard from '../../assets/images/landing-carousel/06-eletrica-basica.png';
import serviceJardinagemCard from '../../assets/images/landing-carousel/07-jardinagem.png';
import adminAppointmentsIcon from '../../assets/wireframes/icons/admin-appointments-clipboard.png';
import adminBlocksIcon from '../../assets/wireframes/icons/admin-blocks-lock.png';
import adminHistoryIcon from '../../assets/wireframes/icons/admin-history-clock.png';
import adminFinanceIcon from '../../assets/wireframes/icons/admin-finance-chart.png';
import adminAgendaCalendarIcon from '../../assets/wireframes/icons/admin-agenda-calendar.png';
import appointmentsTitleCalendarIcon from '../../assets/wireframes/icons/appointments-title-calendar.png';
import benefitPracticalityIcon from '../../assets/wireframes/icons/benefit-practicality-clock.png';
import benefitSecurityIcon from '../../assets/wireframes/icons/benefit-security-shield.png';
import benefitSpeedIcon from '../../assets/wireframes/icons/benefit-speed-flash.png';
import benefitFollowIcon from '../../assets/wireframes/icons/benefit-follow-calendar.png';
import cityPanelIcon from '../../assets/wireframes/icons/city-panel-marker.svg';
import cityBeloHorizonteIcon from '../../assets/wireframes/icons/city-belo-horizonte.svg';
import cityItabiritoIcon from '../../assets/wireframes/icons/city-itabirito.svg';
import cityOuroPretoIcon from '../../assets/wireframes/icons/city-ouro-preto.svg';
import cityMoedaIcon from '../../assets/wireframes/icons/city-moeda.svg';
import cityNovaLimaIcon from '../../assets/wireframes/icons/city-nova-lima.svg';
import bookingActionEyeIcon from '../../assets/wireframes/icons/booking-action-eye.svg';
import bookingActionPencilIcon from '../../assets/wireframes/icons/booking-action-pencil.svg';
import bookingActionWhatsAppIcon from '../../assets/wireframes/icons/booking-action-whatsapp.svg';
import bookingActionCancelIcon from '../../assets/wireframes/icons/booking-action-cancel.svg';
import bookingActionProviderIcon from '../../assets/wireframes/icons/booking-action-provider.svg';
import bookingFieldPhoneIcon from '../../assets/wireframes/icons/booking-field-phone.svg';
import bookingFieldLocationIcon from '../../assets/wireframes/icons/booking-field-location.svg';
import bookingFieldServiceIcon from '../../assets/wireframes/icons/booking-field-service.svg';
import bookingFieldUserIcon from '../../assets/wireframes/icons/booking-field-user.svg';
import bookingMetaToolsIcon from '../../assets/wireframes/icons/booking-meta-tools.svg';
import bookingMetaCalendarIcon from '../../assets/wireframes/icons/booking-meta-calendar.svg';
import bookingMetaClockIcon from '../../assets/wireframes/icons/booking-meta-clock.svg';
import bookingMetaNoteIcon from '../../assets/wireframes/icons/booking-meta-note.svg';
import bookingMetaBellIcon from '../../assets/wireframes/icons/booking-meta-bell.svg';
import bookingSearchIcon from '../../assets/wireframes/icons/booking-search.svg';
import bookingFilterIcon from '../../assets/wireframes/icons/booking-filter.svg';
import confirmPhoneSecurityIllustration from '../../assets/wireframes/modals/confirm-phone-security.png';
import emailIllustrationAsset from '../../assets/wireframes/modals/email-illustration.png';
import { FinancialStatementPanel } from '../admin/FinancialStatementPanel';
import { HistoryPanel } from '../admin/HistoryPanel';
import AdminNavbar, { type AdminNavView } from '../layout/AdminNavbar';
import { PageShell, SvgWrapper } from '../layout/ResponsivePrimitives';
import AppointmentCard from '../../features/appointments/ui/AppointmentCard';
import AppointmentsPageShell from '../../features/appointments/ui/AppointmentsPageShell';
import SupportedCitiesPanel from '../../features/appointments/ui/SupportedCitiesPanel';
import NotificationsModalView, { type NotificationModalItem } from '../../features/notifications/ui/NotificationsModal';
import AddressAutocompleteField from '../../features/booking-form/components/AddressAutocompleteField';
import type { AddressSuggestion } from '../../features/booking-form/hooks/useAddressSuggestions';
import { buildSuggestionInputValue, buildSuggestionStreetLine, getSuggestionHouseNumber, shouldShowManualHouseNumber } from '../../features/booking-form/utils/address-selection';
import { useCreateBooking } from '../../features/bookings/hooks/useCreateBooking';
import { useAvailableSlots } from '../../features/calendar/hooks/useAvailableSlots';
import { useAvailableMonthDates } from '../../features/calendar/hooks/useAvailableMonthDates';
import { createAdminBlocks, deleteAdminBlock, listAdminBlocks } from '../../features/admin/api/manage-admin-blocks';
import { useAdminBookings } from '../../features/admin/hooks/useAdminBookings';
import { useMyBookings } from '../../features/bookings/hooks/useMyBookings';
import type { CalendarEvent } from '../../features/calendar/types';
import { build4x4UnavailableDates } from '../../features/calendar/utils/schedule-rules';
import { parseOfxToFinancialDashboard } from '../../features/finance/services/ofx-parser';
import type { FinancialDashboardDTO } from '../../features/finance/types';
import { usePublicBootstrap } from '../../features/public-config/hooks/usePublicBootstrap';
import {
  formatPhoneForDisplay,
  getLocalCalendarEvents,
  getClientProfileChangedEventName,
  getLocalEventsChangedEventName,
  getManageTokens,
  getStoredAdminSession,
  getStoredAdminToken,
  getStoredClientProfile,
  getStoredPhoneVerification,
  isStoredAdminOwner,
  clearAdminToken,
  saveLocalCalendarEvent,
  saveClientProfile,
  saveManageToken,
  savePhoneVerification,
  saveRecoveredBookings,
  getPhoneVerificationChangedEventName,
} from '../../lib/storage';
import type { AdminProviderResponse, AvailabilityBlockResponse, ServicoRequest, ServicoResponse } from '../../types/api';
import { assignAdminProvider } from '../../features/admin/api/assign-admin-provider';
import { confirmAdminLogin, listAdminProviders, resendAdminLogin, startAdminLogin } from '../../features/admin/api/admin-auth';
import { updateAdminBooking } from '../../features/admin/api/update-admin-booking';
import { exportBudgetPdf, exportBudgetXls } from '../../features/admin/services/budget-export';
import { ApiError } from '../../lib/api-client';
import { ALLOWED_CITIES } from '../../data/allowed-cities';
import { getAllowedCities, getBookingDurationMinutesByCity, getDefaultCity, getDefaultState, getMaxFutureMonthsAhead, getSlotMinutes } from '../../lib/bootstrap-config';
import { confirmRecovery, resendRecovery } from '../../features/recovery/api/confirm-recovery';
import { startRecovery } from '../../features/recovery/api/start-recovery';
import { isValidPhone, normalizePhone, resolveUserRoleByPhone, type UserRole } from '../../lib/authRole';
import { buildMailtoUrl } from '../../lib/mailto';
import ModalShell from '../../shared/ui/ModalShell';
import PageTitle from '../../shared/ui/PageTitle';
import ResponsiveAsset from '../../shared/ui/ResponsiveAsset';
import ClientFooter from '../../widgets/client-footer';
import LandingHero from '../../widgets/landing-hero';
import PublicNavbar from '../../widgets/public-navbar';
import ServiceCarousel from '../../widgets/service-carousel';


type ModalKind =
  | 'create-client'
  | 'confirm-phone'
  | 'client-profile'
  | 'client-details'
  | 'contact'
  | 'services-info'
  | 'help-contact'
  | 'notifications'
  | 'block-admin'
  | 'assign-provider'
  | 'edit-admin'
  | 'email-admin'
  | 'ofx-admin'
  | 'budget-admin'
  | 'how-it-works'
  | null;

type AdminView = AdminNavView;
type Accent = 'blue' | 'orange' | 'green' | 'purple' | 'cyan' | 'red' | 'gray';

type BookingItem = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  city?: string;
  service: string;
  date: string;
  day: string;
  weekday: string;
  month: string;
  time: string;
  endTime?: string;
  provider?: string;
  notes?: string;
  color: Accent;
  status: string;
  source?: ServicoResponse | CalendarEvent;
};

type ModalContext = {
  booking?: BookingItem;
  createDate?: string;
};

type BudgetDraftItem = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

const accentCycle: Accent[] = ['blue', 'orange', 'green', 'purple', 'cyan'];
const wireframeCities: Array<{ name: string; icon: string; color: Accent; aliases: string[] }> = [
  { name: 'Itabirito', icon: cityItabiritoIcon, color: 'orange', aliases: ['itabirito'] },
  { name: 'Ouro Preto', icon: cityOuroPretoIcon, color: 'green', aliases: ['ouro preto'] },
  { name: 'Moeda', icon: cityMoedaIcon, color: 'purple', aliases: ['moeda'] },
  { name: 'Belo Horizonte', icon: cityBeloHorizonteIcon, color: 'blue', aliases: ['belo horizonte', 'bh'] },
  { name: 'Nova Lima', icon: cityNovaLimaIcon, color: 'red', aliases: ['nova lima'] },
];
const ptDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const ptWeekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
const ptMonth = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
const ptLongDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
let suppressNextExitGuard = false;

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

function useModalBrowserBack(open: boolean, key: string, onClose: () => void) {
  const onCloseRef = useLatestRef(onClose);
  const stateIdRef = useRef('');

  useEffect(() => {
    if (!open || typeof window === 'undefined') return undefined;

    const stateId = `calendarMateModal:${key}:${Date.now()}`;
    stateIdRef.current = stateId;
    window.history.pushState({ ...(window.history.state ?? {}), calendarMateModal: stateId }, '', window.location.href);

    const handlePopState = () => {
      if (!stateIdRef.current) return;
      stateIdRef.current = '';
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      stateIdRef.current = '';
    };
  }, [key, onCloseRef, open]);

  return useCallback(() => {
    const stateId = stateIdRef.current;
    if (
      open
      && stateId
      && typeof window !== 'undefined'
      && window.history.state?.calendarMateModal === stateId
    ) {
      suppressNextExitGuard = true;
      window.history.back();
      return;
    }
    onCloseRef.current();
  }, [onCloseRef, open]);
}

function useDoubleBackToLeavePage(enabled = true) {
  const lastBackAtRef = useRef(0);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;

    const guardState = { ...(window.history.state ?? {}), calendarMateExitGuard: true };
    window.history.pushState(guardState, '', window.location.href);

    const handlePopState = () => {
      if (suppressNextExitGuard) {
        suppressNextExitGuard = false;
        return;
      }
      const now = Date.now();
      if (now - lastBackAtRef.current < 1600) {
        window.removeEventListener('popstate', handlePopState);
        window.history.back();
        return;
      }
      lastBackAtRef.current = now;
      window.history.pushState(guardState, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [enabled]);
}

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function resolveSupportedCityStyle(city: string, index: number) {
  const normalized = normalizeText(city);
  return wireframeCities.find((item) => item.aliases.some((alias) => normalized.includes(alias))) ?? wireframeCities[index % wireframeCities.length];
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

function startOfMonth(date = new Date()): string {
  return toIsoDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

function shiftMonthStart(monthStart: string, delta: number): string {
  const base = toLocalDate(monthStart);
  return toIsoDate(new Date(base.getFullYear(), base.getMonth() + delta, 1));
}

function endOfMonth(monthStart: string): string {
  const base = toLocalDate(monthStart);
  return toIsoDate(new Date(base.getFullYear(), base.getMonth() + 1, 0));
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function cleanFormText(value?: string | null): string {
  return (value ?? '').trim();
}

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function isEmailValid(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isHouseNumberValid(value: string): boolean {
  const normalized = cleanFormText(value).toLowerCase();
  if (!normalized) return false;
  if (/^(s\/?n|sem numero|sem número)$/.test(normalized)) return true;
  if (/^\d{1,6}[a-z]?([-/]\d{1,4})?$/i.test(normalized)) return true;
  return /^(casa|apto|apartamento|lote|loja|sala|bloco|fundos|galpao|galpão)\s+[a-z0-9 ./-]{1,24}$/i.test(normalized);
}

function normalizeHouseNumber(value: string): string {
  const normalized = cleanFormText(value).replace(/\s+/g, ' ');
  if (/^(s\/?n|sem numero|sem número)$/i.test(normalized)) return 'S/N';
  return normalized;
}

function isServiceNotesValid(value: string): boolean {
  return cleanFormText(value).replace(/\s+/g, ' ').length >= 10;
}

function splitFullName(value: string): { firstName: string; lastName: string } {
  const parts = cleanFormText(value).split(/\s+/).filter(Boolean);
  const firstName = parts.shift() ?? '';
  const lastName = parts.join(' ') || firstName;
  return { firstName, lastName };
}

function formatDateOptionLabel(dateString: string): string {
  const date = toLocalDate(dateString);
  return `${ptWeekday.format(date).replace('.', '')}\n${date.getDate()}\n${ptMonth.format(date).replace('.', '')}`;
}

function mapCreatedServicoToCalendarEvent(servico: ServicoResponse): CalendarEvent {
  const customerName = `${servico.clientFirstName} ${servico.clientLastName}`.trim();
  return {
    id: servico.eventId,
    title: customerName || servico.serviceType || 'Agendamento',
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
    status: servico.status?.toLowerCase().includes('conclu') ? 'completed' : 'booked',
  };
}

function getMonthGrid(monthStart: string) {
  const reference = toLocalDate(monthStart);
  const first = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const gridStart = new Date(reference.getFullYear(), reference.getMonth(), 1 - first.getDay());
  return Array.from({ length: 35 }, (_, index) => {
    const cursor = new Date(gridStart);
    cursor.setDate(gridStart.getDate() + index);
    const iso = toIsoDate(cursor);
    return {
      iso,
      day: cursor.getDate(),
      isCurrentMonth: cursor.getMonth() === reference.getMonth(),
      isWeekend: cursor.getDay() === 0 || cursor.getDay() === 6,
    };
  });
}

function formatStatus(value?: string): string {
  if (!value?.trim()) return 'Confirmado';
  const normalized = value.trim().toLowerCase();
  if (normalized.includes('cancel')) return 'Cancelado';
  if (normalized.includes('concl') || normalized.includes('done') || normalized.includes('completed')) return 'Concluído';
  return 'Confirmado';
}

function bookingFromServico(servico: ServicoResponse, index = 0): BookingItem {
  const start = servico.start?.slice(0, 10) || toIsoDate(new Date());
  const date = toLocalDate(start);
  const name = `${servico.clientFirstName ?? ''} ${servico.clientLastName ?? ''}`.trim() || 'Cliente não informado';
  const address = servico.clientAddressLine || [servico.clientStreet, servico.clientNumber, servico.clientNeighborhood, servico.clientCity, servico.clientState].filter(Boolean).join(' - ') || 'Endereço não informado';

  return {
    id: servico.eventId,
    name,
    phone: servico.clientPhone || '',
    email: servico.clientEmail,
    address,
    city: servico.clientCity,
    service: servico.serviceType || 'Serviço não informado',
    date: start,
    day: `${date.getDate()}`.padStart(2, '0'),
    weekday: ptWeekday.format(date).replace('.', '').toUpperCase(),
    month: ptMonth.format(date).replace('.', '').toUpperCase(),
    time: servico.start?.slice(11, 16) || '--:--',
    endTime: servico.end?.slice(11, 16),
    provider: servico.assignedProviderName || 'A definir',
    notes: servico.serviceNotes,
    color: accentCycle[index % accentCycle.length],
    status: formatStatus(servico.status),
    source: servico,
  };
}

function bookingFromCalendarEvent(event: CalendarEvent, index = 0): BookingItem {
  const date = toLocalDate(event.date);
  return {
    id: event.id,
    name: event.customerName || event.title || 'Cliente não informado',
    phone: event.customerPhone || event.phone || '',
    email: event.customerEmail || event.email,
    address: event.customerAddress || event.addressLine || event.city || 'Endereço não informado',
    city: event.city,
    service: event.serviceLabel || event.title || 'Serviço não informado',
    date: event.date,
    day: `${date.getDate()}`.padStart(2, '0'),
    weekday: ptWeekday.format(date).replace('.', '').toUpperCase(),
    month: ptMonth.format(date).replace('.', '').toUpperCase(),
    time: event.startTime || '--:--',
    endTime: event.endTime,
    provider: 'A definir',
    notes: event.notes,
    color: accentCycle[index % accentCycle.length],
    status: formatStatus(event.status),
    source: event,
  };
}

function sortBookings(items: BookingItem[]): BookingItem[] {
  return [...items].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

function useLocalBookings(): BookingItem[] {
  const [events, setEvents] = useState<CalendarEvent[]>(() => getLocalCalendarEvents());

  useEffect(() => {
    const refresh = () => setEvents(getLocalCalendarEvents());
    window.addEventListener(getLocalEventsChangedEventName(), refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(getLocalEventsChangedEventName(), refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return useMemo(() => events.map(bookingFromCalendarEvent), [events]);
}

function useClientBookingsData() {
  const [tokens, setTokens] = useState<string[]>(() => getManageTokens());
  const localBookings = useLocalBookings();
  const query = useMyBookings(tokens);

  useEffect(() => {
    const refresh = () => setTokens(getManageTokens());
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);

  const remoteBookings = useMemo(() => (query.data ?? []).map(bookingFromServico), [query.data]);
  const merged = useMemo(() => {
    const map = new Map<string, BookingItem>();
    [...remoteBookings, ...localBookings].forEach((item) => map.set(item.id, item));
    return sortBookings([...map.values()]);
  }, [remoteBookings, localBookings]);

  return { bookings: merged, isLoading: query.isFetching, isError: query.isError, hasTokens: tokens.length > 0 };
}

function useAdminBookingsData() {
  const hasAdminToken = Boolean(getStoredAdminToken());
  const query = useAdminBookings({}, hasAdminToken);
  const bookings = useMemo(() => (query.data ?? []).map(bookingFromServico), [query.data]);
  return { bookings: sortBookings(bookings), isLoading: query.isFetching, isError: query.isError, hasAdminToken };
}

function useAdminBlocksData() {
  const hasAdminToken = Boolean(getStoredAdminToken());
  const query = useQuery({
    queryKey: ['wireframe-admin-blocks'],
    queryFn: () => listAdminBlocks(),
    enabled: hasAdminToken,
    staleTime: 15_000,
    retry: 0,
  });
  return { blocks: query.data ?? [], isLoading: query.isFetching, isError: query.isError, hasAdminToken };
}

const supportPhoneDigits = '553195415323';
const supportPhoneDisplay = '(31) 9541-5323';
const supportWhatsAppUrl = `https://wa.me/${supportPhoneDigits}`;
const supportInstagramUrl = 'https://www.instagram.com/sg_pequenos_reparos/';
const supportEmail = 'sgpequenosreparos@gmail.com';

function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function openSupportWhatsApp() {
  openExternal(supportWhatsAppUrl);
}

function openSupportPhone() {
  window.location.href = `tel:+${supportPhoneDigits}`;
}

function openSupportEmail() {
  window.location.href = `mailto:${supportEmail}`;
}

async function copySupportEmail() {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(supportEmail);
    return true;
  } catch {
    return false;
  }
}

function openWhatsApp(phone?: string) {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) {
    openSupportWhatsApp();
    return;
  }
  const normalized = digits.startsWith('55') ? digits : `55${digits}`;
  window.open(`https://wa.me/${normalized}`, '_blank', 'noopener,noreferrer');
}

function notifyUnavailable(action: string) {
  window.alert(`${action} ainda não possui ação configurada nesta tela.`);
}

function Icon({ name }: { name: string }) {
  const uid = `wf-${name.replace(/[^a-zA-Z0-9-]/g, '-')}`;
  const imageIcons: Record<string, string> = {
    'calendar-create': clientCreateCalendarIcon,
    'calendar-clock': clientFollowCalendarIcon,
    'mobile-phone': clientPhoneIcon,
    'chat-bubbles': clientChatIcon,
    'contact-whatsapp': contactWhatsAppIcon,
    'contact-instagram': contactInstagramIcon,
    'contact-phone': contactPhoneIcon,
    'contact-email': contactEmailIcon,
    'benefit-practicality': benefitPracticalityIcon,
    'benefit-security': benefitSecurityIcon,
    'benefit-speed': benefitSpeedIcon,
    'benefit-follow': benefitFollowIcon,
    'footer-security': footerSecurityIcon,
    'admin-appointments': adminAppointmentsIcon,
    'admin-blocks': adminBlocksIcon,
    'admin-history': adminHistoryIcon,
    'admin-finance': adminFinanceIcon,
    'admin-agenda-calendar': adminAgendaCalendarIcon,
    'appointments-title-calendar': appointmentsTitleCalendarIcon,
    'booking-action-eye': bookingActionEyeIcon,
    'booking-action-pencil': bookingActionPencilIcon,
    'booking-action-whatsapp': bookingActionWhatsAppIcon,
    'booking-action-cancel': bookingActionCancelIcon,
    'booking-action-provider': bookingActionProviderIcon,
    'booking-field-phone': bookingFieldPhoneIcon,
    'booking-field-location': bookingFieldLocationIcon,
    'booking-field-service': bookingFieldServiceIcon,
    'booking-field-user': bookingFieldUserIcon,
    'booking-meta-tools': bookingMetaToolsIcon,
    'booking-meta-calendar': bookingMetaCalendarIcon,
    'booking-meta-clock': bookingMetaClockIcon,
    'booking-meta-note': bookingMetaNoteIcon,
    'booking-meta-bell': bookingMetaBellIcon,
    'booking-search': bookingSearchIcon,
    'booking-filter': bookingFilterIcon,
    'city-itabirito': cityItabiritoIcon,
    'city-ouro-preto': cityOuroPretoIcon,
    'city-moeda': cityMoedaIcon,
    'city-belo-horizonte': cityBeloHorizonteIcon,
    'city-nova-lima': cityNovaLimaIcon,
    'confirm-phone-security': confirmPhoneSecurityIllustration,
    'email-illustration': emailIllustrationAsset,
  };
  const imageIcon = imageIcons[name];
  if (imageIcon) {
    return (
      <SvgWrapper className={cx('wf-icon', 'wf-icon--image', `wf-icon--${name.replace(/[^a-zA-Z0-9-]/g, '-')}`)}>
        <img src={imageIcon} alt="" />
      </SvgWrapper>
    );
  }

  const common = { viewBox: '0 0 64 64', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', 'aria-hidden': true } as const;
  const line = { stroke: 'currentColor', strokeWidth: 4.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const whiteLine = { stroke: '#fff', strokeWidth: 4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  const calendarBase = (accent = '#ff4b0b') => (
    <svg {...common}>
      <defs>
        <linearGradient id={`${uid}-cal`} x1="10" y1="6" x2="54" y2="58"><stop stopColor={accent}/><stop offset="1" stopColor={accent === '#0358ff' ? '#06136f' : '#e03000'}/></linearGradient>
        <filter id={`${uid}-shadow`} x="0" y="0" width="64" height="64"><feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#08145f" floodOpacity="0.18"/></filter>
      </defs>
      <rect x="11" y="13" width="42" height="39" rx="10" fill="#fff" stroke={`url(#${uid}-cal)`} strokeWidth="3.8" filter={`url(#${uid}-shadow)`}/>
      <path d="M11 24h42" stroke={`url(#${uid}-cal)`} strokeWidth="6" strokeLinecap="round"/>
      <path d="M22 9v11M42 9v11" stroke={`url(#${uid}-cal)`} strokeWidth="5" strokeLinecap="round"/>
      {[22,32,42].map((x) => [32,41].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.8" fill={accent}/>))}
    </svg>
  );

  const icons: Record<string, ReactNode> = {
    'benefit-practicality': (
      <svg {...common}>
        <circle cx="32" cy="32" r="28" fill="currentColor" opacity=".1" />
        <circle cx="32" cy="32" r="22" fill="#fff" stroke="currentColor" strokeWidth="3.4" />
        <path d="M32 18v15l10 6" stroke="currentColor" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19 12 14 17M45 12l5 5" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
      </svg>
    ),
    'benefit-security': (
      <svg {...common}>
        <path d="M32 7 52 15v15c0 13-8.5 21.5-20 27C20.5 51.5 12 43 12 30V15l20-8Z" fill="currentColor" opacity=".1" />
        <path d="M32 10 49 17v13c0 11-7 18-17 23-10-5-17-12-17-23V17l17-7Z" fill="#fff" stroke="currentColor" strokeWidth="3.8" strokeLinejoin="round" />
        <path d="m23 31 6 6 13-15" stroke="currentColor" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    'benefit-speed': (
      <svg {...common}>
        <circle cx="32" cy="32" r="27" fill="currentColor" opacity=".1" />
        <path d="M34 6 16 35h14l-2 23 20-33H34l0-19Z" fill="#fff" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
        <path d="M13 21h11M9 32h14M14 43h10" stroke="currentColor" strokeWidth="3.8" strokeLinecap="round" />
      </svg>
    ),
    'benefit-follow': (
      <svg {...common}>
        <rect x="11" y="14" width="42" height="39" rx="10" fill="#fff" stroke="currentColor" strokeWidth="3.8" />
        <path d="M11 25h42M22 9v11M42 9v11" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" />
        <path d="m24 39 5 5 12-14" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="48" cy="46" r="8" fill="currentColor" opacity=".16" />
      </svg>
    ),
    calendar: <svg {...common}><rect x="12" y="14" width="40" height="38" rx="8" {...line}/><path d="M22 8v12M42 8v12M12 25h40" {...line}/><path d="M22 35h.01M32 35h.01M42 35h.01M22 44h.01M32 44h.01M42 44h.01" {...line}/></svg>,
    'calendar-create': calendarBase('#ff4b0b'),
    'calendar-blue': calendarBase('#0358ff'),
    'calendar-modal-blue': <svg {...common}>
      <defs><linearGradient id={`${uid}-modal-cal`} x1="13" y1="8" x2="52" y2="56"><stop stopColor="#7b6dff"/><stop offset="1" stopColor="#0358ff"/></linearGradient></defs>
      <rect x="9" y="9" width="46" height="46" rx="13" fill="#f1efff"/>
      <rect x="19" y="19" width="28" height="28" rx="5" fill="#fff" stroke={`url(#${uid}-modal-cal)`} strokeWidth="3.6"/>
      <path d="M19 28h28" stroke={`url(#${uid}-modal-cal)`} strokeWidth="4" strokeLinecap="round"/>
      <path d="M26 15v9M40 15v9" stroke={`url(#${uid}-modal-cal)`} strokeWidth="3.8" strokeLinecap="round"/>
      <circle cx="27" cy="35" r="2.1" fill="#6d2ee8"/><circle cx="34" cy="35" r="2.1" fill="#0358ff"/><circle cx="41" cy="35" r="2.1" fill="#0358ff"/><circle cx="27" cy="42" r="2.1" fill="#0358ff"/><circle cx="34" cy="42" r="2.1" fill="#6d2ee8"/>
    </svg>,
    'calendar-block': <svg {...common}>
      <defs><linearGradient id={`${uid}-block-cal`} x1="12" y1="8" x2="54" y2="56"><stop stopColor="#9d6bff"/><stop offset="1" stopColor="#6d2ee8"/></linearGradient></defs>
      <rect x="8" y="8" width="48" height="48" rx="14" fill="#f2ecff"/>
      <rect x="17" y="17" width="28" height="28" rx="5" fill="#fff" stroke={`url(#${uid}-block-cal)`} strokeWidth="3.4"/>
      <path d="M17 26h28M24 13v9M38 13v9" stroke={`url(#${uid}-block-cal)`} strokeWidth="3.6" strokeLinecap="round"/>
      <circle cx="42" cy="43" r="9" fill="#6d2ee8"/><path d="M39 43h6" stroke="#fff" strokeWidth="3.4" strokeLinecap="round"/>
    </svg>,
    'calendar-clock': <svg {...common}>
      <defs><linearGradient id={`${uid}-blue`} x1="9" y1="8" x2="55" y2="56"><stop stopColor="#1478ff"/><stop offset="1" stopColor="#06136f"/></linearGradient><filter id={`${uid}-bshadow`} x="0" y="0" width="64" height="64"><feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#0358ff" floodOpacity="0.22"/></filter></defs>
      <rect x="9" y="12" width="42" height="40" rx="10" fill="#fff" stroke={`url(#${uid}-blue)`} strokeWidth="3.5" filter={`url(#${uid}-bshadow)`}/><path d="M9 24h42" stroke={`url(#${uid}-blue)`} strokeWidth="6" strokeLinecap="round"/><path d="M20 8v11M39 8v11" stroke={`url(#${uid}-blue)`} strokeWidth="5" strokeLinecap="round"/><circle cx="44" cy="43" r="14" fill="#fff" stroke={`url(#${uid}-blue)`} strokeWidth="4"/><path d="M44 35v9l6 4" stroke="#0358ff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="22" cy="33" r="2.5" fill="#0358ff"/><circle cx="32" cy="33" r="2.5" fill="#0358ff"/><circle cx="22" cy="43" r="2.5" fill="#0358ff"/>
    </svg>,
    user: <svg {...common}><circle cx="32" cy="22" r="10" {...line}/><path d="M14 55c3.7-12.2 9.7-18.3 18-18.3S46.3 42.8 50 55" {...line}/></svg>,
    home: <svg {...common}><path d="M9 30 32 11l23 19" {...line}/><path d="M15 27v27h34V27" {...line}/><path d="M25 54V38h14v16" {...line}/></svg>,
    plus: <svg {...common}><circle cx="32" cy="32" r="27" fill="currentColor"/><path d="M32 19v26M19 32h26" stroke="#fff" strokeWidth="5" strokeLinecap="round"/></svg>,
    play: <svg {...common}><circle cx="32" cy="32" r="27" fill="#ff1d16"/><path d="M27 21 46 32 27 43V21Z" fill="#fff"/></svg>,
    'arrow-right': <svg {...common}><path d="M13 32h36" {...line}/><path d="m37 20 12 12-12 12" {...line}/></svg>,
    'send-outline': <svg {...common}><path d="M9 31.5 55 10 43 54 31.5 41.5 20 47 23.5 35 9 31.5Z" {...line}/><path d="M24 35 55 10M31.5 41.5 40 31" {...line}/></svg>,
    'info-circle': <svg {...common}><circle cx="32" cy="32" r="24" {...line}/><path d="M32 29v15" {...line}/><path d="M32 20h.01" {...line}/></svg>,
    'user-blue-solid': <svg {...common}><circle cx="32" cy="21" r="9" fill="#07135d"/><path d="M13 56c3.4-12 9.7-18 19-18s15.6 6 19 18" fill="#07135d"/></svg>,
    'phone-blue-outline': <svg {...common}><path d="M22 13 29 25l-5 5c4 8 10 14 18 18l5-5 12 7c1.3.8 1.8 2.3 1.3 3.8-1.4 4.4-5.1 6.7-9.7 6.7C27.2 60.5 3.5 36.8 3.5 13.4c0-4.6 2.3-8.3 6.7-9.7 1.5-.5 3 .1 3.8 1.3l8 8Z" stroke="#07135d" strokeWidth="4.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    send: <svg {...common}><defs><linearGradient id={`${uid}-send`} x1="8" y1="12" x2="56" y2="52"><stop stopColor="#ff8a33"/><stop offset="1" stopColor="#ff4b0b"/></linearGradient></defs><path d="M8 31.5 55 10 43 54 31.5 41.5 20 47 23.5 35 8 31.5Z" fill={`url(#${uid}-send)`}/><path d="M24 35 55 10M31.5 41.5 40 31" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" opacity=".96"/></svg>,
    shield: <svg {...common}><path d="M32 8 53 16.5v14.8c0 13.1-8.6 21.2-21 25.1-12.4-3.9-21-12-21-25.1V16.5L32 8Z" {...line}/><path d="m22 32 7 7 15-17" {...line}/></svg>,
    'shield-check': <svg {...common}>
      <defs><linearGradient id={`${uid}-shield`} x1="13" y1="6" x2="52" y2="57"><stop stopColor="#83df75"/><stop offset="1" stopColor="#089343"/></linearGradient><filter id={`${uid}-sshadow`} x="0" y="0" width="64" height="64"><feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#07a64b" floodOpacity="0.22"/></filter></defs>
      <path d="M32 7 53 15.3v15.2c0 13.1-8.6 21.7-21 25.8-12.4-4.1-21-12.7-21-25.8V15.3L32 7Z" fill={`url(#${uid}-shield)`} filter={`url(#${uid}-sshadow)`}/><path d="M22 32.5 29 40l15-18" {...whiteLine}/><path d="M19 16.5 32 11l13 5.5" stroke="#bff2ba" strokeWidth="2.5" strokeLinecap="round" opacity=".75"/>
    </svg>,
    'security-phone': <svg {...common} viewBox="0 0 96 96">
      <defs><linearGradient id={`${uid}-sec-main`} x1="16" y1="8" x2="79" y2="88"><stop stopColor="#1557f0"/><stop offset="1" stopColor="#07136f"/></linearGradient><linearGradient id={`${uid}-sec-green`} x1="32" y1="23" x2="66" y2="68"><stop stopColor="#78e276"/><stop offset="1" stopColor="#08a64b"/></linearGradient><filter id={`${uid}-sec-shadow`} x="0" y="0" width="96" height="96"><feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#0c2d80" floodOpacity="0.2"/></filter></defs>
      <path d="M18 73c14 8 42 8 60 0" stroke="#c9f3d5" strokeWidth="5" strokeLinecap="round" opacity=".85"/>
      <path d="M14 61c-7-10 4-20 16-14" stroke="#c9f3d5" strokeWidth="4" strokeLinecap="round" strokeDasharray="3 7"/>
      <rect x="33" y="8" width="34" height="74" rx="8" fill="#fff" stroke={`url(#${uid}-sec-main)`} strokeWidth="5" filter={`url(#${uid}-sec-shadow)`}/>
      <path d="M44 15h12" stroke="#07136f" strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M50 26 66 32v12c0 10-6.6 16.5-16 19.6C40.6 60.5 34 54 34 44V32l16-6Z" fill={`url(#${uid}-sec-green)`}/>
      <path d="m42 44 6 6 12-16" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="43" cy="71" r="3" fill="#09a64b"/><circle cx="50" cy="71" r="3" fill="#09a64b"/><circle cx="57" cy="71" r="3" fill="#09a64b"/>
      <rect x="15" y="33" width="25" height="22" rx="8" fill="#26bf5a"/><path d="M22 42h11M22 48h7" stroke="#fff" strokeWidth="3" strokeLinecap="round"/><path d="M22 55 16 61v-9" fill="#26bf5a"/>
      <rect x="66" y="43" width="18" height="22" rx="6" fill="#6ddf85"/><path d="M70 52h10v8H70z" fill="#fff"/><path d="M72 52v-4a3 3 0 0 1 6 0v4" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
    </svg>,
    lock: <svg {...common}><rect x="14" y="28" width="36" height="26" rx="8" {...line}/><path d="M21 28v-7a11 11 0 0 1 22 0v7" {...line}/><path d="M32 38v7" {...line}/></svg>,
    'lock-green': <svg {...common}><defs><linearGradient id={`${uid}-lock`} x1="14" y1="8" x2="52" y2="58"><stop stopColor="#7fe681"/><stop offset="1" stopColor="#0aa144"/></linearGradient></defs><rect x="14" y="28" width="36" height="26" rx="8" fill="#fff" stroke={`url(#${uid}-lock)`} strokeWidth="4"/><path d="M21 28v-7a11 11 0 0 1 22 0v7" stroke={`url(#${uid}-lock)`} strokeWidth="4" strokeLinecap="round"/><path d="M32 38v7" stroke="#0aa144" strokeWidth="4" strokeLinecap="round"/></svg>,
    check: <svg {...common}><circle cx="32" cy="32" r="26" {...line}/><path d="m20 32 8 8 17-20" {...line}/></svg>,
    phone: <svg {...common}><path d="M21 10 29 24l-5 5c4 8 10.1 14.1 18.2 18.2l5-5 14 8.2c1.5.9 2.2 2.7 1.8 4.4-1 5.7-4.9 9.2-10.3 9.2C28.6 64 0 35.4 0 11.3 0 5.9 3.5 2 9.2 1c1.7-.4 3.5.3 4.4 1.8L21 10Z" transform="translate(4 0) scale(.87)" {...line}/></svg>,
    'phone-call': <svg {...common}><defs><linearGradient id={`${uid}-phone`} x1="9" y1="8" x2="55" y2="56"><stop stopColor="#4d9cff"/><stop offset="1" stopColor="#0358ff"/></linearGradient></defs><rect x="7" y="7" width="50" height="50" rx="14" fill="#eef6ff"/><path d="M22 17 28 27l-4 4c3.2 6.6 7.4 10.8 14 14l4-4 10 6c1 .6 1.4 1.8 1 2.9-1.2 3.2-3.8 5.1-7.2 5.1C26.3 55 9 37.7 9 18.2c0-3.4 1.9-6 5.1-7.2 1.1-.4 2.3 0 2.9 1l5 5Z" fill={`url(#${uid}-phone)`}/><path d="M39 14c6 1.8 9.8 5.6 11.6 11.6M38 23c2.5.9 4 2.4 4.9 4.9" stroke="#0358ff" strokeWidth="3" strokeLinecap="round"/></svg>,
    'mobile-phone': <svg {...common}>
      <defs><linearGradient id={`${uid}-mobile`} x1="14" y1="7" x2="51" y2="59"><stop stopColor="#36d778"/><stop offset="1" stopColor="#057d3b"/></linearGradient><filter id={`${uid}-mshadow`} x="0" y="0" width="64" height="64"><feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#07a64b" floodOpacity="0.25"/></filter></defs>
      <rect x="17" y="6" width="30" height="52" rx="8" fill={`url(#${uid}-mobile)`} filter={`url(#${uid}-mshadow)`}/><rect x="21" y="12" width="22" height="37" rx="4" fill="#eafff0"/><path d="M29 10h6M29 53h6" stroke="#fff" strokeWidth="3" strokeLinecap="round"/><path d="M28 25c1.5 6.8 5.3 10.6 12 12" stroke="#059044" strokeWidth="4" strokeLinecap="round"/><path d="M28 25l4-4 4 8-4 3M40 37l3-4 8 4-4 4" stroke="#059044" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="46" cy="17" r="7" fill="#fff"/><path d="m43 17 2 2 4-5" stroke="#0aa64b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>,
    chat: <svg {...common}><path d="M13 14h38a7 7 0 0 1 7 7v18a7 7 0 0 1-7 7H31L16 55v-9h-3a7 7 0 0 1-7-7V21a7 7 0 0 1 7-7Z" {...line}/><path d="M23 30h.01M32 30h.01M41 30h.01" {...line}/></svg>,
    'chat-bubbles': <svg {...common}>
      <defs><linearGradient id={`${uid}-chat`} x1="8" y1="8" x2="58" y2="58"><stop stopColor="#a946ff"/><stop offset="1" stopColor="#4611a8"/></linearGradient><filter id={`${uid}-cshadow`} x="0" y="0" width="64" height="64"><feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#5b18c9" floodOpacity="0.22"/></filter></defs>
      <path d="M14 16h31a9 9 0 0 1 9 9v12a9 9 0 0 1-9 9H31L16 55v-9h-2a9 9 0 0 1-9-9V25a9 9 0 0 1 9-9Z" fill="#fff" stroke={`url(#${uid}-chat)`} strokeWidth="4" filter={`url(#${uid}-cshadow)`}/><path d="M35 23h12a9 9 0 0 1 9 9v8a9 9 0 0 1-7 8.8V57l-10-8H31" stroke={`url(#${uid}-chat)`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity=".92"/><circle cx="23" cy="32" r="3" fill="#6b21d9"/><circle cx="32" cy="32" r="3" fill="#6b21d9"/><circle cx="41" cy="32" r="3" fill="#6b21d9"/>
    </svg>,
    clock: <svg {...common}><circle cx="32" cy="32" r="24" {...line}/><path d="M32 18v16l10 6" {...line}/></svg>,
    flash: <svg {...common}><path d="M37 5 13 36h20l-6 23 24-32H32l5-22Z" fill="currentColor"/></svg>,
    filter: <svg {...common}><path d="M11 16h42M18 32h28M25 48h14" {...line}/></svg>,
    search: <svg {...common}><circle cx="27" cy="27" r="18" {...line}/><path d="m41 41 12 12" {...line}/></svg>,
    map: <svg {...common}><path d="M32 58s19-17 19-34A19 19 0 1 0 13 24c0 17 19 34 19 34Z" {...line}/><circle cx="32" cy="24" r="6" {...line}/></svg>,
    building: <svg {...common}><path d="M17 54V14h30v40" {...line}/><path d="M11 54h42" {...line}/><path d="M25 23h.01M32 23h.01M39 23h.01M25 32h.01M32 32h.01M39 32h.01M25 41h.01M32 41h.01M39 41h.01" {...line}/></svg>,
    back: <svg {...common}><path d="M39 14 21 32l18 18" {...line}/></svg>,
    edit: <svg {...common}><path d="M13 43v9h9L51 23l-9-9-29 29Z" {...line}/><path d="m38 18 9 9" {...line}/></svg>,
    delete: <svg {...common}><path d="M12 18h40M24 18v-8h16v8M19 18l3 36h20l3-36" {...line}/><path d="M28 29v14M36 29v14" {...line}/></svg>,
    eye: <svg {...common}><path d="M6 32s10-17 26-17 26 17 26 17-10 17-26 17S6 32 6 32Z" {...line}/><circle cx="32" cy="32" r="8" {...line}/></svg>,
    mail: <svg {...common}><rect x="9" y="15" width="46" height="34" rx="8" {...line}/><path d="m12 18 20 16 20-16" {...line}/></svg>,
    'mail-blue': <svg {...common}><defs><linearGradient id={`${uid}-mail`} x1="10" y1="12" x2="54" y2="52"><stop stopColor="#5f8cff"/><stop offset="1" stopColor="#0358ff"/></linearGradient></defs><rect x="10" y="14" width="44" height="36" rx="8" fill="#f3f6ff" stroke={`url(#${uid}-mail)`} strokeWidth="4"/><path d="M14 21 32 35 50 21" stroke="#0358ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'mail-orange': <svg {...common}><defs><linearGradient id={`${uid}-mail-o`} x1="8" y1="12" x2="56" y2="52"><stop stopColor="#ff7b2c"/><stop offset="1" stopColor="#ff4b0b"/></linearGradient></defs><rect x="7" y="13" width="50" height="38" rx="10" fill="#fff4ed" stroke={`url(#${uid}-mail-o)`} strokeWidth="4"/><path d="m12 20 20 15 20-15" stroke="#ff4b0b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    upload: <svg {...common}><path d="M32 42V12" {...line}/><path d="m19 25 13-13 13 13" {...line}/><path d="M13 43v11h38V43" {...line}/></svg>,
    'cloud-upload': <svg {...common}><defs><linearGradient id={`${uid}-cloud`} x1="12" y1="15" x2="53" y2="52"><stop stopColor="#4f86ff"/><stop offset="1" stopColor="#0358ff"/></linearGradient></defs><path d="M22 47h-3a11 11 0 0 1 0-22c2.2-8.2 8.7-13.2 16.2-13.2 9.4 0 16.8 7.4 16.8 16.6v.9A8.8 8.8 0 0 1 50 47h-7" stroke={`url(#${uid}-cloud)`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M32 51V30M23 39l9-9 9 9" stroke="#0358ff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    download: <svg {...common}><path d="M32 12v30" {...line}/><path d="m19 29 13 13 13-13" {...line}/><path d="M13 54h38" {...line}/></svg>,
    money: <svg {...common}><rect x="8" y="17" width="48" height="31" rx="8" {...line}/><circle cx="32" cy="32" r="8" {...line}/><path d="M17 25v.01M47 40v.01" {...line}/></svg>,
    chart: <svg {...common}><path d="M12 52V12" {...line}/><path d="M12 52h42" {...line}/><rect x="20" y="32" width="8" height="15" rx="3" fill="currentColor"/><rect x="34" y="19" width="8" height="28" rx="3" fill="currentColor"/><rect x="48" y="25" width="8" height="22" rx="3" fill="currentColor"/></svg>,
    budget: <svg {...common}>
      <defs><linearGradient id={`${uid}-budget`} x1="10" y1="7" x2="55" y2="58"><stop stopColor="#5e9bff"/><stop offset="1" stopColor="#072aa4"/></linearGradient><filter id={`${uid}-budget-shadow`} x="0" y="0" width="64" height="64"><feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#072aa4" floodOpacity="0.16"/></filter></defs>
      <rect x="13" y="8" width="38" height="48" rx="10" fill="#fff" stroke={`url(#${uid}-budget)`} strokeWidth="3.8" filter={`url(#${uid}-budget-shadow)`}/>
      <path d="M23 18h18M22 29h20M22 38h11" stroke="#072aa4" strokeWidth="3.2" strokeLinecap="round"/>
      <path d="M40 42c0 4.2-3.2 7.4-8 7.4s-8-3.2-8-7.4 3.2-7.4 8-7.4 8 3.2 8 7.4Z" fill="#eef5ff" stroke="#0358ff" strokeWidth="3"/>
      <path d="M32 37.8v8.6M28.8 40.8c.8-1.1 2-1.7 3.4-1.7 1.8 0 3.1.9 3.1 2.2 0 3.2-6.5 1.4-6.5 4.5 0 1.4 1.3 2.3 3.2 2.3 1.4 0 2.7-.5 3.6-1.5" stroke="#0358ff" strokeWidth="2.3" strokeLinecap="round"/>
      <path d="M45 8v12h6" stroke="#97bbff" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>,
    'budget-orange': <svg {...common}>
      <defs><linearGradient id={`${uid}-budget-o`} x1="9" y1="7" x2="56" y2="58"><stop stopColor="#ff8d39"/><stop offset="1" stopColor="#ff4b0b"/></linearGradient><filter id={`${uid}-budget-o-shadow`} x="0" y="0" width="64" height="64"><feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#ff4b0b" floodOpacity="0.18"/></filter></defs>
      <rect x="11" y="8" width="42" height="49" rx="12" fill="#fff" stroke={`url(#${uid}-budget-o)`} strokeWidth="3.8" filter={`url(#${uid}-budget-o-shadow)`}/>
      <path d="M24 19h17M21 29h22M21 38h14" stroke="#07135d" strokeWidth="3.2" strokeLinecap="round" opacity=".82"/>
      <circle cx="42" cy="44" r="12" fill="#fff5eb" stroke="#ff4b0b" strokeWidth="3.6"/>
      <path d="M42 36v16M36 44h12" stroke="#ff4b0b" strokeWidth="3.4" strokeLinecap="round"/>
      <path d="M46 8v12h7" stroke="#ffc29f" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>,
    'budget-blue': <svg {...common}>
      <defs><linearGradient id={`${uid}-budget-b`} x1="10" y1="7" x2="56" y2="58"><stop stopColor="#7f98ff"/><stop offset="1" stopColor="#0358ff"/></linearGradient></defs>
      <rect x="11" y="8" width="42" height="49" rx="12" fill="#f1f5ff" stroke={`url(#${uid}-budget-b)`} strokeWidth="3.8"/>
      <path d="M24 20h17M21 30h22M21 39h14" stroke="#07135d" strokeWidth="3.2" strokeLinecap="round" opacity=".82"/>
      <circle cx="43" cy="44" r="12" fill="#fff" stroke="#0358ff" strokeWidth="3.6"/>
      <path d="M43 37v14M37 44h12" stroke="#0358ff" strokeWidth="3.4" strokeLinecap="round"/>
      <path d="M46 8v12h7" stroke="#adc4ff" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>,
    'service-item': <svg {...common}>
      <defs><linearGradient id={`${uid}-svc`} x1="11" y1="10" x2="54" y2="54"><stop stopColor="#66a6ff"/><stop offset="1" stopColor="#0358ff"/></linearGradient></defs>
      <rect x="8" y="8" width="48" height="48" rx="14" fill="#eef5ff"/>
      <path d="M39 16 47 24 33 38l-8 2 2-8 12-16Z" fill="#fff" stroke={`url(#${uid}-svc)`} strokeWidth="3.4" strokeLinejoin="round"/>
      <path d="M17 47h30M20 21h11M20 30h6" stroke="#0358ff" strokeWidth="3.4" strokeLinecap="round"/>
    </svg>,
    pdf: <svg {...common}>
      <defs><linearGradient id={`${uid}-pdf`} x1="12" y1="8" x2="52" y2="56"><stop stopColor="#ff7b2c"/><stop offset="1" stopColor="#ff4b0b"/></linearGradient></defs>
      <path d="M18 8h25l9 10v38H18V8Z" fill="#fff4ed" stroke={`url(#${uid}-pdf)`} strokeWidth="4" strokeLinejoin="round"/>
      <path d="M42 8v12h10" stroke="#ff4b0b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M24 34h16M24 42h13" stroke="#ff4b0b" strokeWidth="3.2" strokeLinecap="round"/>
    </svg>,
    excel: <svg {...common}>
      <defs><linearGradient id={`${uid}-xls`} x1="12" y1="8" x2="52" y2="56"><stop stopColor="#45d77a"/><stop offset="1" stopColor="#0a9f40"/></linearGradient></defs>
      <path d="M18 8h25l9 10v38H18V8Z" fill="#edfff5" stroke={`url(#${uid}-xls)`} strokeWidth="4" strokeLinejoin="round"/>
      <path d="M42 8v12h10" stroke="#0a9f40" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="m25 31 14 14M39 31 25 45" stroke="#0a9f40" strokeWidth="4" strokeLinecap="round"/>
    </svg>,
    bell: <svg {...common}><path d="M48 28a16 16 0 0 0-32 0c0 17-8 17-8 22h48c0-5-8-5-8-22Z" {...line}/><path d="M27 56h10" {...line}/></svg>,
    'bell-purple': <svg {...common}><defs><linearGradient id={`${uid}-bell`} x1="12" y1="8" x2="52" y2="56"><stop stopColor="#aa78ff"/><stop offset="1" stopColor="#7132e8"/></linearGradient></defs><rect x="6" y="6" width="52" height="52" rx="16" fill="#f4edff"/><path d="M46 28a14 14 0 0 0-28 0c0 15-7 15-7 19h42c0-4-7-4-7-19Z" stroke={`url(#${uid}-bell)`} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M28 53h8" stroke="#7132e8" strokeWidth="4" strokeLinecap="round"/></svg>,
    'notification-calendar': <svg {...common}><defs><linearGradient id={`${uid}-ncal`} x1="11" y1="9" x2="54" y2="56"><stop stopColor="#9b6fff"/><stop offset="1" stopColor="#7132e8"/></linearGradient></defs><rect x="10" y="13" width="42" height="39" rx="10" fill="#f4edff" stroke={`url(#${uid}-ncal)`} strokeWidth="4"/><path d="M10 24h42" stroke={`url(#${uid}-ncal)`} strokeWidth="5"/><path d="M21 9v10M41 9v10" stroke="#7132e8" strokeWidth="4" strokeLinecap="round"/><circle cx="45" cy="44" r="8" fill="#0358ff"/><path d="M45 40v5l4 2" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"/></svg>,
    'clock-orange': <svg {...common}><defs><linearGradient id={`${uid}-oclock`} x1="10" y1="10" x2="55" y2="55"><stop stopColor="#ffb34a"/><stop offset="1" stopColor="#ff4b0b"/></linearGradient></defs><circle cx="32" cy="32" r="24" fill="#fff5eb" stroke={`url(#${uid}-oclock)`} strokeWidth="4"/><path d="M32 19v14l10 6" stroke="#ff4b0b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    menu: <svg {...common}><path d="M13 19h38M13 32h38M13 45h38" {...line}/></svg>,
    close: <svg {...common}><path d="M18 18 46 46M46 18 18 46" {...line}/></svg>,
    chevron: <svg {...common}><path d="m20 26 12 12 12-12" {...line}/></svg>,
    whatsapp: <svg {...common}><defs><linearGradient id={`${uid}-wa`} x1="10" y1="8" x2="55" y2="56"><stop stopColor="#28d66b"/><stop offset="1" stopColor="#0aa64b"/></linearGradient></defs><circle cx="32" cy="32" r="27" fill={`url(#${uid}-wa)`}/><path d="M19 47.5 22 38a18 18 0 1 1 6.4 5.9L19 47.5Z" fill="#fff"/><path d="M27.8 23.8c.6-1.4 1.3-1.6 2.4-1.5h1.4c.5 0 1 .2 1.3.9.4 1 1.4 3.7 1.5 4.1.2.4.2.8-.1 1.2-.4.7-1 1.5-1.6 2-.4.4-.5.7-.2 1.2 1.1 1.8 2.6 3.4 4.3 4.6 1.5 1 2.3 1.3 2.9.7.7-.7 1.5-1.8 1.9-2.3.4-.5.8-.6 1.5-.4l4 1.9c.7.4.8.7.7 1.1-.2 1.6-1.5 3.5-3.2 4.1-1.9.7-5.1.3-9.2-2.2-5.6-3.4-9.1-8.4-9.8-12.3-.4-1.6.1-2.5 1.2-3.1Z" fill="#0aa64b"/></svg>,
    instagram: <svg {...common}><defs><linearGradient id={`${uid}-ig`} x1="9" y1="55" x2="55" y2="9"><stop stopColor="#ffbd2e"/><stop offset=".35" stopColor="#ff2f6d"/><stop offset=".68" stopColor="#a42cff"/><stop offset="1" stopColor="#2864ff"/></linearGradient></defs><rect x="7" y="7" width="50" height="50" rx="15" fill={`url(#${uid}-ig)`}/><rect x="18" y="18" width="28" height="28" rx="8" stroke="#fff" strokeWidth="4"/><circle cx="32" cy="32" r="8" stroke="#fff" strokeWidth="4"/><circle cx="43" cy="21" r="3" fill="#fff"/></svg>,
    'footer-whatsapp-social': <svg {...common}><rect x="7" y="7" width="50" height="50" rx="13" fill="currentColor"/><path d="M20.5 47 23 39.5A17.5 17.5 0 1 1 29.7 43L20.5 47Z" fill="#fff"/><path d="M28.2 23.4c.5-1.2 1.1-1.4 2.1-1.3h1.2c.5 0 .9.2 1.2.8.3.8 1.2 3.2 1.3 3.6.2.4.2.7-.1 1.1-.3.6-.9 1.2-1.4 1.7-.4.4-.4.6-.1 1.1 1 1.6 2.3 3.1 3.9 4.1 1.4.9 2 1.1 2.6.5.6-.6 1.3-1.5 1.7-2 .3-.4.7-.5 1.3-.3l3.5 1.6c.6.3.7.6.6 1-.2 1.4-1.3 3.1-2.8 3.6-1.7.6-4.5.3-8-1.9-4.9-3-8.1-7.5-8.7-10.9-.3-1.4.1-2.2 1-2.8Z" fill="currentColor"/></svg>,
    'footer-instagram-social': <svg {...common}><rect x="7" y="7" width="50" height="50" rx="13" fill="currentColor"/><rect x="18.2" y="18.2" width="27.6" height="27.6" rx="8.2" stroke="#fff" strokeWidth="4"/><circle cx="32" cy="32" r="7.4" stroke="#fff" strokeWidth="4"/><circle cx="42.4" cy="21.6" r="3" fill="#fff"/></svg>,
    'footer-email-social': <svg {...common}><rect x="7" y="7" width="50" height="50" rx="13" fill="currentColor"/><rect x="17" y="20" width="30" height="24" rx="3.8" fill="#fff"/><path d="M18.5 22.5 32 33.5l13.5-11" fill="none" stroke="currentColor" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 42 29 32.2M45 42 35 32.2" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'file-upload': <svg {...common}><defs><linearGradient id={`${uid}-file`} x1="13" y1="8" x2="52" y2="56"><stop stopColor="#8f71ff"/><stop offset="1" stopColor="#6d2ee8"/></linearGradient></defs><path d="M18 8h25l9 10v38H18V8Z" fill="#f4efff" stroke={`url(#${uid}-file)`} strokeWidth="4" strokeLinejoin="round"/><path d="M43 9v11h9" stroke="#6d2ee8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M31 44V28M23 36l8-8 8 8" stroke="#6d2ee8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M41 41h7M45 37v8" stroke="#0358ff" strokeWidth="3.2" strokeLinecap="round"/></svg>,
    'file-check': <svg {...common}><defs><linearGradient id={`${uid}-fcheck`} x1="13" y1="8" x2="52" y2="56"><stop stopColor="#5be18f"/><stop offset="1" stopColor="#09a64b"/></linearGradient></defs><path d="M18 8h25l9 10v38H18V8Z" fill="#edfff5" stroke={`url(#${uid}-fcheck)`} strokeWidth="4" strokeLinejoin="round"/><path d="M43 9v11h9" stroke="#09a64b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="45" cy="45" r="9" fill="#09a64b"/><path d="m40.5 45 3 3.2 6.2-7.2" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    paperclip: <svg {...common}><path d="M24 36 39 21a9 9 0 0 1 13 13L31 55a14 14 0 0 1-20-20l22-22a8 8 0 0 1 12 12L24 46a4 4 0 0 1-6-6l20-20" {...line}/></svg>,
    'email-illustration': <svg {...common} viewBox="0 0 128 128"><defs><linearGradient id={`${uid}-env`} x1="24" y1="43" x2="91" y2="102"><stop stopColor="#6f8cff"/><stop offset="1" stopColor="#0358ff"/></linearGradient><linearGradient id={`${uid}-plane`} x1="76" y1="20" x2="112" y2="58"><stop stopColor="#b8c8ff"/><stop offset="1" stopColor="#6b86ff"/></linearGradient></defs><path d="M22 64c10-14 22-10 29 3 8 15 26 11 31-2 6-16 25-11 26 4" stroke="#9fbaff" strokeWidth="3" strokeDasharray="5 7" fill="none"/><path d="M31 55h58v42H31z" fill={`url(#${uid}-env)`}/><path d="m31 56 29 24 29-24" stroke="#fff" strokeWidth="4" strokeLinejoin="round"/><path d="M47 39h39v34H47z" fill="#fff" stroke="#cbd8ff" strokeWidth="3"/><path d="M57 51h20M57 62h18" stroke="#c4cdf9" strokeWidth="4" strokeLinecap="round"/><path d="M81 31 113 18l-13 35-9-12-10 4Z" fill={`url(#${uid}-plane)`}/><circle cx="88" cy="90" r="18" fill="#7c92ff" stroke="#fff" strokeWidth="5"/><path d="m79 90 7 7 13-15" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 41h15M14 47h24M94 75h20" stroke="#e5ecff" strokeWidth="8" strokeLinecap="round"/></svg>,
  };

  return <SvgWrapper className={cx('wf-icon', `wf-icon--${name.replace(/[^a-zA-Z0-9-]/g, '-')}`)}>{icons[name] ?? icons.check}</SvgWrapper>;
}

function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className={cx('wf-logo', compact && 'wf-logo--compact')}>
      <img src={logo} alt="SG Pequenos Reparos Agendamentos" />
    </Link>
  );
}

function Badge({ icon, children, color = 'orange' }: { icon?: string; children: ReactNode; color?: Accent }) {
  return <span className={cx('wf-badge', `wf-badge--${color}`)}>{icon ? <Icon name={icon} /> : null}{children}</span>;
}

function ActionCard({ icon, title, text, color, onClick, to }: { icon: string; title: string; text?: string; color: Accent; onClick?: () => void; to?: string }) {
  const content = (
    <>
      <span className="wf-action-card__icon"><Icon name={icon} /></span>
      <span className="wf-action-card__body"><strong>{title}</strong>{text ? <small>{text}</small> : null}</span>
      <span className="wf-action-card__arrow">›</span>
    </>
  );
  if (to) return <Link to={to} className={cx('wf-action-card', `wf-action-card--${color}`)}>{content}</Link>;
  return <button type="button" className={cx('wf-action-card', `wf-action-card--${color}`)} onClick={onClick}>{content}</button>;
}

function HeroVisual({ type, className }: { type: 'client' | 'admin'; className?: string }) {
  const desktop = type === 'admin' ? heroAdmin : heroClient;
  const mobile = type === 'admin' ? heroAdminMobile : heroClientMobile;

  return (
    <ResponsiveAsset
      alt="Prestador de pequenos reparos"
      className={cx('wf-media-frame', 'wf-media-frame--hero', 'wf-hero-visual', `wf-hero-visual--${type}`, className)}
      desktopSrc={desktop}
      mobileSrc={mobile}
    />
  );
}

type FooterRedirectTarget = {
  label: string;
  title: string;
  description: string;
  url: string;
  method: 'external' | 'email';
  icon: string;
};

function LandingFooter({ admin = false, setModal }: { admin?: boolean; setModal?: (modal: ModalKind) => void }) {
  const [emailCopied, setEmailCopied] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState<FooterRedirectTarget | null>(null);
  const openServices = () => setModal?.('services-info');
  const openHelp = () => setModal?.('help-contact');
  const openContact = () => setModal?.('contact');

  const requestRedirect = (target: FooterRedirectTarget) => {
    setRedirectTarget(target);
  };

  const closeRedirectModal = () => {
    setRedirectTarget(null);
  };

  const confirmRedirect = () => {
    if (!redirectTarget) return;
    const target = redirectTarget;
    setRedirectTarget(null);
    if (target.method === 'email') {
      window.location.href = target.url;
      return;
    }
    openExternal(target.url);
  };

  const requestInstagramRedirect = () => requestRedirect({
    label: 'Instagram',
    title: 'Abrir Instagram?',
    description: 'Você será redirecionado para o perfil oficial da SG Pequenos Reparos em uma nova aba.',
    url: supportInstagramUrl,
    method: 'external',
    icon: 'footer-instagram-social',
  });

  const requestWhatsAppRedirect = () => requestRedirect({
    label: 'WhatsApp',
    title: 'Abrir WhatsApp?',
    description: 'Você será redirecionado para iniciar uma conversa com a SG Pequenos Reparos.',
    url: supportWhatsAppUrl,
    method: 'external',
    icon: 'footer-whatsapp-social',
  });

  const requestEmailRedirect = () => requestRedirect({
    label: 'E-mail',
    title: 'Abrir e-mail?',
    description: `Seu aplicativo de e-mail será aberto para enviar uma mensagem para ${supportEmail}.`,
    url: `mailto:${supportEmail}`,
    method: 'email',
    icon: 'footer-email-social',
  });

  const handleCopyEmail = async () => {
    const copied = await copySupportEmail();
    if (!copied) {
      requestEmailRedirect();
      return;
    }
    setEmailCopied(true);
    window.setTimeout(() => setEmailCopied(false), 1800);
  };

  if (admin) {
    return (
      <footer className="wf-footer">
        <LogoMark compact />
        <p>Plataforma completa para gestão de agendamentos.</p>
        <button type="button" onClick={openServices}>Sobre o serviço</button>
        <button type="button" onClick={openHelp}>Precisa de ajuda?</button>
        <button type="button" onClick={openContact}>Contato</button>
        <strong><Icon name="footer-security" /> Seus dados protegidos com privacidade.</strong>
      </footer>
    );
  }

  return (
    <>
      <footer className="wf-footer wf-footer--client-final wf-footer--client-social">
        <div className="wf-footer-brand">
          <LogoMark compact />
        </div>

        <nav className="wf-footer-links" aria-label="Links institucionais">
          <button type="button" onClick={openServices}>Sobre o serviço</button>
          <button type="button" onClick={openHelp}>Perguntas frequentes</button>
          <button type="button" onClick={openContact}>Contato</button>
        </nav>

        <section className="wf-footer-social" aria-label="Redes sociais e contato">
          <span className="wf-footer-social__title">Redes sociais</span>
          <div className="wf-footer-social__icons">
            <button
              type="button"
              className="wf-footer-social__icon wf-footer-social__icon--instagram"
              aria-label="Abrir Instagram da SG Pequenos Reparos"
              onClick={requestInstagramRedirect}
            >
              <Icon name="footer-instagram-social" />
            </button>
            <button
              type="button"
              className="wf-footer-social__icon wf-footer-social__icon--whatsapp"
              aria-label="Abrir WhatsApp da SG Pequenos Reparos"
              onClick={requestWhatsAppRedirect}
            >
              <Icon name="footer-whatsapp-social" />
            </button>
            <button
              type="button"
              className="wf-footer-social__icon wf-footer-social__icon--email wf-footer-social__icon--email-mobile"
              aria-label="Enviar e-mail para a SG Pequenos Reparos"
              onClick={requestEmailRedirect}
            >
              <Icon name="footer-email-social" />
            </button>
          </div>
          <div className="wf-footer-email-card" aria-label="E-mail de contato">
            <button
              type="button"
              className="wf-footer-email-card__mail"
              aria-label="Enviar e-mail para a SG Pequenos Reparos"
              onClick={requestEmailRedirect}
            >
              <Icon name="footer-email-social" />
            </button>
            <span className="wf-footer-email-card__address">{supportEmail}</span>
            <button type="button" className="wf-footer-email-card__copy" onClick={handleCopyEmail}>
              {emailCopied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </section>
      </footer>

      {redirectTarget ? (
        <div className="wf-footer-redirect" role="presentation" onClick={closeRedirectModal}>
          <section
            className={cx('wf-footer-redirect__dialog', `wf-footer-redirect__dialog--${redirectTarget.method}`)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wf-footer-redirect-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={cx('wf-footer-redirect__icon', `wf-footer-redirect__icon--${redirectTarget.label.toLowerCase()}`)}>
              <Icon name={redirectTarget.icon} />
            </div>
            <div className="wf-footer-redirect__content">
              <span className="wf-footer-redirect__eyebrow">Redirecionamento externo</span>
              <h2 id="wf-footer-redirect-title">{redirectTarget.title}</h2>
              <p>{redirectTarget.description}</p>
            </div>
            <div className="wf-footer-redirect__actions">
              <button type="button" className="wf-footer-redirect__cancel" onClick={closeRedirectModal}>Cancelar</button>
              <button type="button" className="wf-footer-redirect__confirm" onClick={confirmRedirect}>Continuar</button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

type ClientProfileSnapshot = {
  verified: boolean;
  name?: string;
  phone?: string;
  email?: string;
};

function readClientProfileSnapshot(): ClientProfileSnapshot {
  const verification = getStoredPhoneVerification();
  const profile = getStoredClientProfile();
  return {
    verified: Boolean(verification),
    name: profile?.name,
    phone: profile?.phone || verification?.phone,
    email: profile?.email,
  };
}

function useClientProfileSnapshot(): ClientProfileSnapshot {
  const [snapshot, setSnapshot] = useState<ClientProfileSnapshot>(() => readClientProfileSnapshot());

  useEffect(() => {
    const refresh = () => setSnapshot(readClientProfileSnapshot());
    window.addEventListener(getPhoneVerificationChangedEventName(), refresh);
    window.addEventListener(getClientProfileChangedEventName(), refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(getPhoneVerificationChangedEventName(), refresh);
      window.removeEventListener(getClientProfileChangedEventName(), refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return snapshot;
}

function ClientLandingModalButtons({ profile, setModal }: { profile: ClientProfileSnapshot; setModal: (modal: ModalKind) => void }) {
  return (
    <div className="wf-actions-grid wf-actions-grid--client">
      <ActionCard icon="calendar-create" title="Criar agendamento" color="orange" onClick={() => setModal('create-client')} />
      <ActionCard icon="calendar-clock" title="Acompanhar agendamento" color="blue" to="/meus-agendamentos" />
      <ActionCard
        icon={profile.verified ? 'user' : 'mobile-phone'}
        title={profile.verified ? 'Perfil' : 'Confirmar telefone'}
        color="green"
        onClick={() => setModal(profile.verified ? 'client-profile' : 'confirm-phone')}
      />
      <ActionCard icon="chat-bubbles" title="Fale conosco" color="purple" onClick={() => setModal('contact')} />
    </div>
  );
}

type ServiceShowcaseItem = {
  title: string;
  alt: string;
  image: string;
};

const SERVICE_SHOWCASE_INTERVAL_MS = 4600;

const SERVICE_SHOWCASE_ITEMS: ServiceShowcaseItem[] = [
  {
    title: 'Serviços de pintor',
    alt: 'Card do serviço de pintura',
    image: servicePinturaCard,
  },
  {
    title: 'Montagem e instalação',
    alt: 'Card do serviço de montagem e instalação',
    image: serviceMontagemCard,
  },
  {
    title: 'Serviços de pedreiro',
    alt: 'Card do serviço de pedreiro',
    image: servicePedreiroCard,
  },
  {
    title: 'Filmagem com drone',
    alt: 'Card do serviço de filmagem com drone',
    image: serviceDroneCard,
  },
  {
    title: 'Hidráulica',
    alt: 'Card do serviço de hidráulica',
    image: serviceHidraulicaCard,
  },
  {
    title: 'Elétrica básica',
    alt: 'Card do serviço de elétrica básica',
    image: serviceEletricaCard,
  },
  {
    title: 'Jardinagem',
    alt: 'Card do serviço de jardinagem',
    image: serviceJardinagemCard,
  },
];

export function ServiceShowcaseCarousel() {
  const [index, setIndex] = useState(0);
  const [progressKey, setProgressKey] = useState(0);
  const carouselRef = useRef<HTMLElement | null>(null);
  const pointerStartRef = useRef<{ x: number; pointerId: number } | null>(null);

  const resetProgress = useCallback(() => {
    carouselRef.current?.style.setProperty('--wf-carousel-progress', '0', 'important');
    setProgressKey((current) => current + 1);
  }, []);

  const goTo = useCallback((nextIndex: number) => {
    setIndex(((nextIndex % SERVICE_SHOWCASE_ITEMS.length) + SERVICE_SHOWCASE_ITEMS.length) % SERVICE_SHOWCASE_ITEMS.length);
    resetProgress();
  }, [resetProgress]);

  const goPrev = useCallback(() => {
    setIndex((current) => (current - 1 + SERVICE_SHOWCASE_ITEMS.length) % SERVICE_SHOWCASE_ITEMS.length);
    resetProgress();
  }, [resetProgress]);

  const goNext = useCallback(() => {
    setIndex((current) => (current + 1) % SERVICE_SHOWCASE_ITEMS.length);
    resetProgress();
  }, [resetProgress]);

  useEffect(() => {
    SERVICE_SHOWCASE_ITEMS.forEach((service) => {
      const image = new Image();
      image.src = service.image;
    });
  }, []);

  useEffect(() => {
    let animationFrame = 0;
    const startedAt = window.performance.now();

    const updateProgress = (now: number) => {
      const ratio = Math.min(1, (now - startedAt) / SERVICE_SHOWCASE_INTERVAL_MS);
      carouselRef.current?.style.setProperty('--wf-carousel-progress', ratio.toFixed(4), 'important');

      if (ratio < 1) {
        animationFrame = window.requestAnimationFrame(updateProgress);
      }
    };

    carouselRef.current?.style.setProperty('--wf-carousel-progress', '0', 'important');
    animationFrame = window.requestAnimationFrame(updateProgress);

    const timer = window.setTimeout(goNext, SERVICE_SHOWCASE_INTERVAL_MS);

    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [goNext, index, progressKey]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: event.clientX, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (!start) return;

    const deltaX = event.clientX - start.x;
    if (Math.abs(deltaX) >= 38) {
      if (deltaX > 0) {
        goPrev();
        return;
      }

      goNext();
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - bounds.left;

    if (relativeX <= bounds.width * 0.34) {
      goPrev();
      return;
    }

    if (relativeX >= bounds.width * 0.66) {
      goNext();
    }
  };

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return (
    <article
      ref={carouselRef}
      className="wf-services-showcase"
      aria-roledescription="carousel"
      aria-label="Carrossel de serviços prestados"
    >
      <div
        className="wf-services-showcase__viewport"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {SERVICE_SHOWCASE_ITEMS.map((service, serviceIndex) => (
          <img
            key={service.image}
            className={cx('wf-services-showcase__image', serviceIndex === index && 'is-active')}
            src={service.image}
            alt={service.alt}
            loading={serviceIndex === 0 ? 'eager' : 'lazy'}
            decoding="async"
            draggable={false}
            aria-hidden={serviceIndex !== index}
          />
        ))}

        <div className="wf-services-showcase__overlay">
          <div className="wf-services-showcase__dots" role="tablist" aria-label="Indicadores do carrossel">
            {SERVICE_SHOWCASE_ITEMS.map((service, serviceIndex) => (
              <button
                key={service.title}
                type="button"
                className={cx('wf-services-showcase__dot', serviceIndex === index && 'is-active')}
                aria-label={`Ir para ${service.title}`}
                aria-pressed={serviceIndex === index}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => goTo(serviceIndex)}
              >
                <span
                  className="wf-services-showcase__dot-progress"
                  aria-hidden="true"
                />
                <span className="sr-only">{service.title}</span>
              </button>
            ))}
          </div>
          <span className="wf-services-showcase__counter">{index + 1} / {SERVICE_SHOWCASE_ITEMS.length}</span>
        </div>
      </div>
    </article>
  );
}

export function ClientLanding() {
  const [modal, setModal] = useState<ModalKind>(null);
  const profile = useClientProfileSnapshot();
  useDoubleBackToLeavePage();
  return (
    <PageShell className="wf-page wf-client-landing">
      <PublicNavbar onCreate={() => setModal('create-client')} onNotifications={() => setModal('notifications')} onConfirmPhone={() => setModal('confirm-phone')} onProfile={() => setModal('client-profile')} />
      <main className="wf-landing-main">
        <LandingHero
          badge={<Badge icon="calendar" color="orange">Simples, rápido e sem complicações</Badge>}
          description={<>Crie seu agendamento sem precisar fazer login.<br />No dia, confirme seu número de telefone e pronto!</>}
          highlight="facilidade."
          onPrimaryAction={() => setModal('create-client')}
          onSecondaryAction={() => setModal('services-info')}
          primaryIcon={<Icon name="calendar" />}
          primaryLabel="Criar agendamento"
          secondaryIcon={<span className="wf-play"><Icon name="play" /></span>}
          secondaryLabel="Como funciona?"
          title="Organize seus agendamentos e pequenos reparos com"
        />

        <ClientLandingModalButtons profile={profile} setModal={setModal} />

        <section className="wf-info-row" id="wf-why-use">
          <article className="wf-house-card">
            <img src={houseCard} alt="Casa atendida" />
            <div>
              <h2>Agende quando e onde estiver</h2>
              <p>Do computador ou do celular, organize seus atendimentos de forma rápida e segura, 24 horas por dia.</p>
            </div>
          </article>
          <ServiceCarousel />
        </section>
        <ClientFooter
          brand={<LogoMark compact />}
          copySupportEmail={copySupportEmail}
          onContact={() => setModal('contact')}
          onHelp={() => setModal('help-contact')}
          onServices={() => setModal('services-info')}
          openExternal={openExternal}
          renderIcon={(name) => <Icon name={name} />}
          supportEmail={supportEmail}
          supportInstagramUrl={supportInstagramUrl}
          supportWhatsAppUrl={supportWhatsAppUrl}
        />
      </main>
      <CalendarMateModal modal={modal} onClose={() => setModal(null)} />
    </PageShell>
  );
}

function CalendarBoard({ bookings = [], admin = false, onCreate }: { bookings?: BookingItem[]; admin?: boolean; onCreate?: (date?: string) => void }) {
  const [monthStart, setMonthStart] = useState(startOfMonth());
  const { data: bootstrap } = usePublicBootstrap(true);
  const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const today = toIsoDate(new Date());
  const todayWeekday = toLocalDate(today).getDay();
  const currentAllowedMonth = startOfMonth();
  const maxFutureMonthsAhead = getMaxFutureMonthsAhead(bootstrap);
  const nextAllowedMonth = shiftMonthStart(currentAllowedMonth, maxFutureMonthsAhead);
  const displayMonthStart = monthStart < currentAllowedMonth
    ? currentAllowedMonth
    : monthStart > nextAllowedMonth
      ? nextAllowedMonth
      : monthStart;
  const grid = useMemo(() => getMonthGrid(displayMonthStart), [displayMonthStart]);
  const maxAllowedDate = endOfMonth(nextAllowedMonth);
  const calendarCity = getDefaultCity(bootstrap);
  const calendarSlotMinutes = getSlotMinutes(bootstrap);
  const calendarDurationMinutes = getBookingDurationMinutesByCity(bootstrap, calendarCity);
  const monthAvailability = useAvailableMonthDates(
    displayMonthStart,
    true,
    calendarCity,
    calendarSlotMinutes,
    calendarDurationMinutes,
    maxFutureMonthsAhead,
  );
  const availableCalendarDates = useMemo(
    () => new Set(monthAvailability.availableDates),
    [monthAvailability.availableDates],
  );
  const unavailableDates = useMemo(
    () => new Set(build4x4UnavailableDates(displayMonthStart, bootstrap?.schedule?.cycleStart)),
    [bootstrap?.schedule?.cycleStart, displayMonthStart],
  );
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, BookingItem[]>();
    bookings.forEach((booking) => map.set(booking.date, [...(map.get(booking.date) ?? []), booking]));
    return map;
  }, [bookings]);
  const visibleCities = useMemo(() => {
    const allowedKeys = new Set(ALLOWED_CITIES.map((city) => normalizeText(city)));
    const cities = (Array.from(new Set(bookings.map((booking) => booking.city).filter(Boolean))) as string[])
      .filter((city) => allowedKeys.has(normalizeText(city)));
    const merged = [...ALLOWED_CITIES, ...cities];
    const seen = new Set<string>();
    return merged.filter((city) => {
      const key = normalizeText(city);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [bookings]);
  const supportedCities = useMemo(() => visibleCities.map((city, index) => {
    const cityConfig = resolveSupportedCityStyle(city, index);
    return {
      color: cityConfig.color,
      icon: cityConfig.icon,
      name: city,
    };
  }), [visibleCities]);
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(toLocalDate(displayMonthStart));
  const monthNameLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(toLocalDate(displayMonthStart));
  const monthChipLabel = monthNameLabel.charAt(0).toUpperCase() + monthNameLabel.slice(1);
  const canShiftBack = displayMonthStart > currentAllowedMonth;
  const canShiftForward = displayMonthStart < nextAllowedMonth;

  const shift = (delta: number) => {
    if (delta < 0 && !canShiftBack) return;
    if (delta > 0 && !canShiftForward) return;
    setMonthStart(shiftMonthStart(displayMonthStart, delta));
  };

  return (
    <section className="wf-calendar-panel">
      <div className="wf-section-title wf-section-title--calendar">
        <span className="wf-large-icon"><Icon name="appointments-title-calendar" /></span>
        <div>
          <h1>Agendamentos</h1>
          <p>Visualize, organize e acompanhe os atendimentos.</p>
        </div>
        <div className="wf-month-pills">
          <button type="button" className="wf-month-pill wf-month-pill--arrow wf-month-pill--mobile" onClick={() => shift(-1)} disabled={!canShiftBack} aria-label="Mês anterior">‹</button>
          <span className="wf-month-pill wf-month-pill--label wf-month-pill--mobile">{monthLabel}</span>
          <button type="button" className="wf-month-pill wf-month-pill--arrow wf-month-pill--mobile" onClick={() => shift(1)} disabled={!canShiftForward} aria-label="Próximo mês">›</button>
          <button type="button" className="wf-month-pill wf-month-pill--current wf-month-pill--desktop" onClick={() => setMonthStart(currentAllowedMonth)} disabled={!canShiftBack}>
            Mês Atual
          </button>
          <button type="button" className="wf-month-pill wf-month-pill--label wf-month-pill--desktop" onClick={() => shift(1)} disabled={!canShiftForward}>
            {monthChipLabel}
          </button>
        </div>
      </div>
      <SupportedCitiesPanel admin={admin} cities={supportedCities} panelIcon={cityPanelIcon} />
      <div className="wf-calendar-grid">
        {days.map((day, index) => (
          <strong
            key={day}
            className={cx('wf-calendar-weekday', `wf-calendar-weekday--tone-${index}`, todayWeekday === index && 'is-current')}
          >
            {day}
          </strong>
        ))}
        {grid.map((item) => {
          const dayBookings = bookingsByDate.get(item.iso) ?? [];
          const isPast = item.iso < today;
          const isOutsideWindow = item.iso > maxAllowedDate;
          const lacksAvailableSlots = item.isCurrentMonth
            && !isPast
            && !isOutsideWindow
            && !monthAvailability.isLoading
            && availableCalendarDates.size > 0
            && !availableCalendarDates.has(item.iso);
          const isUnavailable = unavailableDates.has(item.iso) || lacksAvailableSlots;
          const canCreateOnDate = Boolean(onCreate) && item.isCurrentMonth && !isPast && !isOutsideWindow && !isUnavailable;
          return (
            <div
              key={item.iso}
              className={cx('wf-calendar-day', item.iso === today && !isUnavailable && 'is-selected', (!item.isCurrentMonth || isPast || isOutsideWindow) && 'is-muted', isUnavailable && 'is-unavailable', canCreateOnDate && 'is-clickable', dayBookings.length > 0 && 'has-bookings')}
              role={canCreateOnDate ? 'button' : undefined}
              tabIndex={canCreateOnDate ? 0 : undefined}
              aria-label={canCreateOnDate ? `Criar agendamento em ${item.day}` : undefined}
              onClick={canCreateOnDate ? () => onCreate?.(item.iso) : undefined}
              onKeyDown={canCreateOnDate ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onCreate?.(item.iso);
                }
              } : undefined}
            >
              <b>{item.day}</b>
              {dayBookings.length ? <span className="wf-dots">{dayBookings.slice(0, 4).map((booking) => <i key={booking.id} />)}</span> : null}
            </div>
          );
        })}
      </div>
      
    </section>
  );
}

function FiltersBar({ admin = false, canAssign = true, className }: { admin?: boolean; canAssign?: boolean; className?: string }) {
  const [active, setActive] = useState('Todos');
  return (
    <div className={cx('wf-filters-bar', className)}>
      <div className="wf-filter-tabs">{['Todos', 'Maio', 'Junho'].map((tab) => <button key={tab} type="button" className={active === tab ? 'is-active' : ''} onClick={() => setActive(tab)}>{tab}</button>)}</div>
      <label className="wf-search"><Icon name="booking-search" /><input placeholder="Buscar por cliente, telefone ou endereço..." /></label>
      <button type="button" className="wf-filter-btn" onClick={() => notifyUnavailable('Filtros avançados')}><Icon name="booking-filter" /></button>
      {admin && canAssign ? <button type="button" className="wf-filter-btn wf-filter-btn--wide" onClick={() => notifyUnavailable('Designação em lote')}>Designar em lote</button> : null}
    </div>
  );
}

function BookingCard({
  booking,
  admin,
  canAssign = true,
  onDetails,
  onAssign,
  onEdit,
}: {
  booking: BookingItem;
  admin?: boolean;
  canAssign?: boolean;
  onAssign?: () => void;
  onDetails?: () => void;
  onEdit?: () => void;
}) {
  return (
    <AppointmentCard
      appointment={booking}
      admin={admin}
      canAssign={canAssign}
      formatCreatedDate={(date) => ptDate.format(toLocalDate(date))}
      formatPhone={formatPhoneForDisplay}
      onAssign={onAssign}
      onCancel={() => notifyUnavailable('Cancelamento')}
      onDetails={onDetails}
      onEdit={onEdit}
      onWhatsApp={openWhatsApp}
      renderIcon={(name) => <Icon name={name} />}
      renderStatus={(status) => <Badge color="green">{status}</Badge>}
    />
  );
}

function EmptyState({ title, text, action, onAction }: { title: string; text: string; action?: string; onAction?: () => void }) {
  return (
    <article className="wf-empty-state">
      <Icon name="calendar" />
      <h2>{title}</h2>
      <p>{text}</p>
      {action ? <button type="button" className="wf-primary-cta wf-primary-cta--small" onClick={onAction}>{action}</button> : null}
    </article>
  );
}

export function ClientBookings() {
  const [modal, setModal] = useState<ModalKind>(null);
  const [context, setContext] = useState<ModalContext>({});
  const profile = useClientProfileSnapshot();
  const { bookings, isLoading, isError, hasTokens } = useClientBookingsData();
  const openDetails = (booking: BookingItem) => { setContext({ booking }); setModal('client-details'); };
  const openCreate = (date?: string) => { setContext(date ? { createDate: date } : {}); setModal('create-client'); };

  return (
    <>
      <AppointmentsPageShell
        pageClassName="wf-page wf-page--list"
        clientNavbar={{ page: 'my', onCreate: openCreate, onNotifications: () => setModal('notifications'), onConfirmPhone: () => setModal('confirm-phone'), onProfile: () => setModal('client-profile') }}
        mobileFilters={<FiltersBar className="wf-filters-bar--mobile" />}
        calendar={<CalendarBoard bookings={bookings} onCreate={openCreate} />}
      >
        <div className="wf-booking-tools">
          <button type="button" onClick={() => setModal('notifications')}><Icon name="bell-purple" /> Notificações</button>
          <button type="button" onClick={() => setModal(profile.verified ? 'client-profile' : 'confirm-phone')}><Icon name={profile.verified ? 'user' : 'shield-check'} /> {profile.verified ? 'Perfil' : 'Confirmar telefone'}</button>
        </div>
        <FiltersBar className="wf-filters-bar--desktop" />
        <div className="wf-booking-stack">
          {isLoading ? <EmptyState title="Carregando agendamentos" text="Buscando seus dados reais no sistema." /> : null}
          {isError ? <EmptyState title="Não foi possível carregar" text="Confira sua conexão ou confirme novamente seu telefone." action="Confirmar telefone" onAction={() => setModal('confirm-phone')} /> : null}
          {!isLoading && !isError && bookings.length === 0 ? <EmptyState title="Nenhum agendamento encontrado" text={hasTokens ? 'Você ainda não possui agendamentos vinculados aos tokens salvos.' : 'Confirme seu telefone ou crie um novo agendamento para acompanhar por aqui.'} action="Criar agendamento" onAction={openCreate} /> : null}
          {bookings.map((booking) => <BookingCard key={booking.id} booking={booking} onDetails={() => openDetails(booking)} onEdit={openCreate} />)}
        </div>
      </AppointmentsPageShell>
      <CalendarMateModal modal={modal} context={context} onClose={() => setModal(null)} />
    </>
  );
}

function AdminLandingCard({
  icon,
  mediaIcon,
  title,
  text,
  color,
  view,
  onOpen,
  wide = false,
}: {
  icon: string;
  mediaIcon?: string;
  title: string;
  text: string;
  color: Accent;
  view: AdminView;
  onOpen: (view: AdminView) => void;
  wide?: boolean;
}) {
  return (
    <button type="button" className={cx('wf-admin-card', `wf-admin-card--${color}`, wide && 'wf-admin-card--wide', mediaIcon && 'wf-admin-card--with-media')} onClick={() => onOpen(view)}>
      <span className="wf-admin-card__icon"><Icon name={icon} /></span>
      <span className="wf-admin-card__copy"><strong>{title}</strong><small>{text}</small></span>
      {mediaIcon ? <span className="wf-admin-card__media"><Icon name={mediaIcon} /></span> : null}
      <span className="wf-admin-card__arrow" aria-hidden="true"><Icon name="arrow-right" /></span>
    </button>
  );
}

function getAdminAuthErrorMessage(error: unknown, step: 'start' | 'confirm'): string {
  if (error instanceof ApiError) {
    if (step === 'start') {
      if (error.status === 400) return 'Informe um telefone válido.';
      if (error.status === 401 || error.status === 403) return 'Número não autorizado para acesso administrativo.';
      return 'Não foi possível validar o acesso agora. Tente novamente.';
    }
    if (error.status === 400 || error.status === 401 || error.status === 403) {
      return 'Código inválido ou expirado.';
    }
    return 'Não foi possível validar o acesso agora. Tente novamente.';
  }
  return 'Não foi possível validar o acesso agora. Tente novamente.';
}

export function AdminLanding() {
  const [modal, setModal] = useState<ModalKind>(null);
  const navigate = useNavigate();
  useDoubleBackToLeavePage();
  const session = getStoredAdminSession();
  const openView = (view: AdminView) => {
    navigate(`/admin/dashboard?view=${view === 'agenda' ? 'agendamentos' : view}`);
  };
  const openNavbarView = (view: AdminView) => {
    navigate(`/admin/dashboard?view=${view === 'agenda' ? 'agendamentos' : view}`);
  };
  if (!session) {
    return <AdminLoginScreen onDone={() => navigate('/admin/dashboard?view=agendamentos', { replace: true })} />;
  }
  const owner = session.role === 'OWNER';
  return (
    <PageShell className="wf-page wf-admin-landing">
      <AdminNavbar
        adminName={session.name}
        owner={owner}
        onAdminClick={() => { clearAdminToken(); navigate('/', { replace: true }); }}
        onBudgetClick={() => setModal('budget-admin')}
        onCreate={() => setModal('create-client')}
        onEmailClick={() => setModal('email-admin')}
        onMobileAdminClick={() => { clearAdminToken(); navigate('/', { replace: true }); }}
        onMobileMenu={() => notifyUnavailable('Menu do administrador')}
        onNotificationsClick={() => setModal('notifications')}
        onView={openNavbarView}
      />
      <main className="wf-landing-main wf-landing-main--admin">
        <section className="wf-hero wf-hero--admin wf-admin-home-hero-final">
          <div className="wf-hero-copy wf-admin-home-copy-final">
            <h1>Gerencie sua agenda e atendimentos com <span>facilidade.</span></h1>
            <p>Organize sua agenda, atribua prestadores, controle bloqueios e acompanhe extrato e histórico de atendimentos em um só lugar.</p>
          </div>
          <HeroVisual type="admin" className="wf-admin-home-visual-final" />
        </section>
        <section className="wf-admin-card-grid">
          <AdminLandingCard icon="admin-agenda-calendar" title="Agenda" text="Visualize e gerencie sua disponibilidade diária de forma rápida e intuitiva." color="blue" view="agendamentos" onOpen={openView} />
          <AdminLandingCard icon="admin-appointments" title="Agendamentos" text="Crie, edite, atribua e acompanhe todos os agendamentos em um só lugar." color="orange" view="agendamentos" onOpen={openView} />
          {owner ? <AdminLandingCard icon="admin-blocks" title="Bloqueios" text="Bloqueie horários e períodos indisponíveis para evitar conflitos na agenda." color="green" view="bloqueios" onOpen={openView} /> : null}
          <AdminLandingCard icon="admin-history" title="Histórico" text="Consulte atendimentos realizados e detalhes completos de cada serviço." color="purple" view="historico" onOpen={openView} />
          {owner ? <AdminLandingCard icon="budget-blue" mediaIcon="admin-finance" title="Extrato / Financeiro" text="Acompanhe recebimentos, faturamento e saldos de forma organizada." color="blue" view="extrato" onOpen={openView} wide /> : null}
        </section>
        <LandingFooter admin setModal={setModal} />
      </main>
      <CalendarMateModal modal={modal} onClose={() => setModal(null)} />
    </PageShell>
  );
}

function AdminLoginScreen({ onDone }: { onDone: () => void }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const start = async () => {
    if (!phone.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await startAdminLogin(phone);
      setVerificationId(response.verificationId);
    } catch (err) {
      setError(getAdminAuthErrorMessage(err, 'start'));
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!verificationId || code.trim().length < 3 || loading) return;
    setLoading(true);
    setError('');
    try {
      await confirmAdminLogin(verificationId, code.trim());
      onDone();
    } catch (err) {
      setError(getAdminAuthErrorMessage(err, 'confirm'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell className="wf-page wf-admin-landing wf-admin-login-page">
      <main className="wf-landing-main wf-landing-main--admin">
        <section className="wf-hero wf-hero--admin wf-admin-login-hero-final">
          <div className="wf-hero-copy wf-admin-login-copy-final">
            <h1>Acesso do prestador</h1>
            <p>Entre com o telefone cadastrado para carregar sua agenda administrativa.</p>
            <div className="wf-admin-login-card">
              <label>Telefone<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(31) 99999-9999" inputMode="tel" /></label>
              {verificationId ? <label>Codigo SMS<input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="000" inputMode="numeric" /></label> : null}
              {error ? <p className="booking-form__error">{error}</p> : null}
              <button type="button" className="wf-primary-cta" onClick={verificationId ? confirm : start} disabled={loading || (!verificationId && !phone.trim()) || (Boolean(verificationId) && code.length < 3)}>
                {loading ? 'Validando...' : verificationId ? 'Entrar' : 'Enviar codigo'} <Icon name="user" />
              </button>
            </div>
          </div>
          <HeroVisual type="admin" className="wf-admin-login-visual-final" />
        </section>
      </main>
    </PageShell>
  );
}

function getInitialAdminView(): AdminView {
  const param = new URLSearchParams(window.location.search).get('view');
  if (param === 'agenda') return 'agendamentos';
  if (param === 'bloqueios' || param === 'historico' || param === 'extrato' || param === 'agendamentos') return param;
  return 'agendamentos';
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [view, setView] = useState<AdminView>(getInitialAdminView);
  const [modal, setModal] = useState<ModalKind>(null);
  const [context, setContext] = useState<ModalContext>({});
  const [importedFinanceDashboard, setImportedFinanceDashboard] = useState<FinancialDashboardDTO | null>(null);
  const openCreate = (date?: string) => { setContext(date ? { createDate: date } : {}); setModal('create-client'); };
  const session = getStoredAdminSession();
  const owner = session?.role === 'OWNER';
  const effectiveView = !owner && (view === 'extrato' || view === 'bloqueios') ? 'agendamentos' : view;

  if (!session) {
    return <AdminLoginScreen onDone={() => window.location.assign('/admin/dashboard?view=agendamentos')} />;
  }

  const selectAdminView = (nextView: AdminView) => {
    const resolvedView = nextView === 'agenda' ? 'agendamentos' : nextView;
    setView(resolvedView);
    navigate(`/admin/dashboard?view=${resolvedView}`);
  };

  return (
    <PageShell className="wf-page wf-admin-dashboard">
      <AdminNavbar
        active={effectiveView}
        adminName={session.name}
        owner={owner}
        onAdminClick={() => { clearAdminToken(); navigate('/', { replace: true }); }}
        onBudgetClick={() => { setContext({}); setModal('budget-admin'); }}
        onCreate={openCreate}
        onEmailClick={() => { setContext({}); setModal('email-admin'); }}
        onMobileAdminClick={() => { clearAdminToken(); navigate('/', { replace: true }); }}
        onMobileMenu={() => notifyUnavailable('Menu do administrador')}
        onNotificationsClick={() => setModal('notifications')}
        onView={selectAdminView}
      />
      <main className="wf-admin-main">
        {effectiveView === 'agendamentos' ? <AdminAppointmentsView setModal={setModal} setContext={setContext} /> : null}
        {effectiveView === 'bloqueios' ? <AdminBlocksView setModal={setModal} /> : null}
        {effectiveView === 'historico' ? <AdminHistoryView /> : null}
        {effectiveView === 'extrato' ? <AdminFinanceView importedDashboard={importedFinanceDashboard} onOpenOfx={() => setModal('ofx-admin')} /> : null}
      </main>
      <CalendarMateModal modal={modal} context={context} onClose={() => setModal(null)} onOfxImported={setImportedFinanceDashboard} />
    </PageShell>
  );
}

function AdminAppointmentsView({ setModal, setContext }: { setModal: (modal: ModalKind) => void; setContext: (context: ModalContext) => void }) {
  const navigate = useNavigate();
  const { bookings, isLoading, isError, hasAdminToken } = useAdminBookingsData();
  const owner = isStoredAdminOwner();
  const openDetails = (booking: BookingItem) => {
    setContext({ booking });
    navigate(`/admin/booking/${booking.id}`);
  };
  const openAssign = (booking: BookingItem) => { setContext({ booking }); setModal('assign-provider'); };
  const openEdit = (booking: BookingItem) => { setContext({ booking }); setModal('edit-admin'); };
  const openCreate = (date?: string) => {
    setContext(date ? { createDate: date } : {});
    setModal('create-client');
  };

  return (
    <AppointmentsPageShell
      admin
      mobileFilters={<FiltersBar admin canAssign={owner} className="wf-filters-bar--mobile" />}
      calendar={<CalendarBoard bookings={bookings} admin onCreate={openCreate} />}
    >
      <FiltersBar admin canAssign={owner} className="wf-filters-bar--desktop" />
      <div className="wf-booking-stack wf-booking-stack--admin">
        {isLoading ? <EmptyState title="Carregando agendamentos" text="Buscando agendamentos reais do backend." /> : null}
        {isError || !hasAdminToken ? <EmptyState title="Agendamentos não disponíveis" text="Faça login administrativo para carregar os dados reais do backend." /> : null}
        {!isLoading && !isError && bookings.length === 0 ? <EmptyState title="Nenhum agendamento cadastrado" text="Ainda não há agendamentos retornados pela API administrativa." /> : null}
        {bookings.map((booking) => <BookingCard key={booking.id} booking={booking} admin canAssign={owner} onDetails={() => openDetails(booking)} onAssign={() => openAssign(booking)} onEdit={() => openEdit(booking)} />)}
      </div>
    </AppointmentsPageShell>
  );
}

function formatBlockDate(block: AvailabilityBlockResponse): string {
  const source = block.start?.slice(0, 10) || block.end?.slice(0, 10) || '';
  if (!source) return 'Data não informada';
  return ptLongDate.format(toLocalDate(source));
}

function formatBlockTime(block: AvailabilityBlockResponse): string {
  if (block.type?.toLowerCase() === 'day' || !block.start || !block.end) return 'Dia inteiro';
  return `${block.start.slice(11, 16)}–${block.end.slice(11, 16)}`;
}

function AdminBlocksView({ setModal }: { setModal: (modal: ModalKind) => void }) {
  const { blocks, isLoading, isError, hasAdminToken } = useAdminBlocksData();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState('');

  const removeBlock = async (blockId: string) => {
    if (!blockId || deletingId) return;
    setDeletingId(blockId);
    try {
      await deleteAdminBlock(blockId);
      await queryClient.invalidateQueries({ queryKey: ['wireframe-admin-blocks'] });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Não foi possível excluir o bloqueio.');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <section className="wf-admin-section wf-blocks-view">
      <div className="wf-admin-title-row">
        <span className="wf-large-icon"><Icon name="calendar-block" /></span>
        <div><h1>Bloqueios detalhados</h1><p>Visualize e gerencie os dias e horários marcados como indisponíveis na agenda.</p></div>
      </div>
      <div className="wf-blocks-grid">
        <div className="wf-blocks-left">
          <div className="wf-filters-card wf-filters-card--blocks">
            <label>Profissional<input placeholder="Buscar profissional" /></label>
            <label>Data inicial<input type="date" /></label>
            <label>Data final<input type="date" /></label>
            <label>Buscar por profissional ou data<input placeholder="Digite o nome ou a data" /></label>
            <button type="button" onClick={() => notifyUnavailable('Filtro de bloqueios')}><Icon name="filter" /> Filtrar</button>
            <button type="button" className="wf-link-button" onClick={() => setModal('block-admin')}><Icon name="plus" /> Novo bloqueio</button>
          </div>
          <div className="wf-table-card">
            <h2><Icon name="chart" /> Lista de bloqueios</h2>
            <div className="wf-block-table">
              <div className="wf-table-head"><span>Profissional</span><span>Data</span><span>Horários bloqueados</span><span>Observação</span><span>Ações</span></div>
              {blocks.map((block) => (
                <div key={block.blockId} className="wf-table-row">
                  <span><Avatar name="Admin" /> Administrativo</span>
                  <span>{formatBlockDate(block)}</span>
                  <span className="wf-chip-list"><i>{formatBlockTime(block)}</i></span>
                  <span>{block.reason || 'Sem observação'}</span>
                  <span className="wf-row-actions">
                    <button type="button" onClick={() => window.alert(`${formatBlockDate(block)}\n${formatBlockTime(block)}\n${block.reason || 'Sem observação'}`)}><Icon name="eye" /> Ver detalhes</button>
                    <button type="button" onClick={() => setModal('block-admin')}><Icon name="edit" /> Editar</button>
                    <button type="button" className="wf-danger" onClick={() => void removeBlock(block.blockId)} disabled={deletingId === block.blockId}><Icon name="delete" /> {deletingId === block.blockId ? 'Excluindo...' : 'Excluir'}</button>
                  </span>
                </div>
              ))}
            </div>
            {isLoading ? <EmptyState title="Carregando bloqueios" text="Buscando bloqueios reais do backend." /> : null}
            {isError || !hasAdminToken ? <EmptyState title="Bloqueios não disponíveis" text="Faça login administrativo para carregar os bloqueios reais." /> : null}
            {!isLoading && !isError && blocks.length === 0 ? <EmptyState title="Nenhum bloqueio encontrado" text="A API não retornou bloqueios para o período selecionado." action="Adicionar bloqueio" onAction={() => setModal('block-admin')} /> : null}
          </div>
        </div>
        <aside className="wf-blocks-sidebar">
          <MiniMonth blocks={blocks} />
          <div className="wf-side-card">
            <h2>Horários do dia selecionado</h2>
            {blocks.length ? blocks.slice(0, 4).map((block) => <p key={block.blockId}><Icon name="calendar" /> {formatBlockDate(block)} <span className="wf-chip-list"><i>{formatBlockTime(block)}</i></span></p>) : <p className="wf-muted">Nenhum horário bloqueado carregado.</p>}
            <button type="button" className="wf-primary-cta wf-primary-cta--small" onClick={() => setModal('block-admin')}><Icon name="plus" /> Adicionar horário</button>
          </div>
          <div className="wf-info-alert"><Icon name="bell" /> Dias marcados em laranja possuem bloqueios. Pontos azuis indicam bloqueio parcial em horários específicos.</div>
        </aside>
      </div>
    </section>
  );
}

function MiniMonth({ blocks = [] }: { blocks?: AvailabilityBlockResponse[] }) {
  const monthStart = startOfMonth();
  const grid = useMemo(() => getMonthGrid(monthStart), [monthStart]);
  const blockedDates = useMemo(() => new Set(blocks.map((block) => block.start?.slice(0, 10) || block.end?.slice(0, 10)).filter(Boolean)), [blocks]);
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(toLocalDate(monthStart));
  const today = toIsoDate(new Date());
  return (
    <div className="wf-side-card wf-mini-month">
      <h2><Icon name="calendar" /> Calendário mensal</h2>
      <div className="wf-month-nav"><button type="button" onClick={() => notifyUnavailable('Navegação do mês anterior')}>‹</button><strong>{label}</strong><button type="button" onClick={() => notifyUnavailable('Navegação do próximo mês')}>›</button></div>
      <div className="wf-mini-grid">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => <b key={d}>{d}</b>)}
        {grid.map((item) => <span key={item.iso} className={cx(blockedDates.has(item.iso) && 'has-block', item.iso === today && 'is-active', !item.isCurrentMonth && 'is-muted')}>{item.day}</span>)}
      </div>
    </div>
  );
}

function AdminHistoryView() {
  return <HistoryPanel />;
}

function AdminFinanceView({ importedDashboard, onOpenOfx }: { importedDashboard?: FinancialDashboardDTO | null; onOpenOfx: () => void }) {
  return <FinancialStatementPanel importedDashboard={importedDashboard} onOpenOfx={onOpenOfx} />;
}

export function AdminBookingDetails() {
  const navigate = useNavigate();
  const [modal, setModal] = useState<ModalKind>(null);
  const [context, setContext] = useState<ModalContext>({});
  const { eventId } = useParams();
  const { bookings, isLoading, hasAdminToken } = useAdminBookingsData();
  const booking = useMemo(() => bookings.find((item) => item.id === eventId) ?? bookings[0], [bookings, eventId]);
  const owner = isStoredAdminOwner();
  const session = getStoredAdminSession();

  const openBudget = () => {
    setModal('budget-admin');
  };

  const openBookingEmail = () => {
    setContext(booking ? { booking } : {});
    setModal('email-admin');
  };

  const selectAdminView = (nextView: AdminView) => {
    navigate(`/admin/dashboard?view=${nextView === 'agenda' ? 'agendamentos' : nextView}`);
  };

  return (
    <PageShell className="wf-page wf-admin-details-page">
      <AdminNavbar
        active="agendamentos"
        adminName={session?.name}
        owner={owner}
        onAdminClick={() => { clearAdminToken(); navigate('/', { replace: true }); }}
        onBudgetClick={() => { setContext(booking ? { booking } : {}); setModal('budget-admin'); }}
        onCreate={() => setModal('create-client')}
        onEmailClick={() => { setContext(booking ? { booking } : {}); setModal('email-admin'); }}
        onMobileAdminClick={() => { clearAdminToken(); navigate('/', { replace: true }); }}
        onMobileMenu={() => notifyUnavailable('Menu do administrador')}
        onNotificationsClick={() => setModal('notifications')}
        onView={selectAdminView}
      />
      <main className="wf-details-main">
        <div className="wf-admin-title-row">
          <Link to="/admin/dashboard?view=agendamentos" className="wf-back-btn"><Icon name="back" /></Link>
          <div><h1>Detalhes do agendamento</h1><p>{booking ? `Agendamento #${booking.id}` : 'Dados reais do backend'}</p></div>
        </div>
        {!hasAdminToken || (!booking && !isLoading) ? <EmptyState title="Agendamento não encontrado" text="Faça login administrativo ou selecione um agendamento existente." /> : null}
        {booking ? (
          <div className="wf-details-grid">
            <section className="wf-details-cards">
              <DetailInfo icon="calendar" title="Informações do agendamento" items={[["Data", ptLongDate.format(toLocalDate(booking.date))], ['Horário', booking.endTime ? `${booking.time}–${booking.endTime}` : booking.time], ['Status', booking.status], ['Serviço', booking.service]]} />
              <DetailInfo icon="user" title="Dados do cliente" items={[["Nome", booking.name], ['Telefone', formatPhoneForDisplay(booking.phone) || 'Não informado'], ['E-mail', booking.email || 'Não informado']]} />
              <DetailInfo icon="map" title="Endereço do atendimento" items={[[booking.address, booking.city || 'Cidade não informada']]} action="Ver rotas" />
              <DetailInfo icon="chat" title="Observações do cliente" items={[["", booking.service]]} />
              <DetailInfo icon="user" title="Profissional responsável" items={[[booking.provider || 'A definir', 'Sem telefone cadastrado']]} badge="Confirmado" />
              <div className="wf-detail-actions"><button type="button" onClick={() => setModal('edit-admin')}><Icon name="edit" /> Editar</button><button type="button" onClick={openBookingEmail}><Icon name="mail" /> E-mail</button><button type="button" className="wf-danger" onClick={() => notifyUnavailable('Cancelamento')}><Icon name="delete" /> Cancelar</button><button type="button" onClick={() => setModal('edit-admin')}><Icon name="calendar" /> Reagendar</button>{owner ? <button type="button" onClick={() => setModal('assign-provider')}><Icon name="user" /> Trocar responsável</button> : null}<button type="button" onClick={openBudget}><Icon name="budget" /> Orçamento</button></div>
            </section>
            <section className="wf-map-card">
              <button type="button" className="wf-map-btn wf-map-btn--left" onClick={() => notifyUnavailable('Google Maps')}>Abrir no Google Maps</button>
              <button type="button" className="wf-map-btn wf-map-btn--right" onClick={() => notifyUnavailable('Mapa expandido')}>Expandir mapa</button>
              <div className="wf-route-line" />
              <span className="wf-map-pin wf-map-pin--origin" />
              <span className="wf-map-pin wf-map-pin--dest" />
              <div className="wf-map-label wf-map-label--origin"><strong>Origem</strong><br />Base administrativa</div>
              <div className="wf-map-label wf-map-label--dest"><strong>Local do atendimento</strong><br />{booking.address}</div>
              <span className="wf-map-text wf-map-text--one">ROTA</span><span className="wf-map-text wf-map-text--two">ATENDIMENTO</span><span className="wf-map-text wf-map-text--three">DESTINO</span>
            </section>
          </div>
        ) : null}
      </main>
      <CalendarMateModal modal={modal} context={modal === 'email-admin' ? context : booking ? { booking } : {}} onClose={() => setModal(null)} />
    </PageShell>
  );
}

function DetailInfo({ icon, title, items, action, badge }: { icon: string; title: string; items: Array<[string, string]>; action?: string; badge?: string }) {
  return (
    <article className="wf-detail-card">
      <span className="wf-detail-icon"><Icon name={icon} /></span>
      <div className="wf-detail-body">
        <h2>{title}</h2>
        <div className="wf-detail-items">
          {items.map(([label, value]) => <span key={`${label}-${value}`}><small>{label}</small><strong>{value}</strong></span>)}
        </div>
      </div>
      {action ? <button type="button" onClick={() => notifyUnavailable(action)}>{action}</button> : null}
      {badge ? <Badge color="green">{badge}</Badge> : null}
    </article>
  );
}

function Avatar({ name, large = false, huge = false }: { name: string; large?: boolean; huge?: boolean }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SG';
  return <span className={cx('wf-avatar', large && 'wf-avatar--large', huge && 'wf-avatar--huge')}>{initials}</span>;
}

function CalendarMateModal({
  modal,
  context = {},
  onClose,
  onOfxImported,
}: {
  modal: ModalKind;
  context?: ModalContext;
  onClose: () => void;
  onOfxImported?: (dashboard: FinancialDashboardDTO) => void;
}) {
  const closeModal = useModalBrowserBack(Boolean(modal), `root-${modal ?? 'none'}`, onClose);
  if (!modal) return null;
  const modalClass = cx(
    'wf-modal',
    modal === 'create-client' && 'wf-modal--create',
    modal === 'confirm-phone' && 'wf-modal--confirm',
    modal === 'client-profile' && 'wf-modal--profile',
    modal === 'client-details' && 'wf-modal--details',
    modal === 'contact' && 'wf-modal--contact',
    modal === 'services-info' && 'wf-modal--services-info',
    modal === 'help-contact' && 'wf-modal--help-contact',
    modal === 'notifications' && 'wf-modal--notifications',
    modal === 'block-admin' && 'wf-modal--admin-block',
    modal === 'assign-provider' && 'wf-modal--assign',
    modal === 'edit-admin' && 'wf-modal--create',
    modal === 'email-admin' && 'wf-modal--email',
    modal === 'ofx-admin' && 'wf-modal--ofx',
    modal === 'budget-admin' && 'wf-modal--budget',
  );

  return (
    <ModalShell open={Boolean(modal)} dataModal={modal} className={modalClass} onClose={closeModal} closeIcon={<Icon name="close" />}>
        {modal === 'create-client' ? <CreateBookingModal initialDate={context.createDate} onClose={closeModal} /> : null}
        {modal === 'confirm-phone' ? <ConfirmPhoneModal onClose={closeModal} /> : null}
        {modal === 'client-profile' ? <ClientProfileModal onClose={closeModal} /> : null}
        {modal === 'client-details' ? <ClientDetailsModal booking={context.booking} onClose={closeModal} /> : null}
        {modal === 'contact' ? <ContactModal onClose={closeModal} /> : null}
        {modal === 'services-info' ? <ServicesInfoModal /> : null}
        {modal === 'help-contact' ? <HelpContactModal /> : null}
        {modal === 'notifications' ? <NotificationsModal onClose={closeModal} /> : null}
        {modal === 'block-admin' ? <AdminBlockModal onClose={closeModal} /> : null}
        {modal === 'assign-provider' ? <AssignProviderModal booking={context.booking} onClose={closeModal} /> : null}
        {modal === 'edit-admin' ? <EditAdminBookingModal booking={context.booking} onClose={closeModal} /> : null}
        {modal === 'email-admin' ? <EmailAdminModal booking={context.booking} onClose={closeModal} /> : null}
        {modal === 'ofx-admin' ? <OfxModal onClose={closeModal} onImported={onOfxImported} /> : null}
        {modal === 'budget-admin' ? <BudgetModal booking={context.booking} onClose={closeModal} /> : null}
    </ModalShell>
  );
}

function ModalTitle({ icon, title, text, compact = false }: { icon: string; title: string; text: string; compact?: boolean }) {
  return (
    <PageTitle
      className={cx('wf-modal-title', `wf-modal-title--${icon.replace(/[^a-zA-Z0-9-]/g, '-')}`, compact && 'wf-modal-title--compact')}
      compact={compact}
      icon={<Icon name={icon} />}
      title={title}
      description={text}
    />
  );
}

function ModalField({
  label,
  icon,
  placeholder = '',
  className,
  required = false,
  defaultValue,
  value,
  type = 'text',
  inputMode,
  error,
  onChange,
}: {
  label: string;
  icon: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  defaultValue?: string;
  value?: string;
  type?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  error?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className={cx('wf-modal-field', className)}>
      <span className="wf-field-label">{label}{required ? <em>*</em> : null}</span>
      <span className="wf-input-shell">
        <Icon name={icon} />
        <input type={type} inputMode={inputMode} value={value} defaultValue={value === undefined ? defaultValue : undefined} placeholder={placeholder} onChange={(event) => onChange?.(event.target.value)} />
      </span>
      {error ? <small className="wf-field-error">{error}</small> : null}
    </label>
  );
}

function cityIconName(city: string): string {
  const normalized = normalizeText(city);
  if (normalized.includes('belo horizonte')) return 'city-belo-horizonte';
  if (normalized.includes('ouro preto')) return 'city-ouro-preto';
  if (normalized.includes('moeda')) return 'city-moeda';
  if (normalized.includes('nova lima')) return 'city-nova-lima';
  return 'city-itabirito';
}

function CitySelectField({
  selectedCity,
  cities,
  open,
  onOpenChange,
  onSelect,
}: {
  selectedCity: string;
  cities: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (city: string) => void;
}) {
  const selectedStyle = resolveSupportedCityStyle(selectedCity, 0);
  const closeCityPicker = useCallback(() => onOpenChange(false), [onOpenChange]);
  return (
    <div className="wf-modal-field wf-city-select-field wf-create-city-field">
      <span className="wf-field-label">Cidade<em>*</em></span>
      <button type="button" className={cx('wf-city-select-launcher', `wf-city-select-launcher--${selectedStyle.color}`)} onMouseDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onOpenChange(true); }}>
        <Icon name={cityIconName(selectedCity)} />
        <span>{selectedCity}</span>
      </button>
      {open ? (
        <div className="wf-city-submodal-backdrop" onMouseDown={(event) => { event.stopPropagation(); closeCityPicker(); }}>
          <div className="wf-city-submodal" role="dialog" aria-modal="true" aria-labelledby="wf-city-submodal-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="wf-city-submodal__header">
              <strong id="wf-city-submodal-title">Selecione sua cidade</strong>
              <button type="button" onClick={closeCityPicker} aria-label="Fechar cidades">x</button>
            </div>
            <div className="wf-city-submodal__grid">
              {cities.map((city, index) => {
                const style = resolveSupportedCityStyle(city, index);
                return (
                  <button
                    key={city}
                    type="button"
                    className={cx('wf-city-submodal__button', `wf-city-submodal__button--${style.color}`, selectedCity === city && 'is-active')}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(city);
                      closeCityPicker();
                    }}
                  >
                    <Icon name={cityIconName(city)} />
                    <span>{city}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const modalTimeOptions = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

type CreateBookingField =
  | 'fullName'
  | 'phone'
  | 'email'
  | 'city'
  | 'address'
  | 'number'
  | 'date'
  | 'time'
  | 'notes';

type CreateBookingErrors = Partial<Record<CreateBookingField, string>>;

function CreateBookingModal({ initialDate = '', onClose }: { initialDate?: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: bootstrap } = usePublicBootstrap(true);
  const allowedCities = useMemo(() => getAllowedCities(bootstrap), [bootstrap]);
  const defaultCity = useMemo(() => getDefaultCity(bootstrap), [bootstrap]);
  const defaultState = useMemo(() => getDefaultState(bootstrap), [bootstrap]);
  const slotMinutes = getSlotMinutes(bootstrap);
  const maxFutureMonthsAhead = getMaxFutureMonthsAhead(bootstrap);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState(defaultCity);
  const [addressInput, setAddressInput] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);
  const [houseNumber, setHouseNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [referencePoint, setReferencePoint] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedEndTime, setSelectedEndTime] = useState('');
  const [monthStart] = useState(() => startOfMonth());
  const [fieldErrors, setFieldErrors] = useState<CreateBookingErrors>({});
  const [backendError, setBackendError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const selectedCity = allowedCities.includes(city) ? city : defaultCity;
  const bookingDurationMinutes = getBookingDurationMinutesByCity(bootstrap, selectedCity);
  const createBookingMutation = useCreateBooking();
  const storedProfile = useMemo(() => getStoredClientProfile(), []);
  const profileHasReusableData = Boolean(storedProfile?.name || storedProfile?.phone || storedProfile?.email);
  const monthAvailability = useAvailableMonthDates(monthStart, true, selectedCity, slotMinutes, bookingDurationMinutes, maxFutureMonthsAhead);
  const availableDateOptions = useMemo(
    () => monthAvailability.availableDates.map((date) => ({ value: date, label: formatDateOptionLabel(date) })),
    [monthAvailability.availableDates],
  );
  const activeSelectedDate = selectedDate && monthAvailability.availableDates.includes(selectedDate)
    ? selectedDate
    : '';
  const { data: availableSlots = [], isFetching: isLoadingSlots, error: slotsError } = useAvailableSlots(
    activeSelectedDate,
    selectedCity,
    slotMinutes,
    bookingDurationMinutes,
    Boolean(activeSelectedDate),
  );
  const needsManualHouseNumber = shouldShowManualHouseNumber(selectedAddress);

  useEffect(() => {
    if (defaultCity && !city) setCity(defaultCity);
  }, [city, defaultCity]);

  useEffect(() => {
    const stillAvailable = availableSlots.some((slot) => slot.startTime === selectedTime);
    if (!stillAvailable) {
      setSelectedTime('');
      setSelectedEndTime('');
    }
  }, [availableSlots, selectedTime]);

  const handleUseProfileData = () => {
    if (!storedProfile) return;
    if (storedProfile.name) setFullName(storedProfile.name);
    if (storedProfile.phone) setPhone(formatPhoneInput(storedProfile.phone));
    if (storedProfile.email) setEmail(storedProfile.email);
    setFieldErrors((current) => ({ ...current, fullName: undefined, phone: undefined, email: undefined }));
    setBackendError('');
  };

  const handleCityChange = (value: string) => {
    setCity(value);
    setAddressInput('');
    setSelectedAddress(null);
    setHouseNumber('');
    setSelectedDate('');
    setSelectedTime('');
    setSelectedEndTime('');
    setFieldErrors({});
    setBackendError('');
  };

  const handleAddressChange = (value: string) => {
    setAddressInput(value);
    setSelectedAddress(null);
    setHouseNumber('');
    setFieldErrors((current) => ({ ...current, address: undefined, number: undefined }));
    setBackendError('');
  };

  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    const houseNumberFromSuggestion = getSuggestionHouseNumber(suggestion);
    setSelectedAddress(suggestion);
    setAddressInput(buildSuggestionInputValue(suggestion));
    setHouseNumber(houseNumberFromSuggestion);
    setComplement('');
    setFieldErrors((current) => ({ ...current, address: undefined, number: undefined }));
    setBackendError('');
  };

  const handleCreateBooking = async () => {
    const { firstName, lastName } = splitFullName(fullName);
    const phoneDigits = digitsOnly(phone);
    const cepDigits = digitsOnly(selectedAddress?.postcode ?? '');
    const houseNumberFromSuggestion = getSuggestionHouseNumber(selectedAddress);
    const effectiveHouseNumber = houseNumberFromSuggestion || houseNumber;
    const nextErrors: CreateBookingErrors = {};

    if (!firstName || !lastName || firstName === lastName) {
      nextErrors.fullName = 'Nome completo: informe nome e sobrenome. Exemplo: Pedro Silva.';
    }
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      nextErrors.phone = 'Telefone: informe DDD + numero com 10 ou 11 digitos. Exemplos: (31) 99999-9999 ou 31 3333-4444.';
    }
    if (!isEmailValid(email)) {
      nextErrors.email = 'E-mail: use @ e dominio valido. Exemplo: voce@email.com.';
    }
    if (!selectedCity) {
      nextErrors.city = 'Cidade: escolha uma das cidades atendidas.';
    }
    if (!selectedAddress || cepDigits.length !== 8) {
      nextErrors.address = 'Endereco: escolha uma sugestao da lista para validar rua, bairro e CEP. Exemplo: Rua Sao Jose, Centro.';
    }
    if (!isHouseNumberValid(effectiveHouseNumber)) {
      nextErrors.number = 'Numero: informe 123, 123A, Casa 2, Lote 5 ou S/N.';
    }
    if (!activeSelectedDate) {
      nextErrors.date = 'Data: selecione um dia disponivel carregado pelo backend.';
    }
    if (!selectedTime) {
      nextErrors.time = 'Horario: selecione um horario disponivel para a data escolhida.';
    }
    if (!isServiceNotesValid(notes)) {
      nextErrors.notes = 'Observacao: explique o que precisa de servico com pelo menos 10 caracteres. Exemplo: trocar tomada da sala.';
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    if (!selectedAddress) return;

    setBackendError('');
    setSuccessMessage('');

    try {
      const response = await createBookingMutation.mutateAsync({
        serviceType: 'Visita técnica',
        serviceNotes: cleanFormText(notes).replace(/\s+/g, ' '),
        date: activeSelectedDate,
        time: selectedTime,
        clientFirstName: firstName,
        clientLastName: lastName,
        clientEmail: cleanFormText(email),
        clientPhone: phoneDigits,
        clientCep: cepDigits.slice(0, 8),
        clientStreet: cleanFormText(buildSuggestionStreetLine(selectedAddress)),
        clientNeighborhood: cleanFormText(selectedAddress.neighborhood || selectedAddress.addressLine2 || selectedCity),
        clientNumber: normalizeHouseNumber(effectiveHouseNumber),
        clientComplement: cleanFormText([complement, referencePoint].filter(Boolean).join(' | ')) || undefined,
        clientCity: selectedCity,
        clientState: cleanFormText(selectedAddress.stateCode || selectedAddress.state || defaultState).slice(0, 2).toUpperCase(),
        clientLatitude: selectedAddress.lat ?? selectedAddress.latitude,
        clientLongitude: selectedAddress.lon ?? selectedAddress.longitude,
      });

      saveClientProfile({
        name: cleanFormText(fullName),
        phone: phoneDigits,
        email: cleanFormText(email),
      });
      saveManageToken(response.manageToken, response.servico.eventId);
      saveLocalCalendarEvent(mapCreatedServicoToCalendarEvent(response.servico));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-bookings'] }),
      ]);
      setSuccessMessage('Agendamento criado. Confirme seu telefone para acompanhar o atendimento.');
      window.setTimeout(onClose, 700);
    } catch (error) {
      setBackendError((error as Error).message || 'Nao foi possivel criar o agendamento.');
    }
  };

  return (
    <>
      <ModalTitle icon="calendar-modal-blue" title="Criar agendamento" text="Preencha seus dados e informe onde e quando o serviço será realizado." />
      <div className="wf-profile-prefill-row">
        <span><Icon name="user" /> {profileHasReusableData ? 'Dados de perfil disponíveis' : 'Nenhum dado de perfil salvo'}</span>
        <button type="button" onClick={handleUseProfileData} disabled={!profileHasReusableData}>Usar dados do perfil</button>
      </div>
      <div className="wf-create-booking-form wf-create-booking-form--wireframe">
        <ModalField className="wf-create-field wf-create-field--name" label="Nome completo" icon="user" placeholder="Digite seu nome completo" required value={fullName} onChange={setFullName} error={fieldErrors.fullName} />
        <ModalField className="wf-create-field wf-create-field--phone" label="Telefone" icon="phone" placeholder="(11) 99999-9999" required value={phone} inputMode="tel" onChange={(value) => setPhone(formatPhoneInput(value))} error={fieldErrors.phone} />
        <ModalField className="wf-create-field wf-create-field--email" label="E-mail" icon="mail" placeholder="seu@email.com" required value={email} type="email" onChange={setEmail} error={fieldErrors.email} />
        <CitySelectField selectedCity={selectedCity} cities={allowedCities} open={cityPickerOpen} onOpenChange={setCityPickerOpen} onSelect={handleCityChange} />
        {fieldErrors.city ? <small className="wf-field-error wf-span-2">{fieldErrors.city}</small> : null}
        <div className={cx('wf-create-address-row wf-span-2', needsManualHouseNumber && 'wf-create-address-row--with-number')}>
          <label className="wf-modal-field wf-create-address-field">
            <span className="wf-field-label">Endereço<em>*</em></span>
            <span className="wf-input-shell wf-input-shell--address">
              <Icon name="map" />
              <AddressAutocompleteField value={addressInput} selectedCity={selectedCity} selectedState={defaultState} onChange={handleAddressChange} onSelectSuggestion={handleAddressSelect} />
              <button type="button" className="wf-address-search-button" onMouseDown={(event) => event.preventDefault()}>Buscar endereço</button>
            </span>
            {fieldErrors.address ? <small className="wf-field-error">{fieldErrors.address}</small> : null}
          </label>
          {needsManualHouseNumber ? (
            <ModalField className="wf-create-number-field" label="Número" icon="home" placeholder="123 ou S/N" required value={houseNumber} inputMode="text" onChange={setHouseNumber} error={fieldErrors.number} />
          ) : null}
        </div>
        <ModalField className="wf-span-2 wf-create-field--complement" label="Complemento (opcional)" icon="edit" placeholder="Ex.: Apto 101, Bloco B, Fundos" value={complement} onChange={setComplement} />
        <div className="wf-span-2 wf-choice-block">
          <strong>Escolha a data<em>*</em></strong>
          {monthAvailability.isLoading ? <small className="wf-choice-helper">Carregando dias disponíveis...</small> : null}
          {!monthAvailability.isLoading && availableDateOptions.length === 0 ? <small className="wf-choice-helper">Nenhum dia com horário disponível neste mês.</small> : null}
          <div className="wf-date-options wf-date-options--scroll">{availableDateOptions.map((date) => <button className={activeSelectedDate === date.value ? 'is-active' : ''} type="button" key={date.value} onClick={() => { setSelectedDate(date.value); setSelectedTime(''); setSelectedEndTime(''); }}>{date.label}</button>)}<button type="button" className="wf-date-next-button" aria-label="Mais datas"><Icon name="arrow-right" /></button></div>
          {fieldErrors.date ? <small className="wf-field-error">{fieldErrors.date}</small> : null}
        </div>
        <div className="wf-span-2 wf-choice-block">
          <strong>Horários disponíveis<em>*</em></strong>
          {isLoadingSlots ? <small className="wf-choice-helper">Carregando horários...</small> : null}
          {slotsError ? <small className="wf-choice-helper wf-choice-helper--error">Não foi possível carregar os horários.</small> : null}
          {!isLoadingSlots && !slotsError && activeSelectedDate && availableSlots.length === 0 ? <small className="wf-choice-helper">Esse dia não possui horários livres.</small> : null}
          <div className="wf-time-options wf-time-options--scroll">{availableSlots.map((slot) => <button className={selectedTime === slot.startTime ? 'is-active' : ''} type="button" key={`${slot.date}-${slot.startTime}`} onClick={() => { setSelectedTime(slot.startTime); setSelectedEndTime(slot.endTime); }}>{slot.startTime}</button>)}</div>
          {fieldErrors.time ? <small className="wf-field-error">{fieldErrors.time}</small> : null}
        </div>
        <ModalField className="wf-create-field wf-create-field--reference" label="Ponto de referência (opcional)" icon="map" placeholder="Ex.: Próximo ao mercado, padaria, etc." value={referencePoint} onChange={setReferencePoint} />
        <label className="wf-modal-field wf-create-field wf-create-field--notes">
          <span className="wf-field-label">Observações<em>*</em></span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            minLength={10}
            placeholder="Explique detalhadamente o que precisa de serviço. Exemplo: trocar tomada da sala que parou de funcionar."
          />
          {fieldErrors.notes ? <small className="wf-field-error">{fieldErrors.notes}</small> : null}
        </label>
      </div>
      {selectedTime ? <p className="wf-create-selected-slot">Horário selecionado: <strong>{selectedTime}{selectedEndTime ? ` - ${selectedEndTime}` : ''}</strong></p> : null}
      {successMessage ? <p className="wf-auth-feedback wf-auth-feedback--success">{successMessage}</p> : null}
      {backendError ? <p className="wf-auth-feedback wf-auth-feedback--error">{backendError}</p> : null}
      <ModalActions primary={createBookingMutation.isPending ? 'Agendando...' : 'Confirmar agendamento'} secondary="Cancelar" primaryIcon="arrow-right" onSecondary={onClose} onPrimary={handleCreateBooking} disabledPrimary={createBookingMutation.isPending} />
    </>
  );
}

type GeneralAuthFlow = {
  role: UserRole;
  verificationId: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
};

function mapGeneralAuthError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 400) return 'Informe um telefone válido.';
    if (error.status === 401 || error.status === 403) return 'Código inválido ou expirado.';
    return error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function isAdminUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403 || error.status === 404);
}

function ConfirmPhoneModal({ onClose }: { onClose: () => void }) {
  const stored = getStoredPhoneVerification();
  const storedProfile = getStoredClientProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState(storedProfile?.name ?? '');
  const [phone, setPhone] = useState(stored ? formatPhoneForDisplay(stored.phone) : storedProfile?.phone ? formatPhoneForDisplay(storedProfile.phone) : '');
  const [code, setCode] = useState('');
  const [flow, setFlow] = useState<GeneralAuthFlow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const normalizedPhone = normalizePhone(phone);
  const canSendCode = isValidPhone(phone) && !loading;
  const canConfirm = Boolean(flow?.verificationId) && code.length === 3 && !loading;

  const setCodeDigit = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length > 1) {
      setCode(digits.slice(0, 3));
      return;
    }
    const digit = digits.slice(-1);
    setCode((current) => {
      const next = current.padEnd(3, ' ').split('');
      next[index] = digit || ' ';
      return next.join('').replace(/\s/g, '').slice(0, 3);
    });
  };

  const startClientAuth = async (targetPhone: string): Promise<GeneralAuthFlow> => {
    const response = await startRecovery(targetPhone);
    return {
      role: 'client',
      verificationId: response.verificationId,
      expiresInSeconds: response.expiresInSeconds,
      resendAfterSeconds: response.resendAfterSeconds,
    };
  };

  const startAdminAuth = async (targetPhone: string): Promise<GeneralAuthFlow> => {
    const response = await startAdminLogin(targetPhone);
    return {
      role: 'admin',
      verificationId: response.verificationId,
      expiresInSeconds: response.expiresInSeconds,
      resendAfterSeconds: response.resendAfterSeconds,
    };
  };

  const handleSendCode = async () => {
    if (!isValidPhone(phone) || loading) {
      setError('Informe um telefone válido.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    setCode('');

    try {
      const preferredRole = resolveUserRoleByPhone(normalizedPhone);
      let nextFlow: GeneralAuthFlow;

      if (preferredRole === 'admin') {
        nextFlow = await startAdminAuth(normalizedPhone);
      } else {
        try {
          nextFlow = await startAdminAuth(normalizedPhone);
        } catch (adminError) {
          if (!isAdminUnauthorized(adminError)) throw adminError;
          nextFlow = await startClientAuth(normalizedPhone);
        }
      }

      setFlow(nextFlow);
      setMessage(nextFlow.role === 'admin' ? 'Código enviado para acesso administrativo.' : 'Código enviado para confirmar seus agendamentos.');
    } catch (authError) {
      setFlow(null);
      setError(mapGeneralAuthError(authError, 'Não foi possível enviar o código agora.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!flow?.verificationId || loading) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = flow.role === 'admin'
        ? await resendAdminLogin(flow.verificationId)
        : await resendRecovery(flow.verificationId);
      setFlow({
        role: flow.role,
        verificationId: response.verificationId,
        expiresInSeconds: response.expiresInSeconds,
        resendAfterSeconds: response.resendAfterSeconds,
      });
      setCode('');
      setMessage('Novo código enviado.');
    } catch (authError) {
      setError(mapGeneralAuthError(authError, 'Não foi possível reenviar o código.'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!flow?.verificationId || code.length < 3 || loading) return;
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (flow.role === 'admin') {
        await confirmAdminLogin(flow.verificationId, code);
        await queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
        onClose();
        navigate('/admin/dashboard', { replace: false });
        return;
      }

      const response = await confirmRecovery(flow.verificationId, code);
      if (!response.verified) {
        setError('Código inválido ou expirado.');
        return;
      }
      const recoveredProfileSource = response.servicos.find((servico) => servico.clientEmail || servico.clientFirstName || servico.clientLastName);
      const recoveredName = cleanFormText([recoveredProfileSource?.clientFirstName, recoveredProfileSource?.clientLastName].filter(Boolean).join(' '));
      const recoveredEmail = cleanFormText(recoveredProfileSource?.clientEmail ?? '');
      saveRecoveredBookings(response.servicos);
      savePhoneVerification(normalizedPhone, response.servicos.length, {
        name: cleanFormText(name) || recoveredName || storedProfile?.name,
        email: recoveredEmail || storedProfile?.email,
      });
      await queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      setMessage('Telefone confirmado com sucesso.');
      onClose();
      navigate('/meus-agendamentos', { replace: false });
    } catch (authError) {
      setError(mapGeneralAuthError(authError, 'Não foi possível confirmar o código.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wf-confirm-page">
      <header className="wf-confirm-page__brand">
        <LogoMark compact />
      </header>
      <div className="wf-confirm-page__hero">
        <Icon name="confirm-phone-security" />
        <div className="wf-confirm-page__benefits" aria-hidden="true">
          <article className="wf-confirm-page__benefit wf-confirm-page__benefit--safe">
            <span><Icon name="shield" /></span>
            <div>
              <strong>Seguro e confiável</strong>
              <small>Seus dados ficam protegidos do início ao fim.</small>
            </div>
          </article>
          <article className="wf-confirm-page__benefit wf-confirm-page__benefit--sms">
            <span><Icon name="chat" /></span>
            <div>
              <strong>Verificação por SMS</strong>
              <small>Enviaremos um código para confirmar seu número.</small>
            </div>
          </article>
        </div>
      </div>
      <section className="wf-confirm-page__card">
        <div className="wf-confirm-page__badge"><Icon name="lock" /></div>
        <div className="wf-confirm-page__header">
          <h1>Confirmar número</h1>
          <p>Confirme seu número de telefone para validar seu perfil e permitir agendamentos.</p>
        </div>
        <div className="wf-confirm-page__form">
          <ModalField className="wf-full-label" label="Nome completo" icon="user-blue-solid" value={name} onChange={setName} placeholder="Digite seu nome completo" />
          <ModalField className="wf-full-label" label="Telefone" icon="phone-blue-outline" value={phone} onChange={(value) => { setPhone(value); setFlow(null); setCode(''); }} placeholder="(11) 99999-9999" inputMode="tel" />
          <div className="wf-confirm-code-panel">
            <strong className="wf-confirm-code-panel__label">Código de verificação</strong>
            <div className="wf-confirm-code-panel__content">
              <div className="wf-confirm-code-fields">
                {[0, 1, 2].map((index) => (
                  <input
                    key={index}
                    value={code[index] ?? ''}
                    onChange={(event) => setCodeDigit(index, event.target.value)}
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    placeholder="—"
                    disabled={!flow}
                  />
                ))}
              </div>
              <button type="button" className="wf-confirm-send-code" onClick={flow ? handleResendCode : handleSendCode} disabled={flow ? loading : !canSendCode}>
                <Icon name="send-outline" />
                <span>
                  <strong>{flow ? 'Reenviar código' : 'Enviar código'}</strong>
                  <small>Enviaremos um código por SMS para o número informado.</small>
                </span>
              </button>
            </div>
          </div>
          <p className="wf-confirm-code-note"><Icon name="info-circle" /> Enviaremos um código por SMS para o número informado.</p>
          {flow ? <p className={cx('wf-auth-role-note', flow.role === 'admin' && 'wf-auth-role-note--admin')}>{flow.role === 'admin' ? 'Acesso administrativo detectado.' : 'Acesso de cliente detectado.'}</p> : null}
          {message ? <p className="wf-auth-feedback wf-auth-feedback--success">{message}</p> : null}
          {error ? <p className="wf-auth-feedback wf-auth-feedback--error">{error}</p> : null}
          <div className="wf-confirm-page__actions">
            <button type="button" className="wf-confirm-page__primary" onClick={handleConfirm} disabled={!canConfirm}>
              <Icon name="lock" />
              <span>{loading ? 'Validando...' : flow?.role === 'admin' ? 'Entrar como admin' : 'Confirmar número'}</span>
            </button>
            <button type="button" className="wf-confirm-page__secondary" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function ClientProfileModal({ onClose }: { onClose: () => void }) {
  const verification = getStoredPhoneVerification();
  const profile = getStoredClientProfile();
  const name = profile?.name || 'Nome não informado';
  const phone = profile?.phone || verification?.phone || '';
  const email = profile?.email || '';

  return (
    <>
      <ModalTitle icon="user" title="Perfil" text="Dados salvos para agilizar seus próximos agendamentos." />
      <section className="wf-client-profile-modal">
        <div className="wf-client-profile-modal__hero">
          <Avatar name={name} large />
          <div>
            <strong>{name}</strong>
            <small>{verification ? 'Telefone confirmado' : 'Telefone ainda não confirmado'}</small>
          </div>
        </div>
        <dl className="wf-client-profile-modal__details">
          <div>
            <dt><Icon name="user" /> Nome</dt>
            <dd>{name}</dd>
          </div>
          <div>
            <dt><Icon name="phone" /> Telefone</dt>
            <dd>{phone ? formatPhoneForDisplay(phone) : 'Telefone não informado'}</dd>
          </div>
          <div>
            <dt><Icon name="mail" /> E-mail</dt>
            <dd>{email || 'E-mail ainda não salvo'}</dd>
          </div>
        </dl>
        {!email ? (
          <p className="wf-client-profile-modal__hint"><Icon name="mail" /> O e-mail será salvo automaticamente quando você criar um agendamento.</p>
        ) : null}
      </section>
      <ModalActions primary="Fechar" primaryIcon="check" onPrimary={onClose} />
    </>
  );
}

function ClientDetailsModal({ booking, onClose }: { booking?: BookingItem; onClose: () => void }) {
  const detailsNote = booking?.notes || 'Sem observações informadas.';
  const providerName = booking?.provider || 'A definir';
  const providerPhone = booking?.source && 'assignedProviderPhone' in booking.source ? booking.source.assignedProviderPhone : undefined;
  const providerService = booking?.service || 'Serviço não informado';

  return (
    <>
      <ModalTitle icon="calendar-blue" title="Detalhes do agendamento" text="Confira as informações do seu agendamento." />
      {booking ? (
        <section className="wf-client-details-modal wf-client-details-modal--wireframe">
          <article className="wf-modal-section-card wf-modal-section-card--wireframe">
            <div className="wf-modal-section-card__heading">
              <span className="wf-modal-section-card__badge"><Icon name="calendar-modal-blue" /></span>
              <div>
                <strong>Seu agendamento</strong>
              </div>
              <button type="button" onClick={() => notifyUnavailable('Edição do agendamento')}><Icon name="edit" /> Editar</button>
            </div>
            <dl className="wf-booking-detail-list">
              <div>
                <dt><Icon name="calendar" /> Data e horário</dt>
                <dd>{ptDate.format(toLocalDate(booking.date))} às {booking.time}</dd>
              </div>
              <div>
                <dt><Icon name="map" /> Cidade</dt>
                <dd>{booking.city || 'Não informada'}</dd>
              </div>
              <div>
                <dt><Icon name="map" /> Endereço completo</dt>
                <dd>{booking.address}</dd>
              </div>
              <div>
                <dt><Icon name="chat" /> Observações do cliente</dt>
                <dd>{detailsNote}</dd>
              </div>
            </dl>
          </article>
          <article className="wf-provider-detail-card wf-provider-detail-card--wireframe">
            <Avatar name={providerName} large />
            <div className="wf-provider-detail-card__body">
              <div className="wf-provider-detail-card__top">
                <div>
                  <strong>Prestador</strong>
                  <p>{providerName}</p>
                </div>
                <Badge color="green">{booking.status}</Badge>
              </div>
              <div className="wf-provider-meta">
                <span>{providerService}</span>
                <span>{providerPhone ? formatPhoneForDisplay(providerPhone) : 'Telefone do prestador não informado'}</span>
                <span>Atendimento via WhatsApp</span>
              </div>
            </div>
          </article>
          <div className="wf-safe-line wf-safe-line--wireframe">
            <Icon name="shield-check" />
            <div>
              <strong>Telefone validado para este perfil</strong>
              <small>Contato verificado para sua segurança.</small>
            </div>
            <Icon name="shield-check" />
          </div>
        </section>
      ) : <EmptyState title="Nenhum agendamento selecionado" text="Abra o modal pelos detalhes de um agendamento real." />}
      <div className="wf-client-details-actions">
        <button type="button" className="wf-client-details-actions__whatsapp" onClick={() => openWhatsApp(providerPhone || booking?.phone)}><Icon name="whatsapp" /> Falar no WhatsApp</button>
        <button type="button" className="wf-client-details-actions__close" onClick={onClose}>Fechar</button>
      </div>
    </>
  );
}

function ContactOption({ icon, title, text, color, onClick }: { icon: string; title: string; text: string; color: Accent; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={cx('wf-contact-option', `wf-contact-option--${color}`)}><Icon name={icon} /><span><strong>{title}</strong><small>{text}</small></span><b>›</b></button>;
}

function ContactModal({ onClose }: { onClose: () => void }) {
  void onClose;
  return (
    <>
      <ModalTitle icon="chat-bubbles" title="Fale conosco" text="Escolha o canal de atendimento." />
      <div className="wf-contact-options wf-contact-options--wireframe">
        <ContactOption icon="contact-whatsapp" title="WhatsApp" text={`Atendimento pelo número ${supportPhoneDisplay}.`} color="green" onClick={openSupportWhatsApp} />
        <ContactOption icon="contact-instagram" title="Instagram" text="Acompanhe e envie mensagem pelo perfil oficial." color="purple" onClick={() => openExternal(supportInstagramUrl)} />
        <ContactOption icon="contact-phone" title="Telefone" text={`Ligue para ${supportPhoneDisplay}.`} color="blue" onClick={openSupportPhone} />
        <ContactOption icon="contact-email" title="E-mail" text={supportEmail} color="orange" onClick={openSupportEmail} />
      </div>
      
    </>
  );
}

const serviceCategories = [
  { title: 'Elétrica básica', items: ['troca de tomadas e interruptores', 'instalação de luminárias', 'chuveiros', 'disjuntores simples'] },
  { title: 'Hidráulica', items: ['torneiras', 'sifões', 'vazamentos simples', 'descargas', 'registros', 'caixas acopladas'] },
  { title: 'Montagem e instalação', items: ['móveis', 'prateleiras', 'suportes de TV', 'varões', 'nichos', 'quadros e espelhos'] },
  { title: 'Serviços de pedreiro', items: ['rebocos e correções pontuais', 'assentamento e troca de pisos', 'ajustes em alvenaria', 'pequenos reparos estruturais'] },
  { title: 'Serviços de pintor', items: ['pintura interna e externa', 'retoques em paredes e tetos', 'preparação de superfícies', 'acabamentos e textura simples'] },
  { title: 'Filmagem com drone', items: ['captação aérea de imóveis', 'registros para obras e terrenos', 'conteúdo promocional', 'imagens para inspeção visual'] },
  { title: 'Desenvolvimento de sistemas e aplicações web', items: ['sites institucionais', 'landing pages', 'sistemas sob medida', 'manutenção e melhorias em aplicações web'] },
  { title: 'Visita técnica', items: ['avaliação do problema', 'orçamento', 'orientação sobre materiais e execução'] },
];

function ServicesInfoModal() {
  return (
    <>
      <section className="wf-services-info wf-services-info--plain">
        <header className="wf-services-info__header">
          <div className="wf-services-info__logo"><LogoMark /></div>
          <div className="wf-services-info__title-block">
            <h2>Sobre os serviços</h2>
          </div>
        </header>
        <div className="wf-services-info__grid">
          {serviceCategories.map((category) => (
            <article key={category.title}>
              <strong>{category.title}</strong>
              <ul>
                {category.items.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function HelpContactModal() {
  return (
    <>
      <ModalTitle icon="contact-phone" title="Precisa de ajuda?" text="Fale com a SG Pequenos Reparos pelo WhatsApp ou telefone." />
      <div className="wf-contact-options wf-contact-options--wireframe wf-help-contact-options">
        <ContactOption icon="contact-whatsapp" title="WhatsApp" text={supportPhoneDisplay} color="green" onClick={openSupportWhatsApp} />
        <ContactOption icon="contact-phone" title="Telefone" text={supportPhoneDisplay} color="blue" onClick={openSupportPhone} />
      </div>
    </>
  );
}

const notificationReadStorageKey = 'calendar.notifications.readIds';

function readNotificationReadIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(notificationReadStorageKey);
    const parsed = raw ? JSON.parse(raw) as string[] : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeNotificationReadIds(ids: Set<string>): void {
  try {
    window.localStorage.setItem(notificationReadStorageKey, JSON.stringify([...ids].slice(-200)));
  } catch {
    // Local read state is a UI convenience; failing to persist should not break notifications.
  }
}

function NotificationsModal({ onClose }: { onClose: () => void }) {
  const clientData = useClientBookingsData();
  const adminData = useAdminBookingsData();
  const isAdminContext = Boolean(getStoredAdminToken());
  const { bookings, isLoading } = isAdminContext ? adminData : clientData;
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(() => readNotificationReadIds());
  const notifications: NotificationModalItem[] = bookings.slice(0, 8).map((booking) => {
    const normalizedStatus = booking.status.toLowerCase();
    const isConfirmed = normalizedStatus.includes('confirm') || normalizedStatus.includes('aceit') || normalizedStatus.includes('agend');
    const isDone = normalizedStatus.includes('conclu');
    const isCancelled = normalizedStatus.includes('cancel') || normalizedStatus.includes('recus');
    const id = `${isAdminContext ? 'admin' : 'client'}:${booking.id}:${booking.status}:${booking.date}:${booking.time}`;
    const icon = isDone ? 'shield-check' : isCancelled ? 'clock-orange' : isConfirmed ? 'notification-calendar' : 'bell-purple';
    const tone = isDone ? 'green' : isCancelled ? 'orange' : isConfirmed ? 'purple' : 'blue';
    const title = isCancelled
      ? 'Agendamento atualizado'
      : isDone
        ? 'Agendamento concluído'
        : isConfirmed
          ? 'Agendamento confirmado'
          : 'Agendamento registrado';
    const dateText = ptDate.format(toLocalDate(booking.date));
    const providerText = booking.provider && booking.provider !== 'A definir' ? ` Prestador: ${booking.provider}.` : '';
    return {
      id,
      icon,
      title,
      time: dateText,
      tone,
      unread: !readNotificationIds.has(id) && !isDone && !isCancelled,
      text: `${booking.service} em ${booking.city || 'cidade não informada'} para ${dateText} às ${booking.time}. Status: ${booking.status}.${providerText}`,
    };
  });
  const unreadCount = notifications.filter((item) => item.unread).length;

  const markAllRead = () => {
    const next = new Set(readNotificationIds);
    notifications.forEach((item) => next.add(item.id));
    setReadNotificationIds(next);
    writeNotificationReadIds(next);
  };

  return (
    <NotificationsModalView
      emptyState={<EmptyState title="Nenhuma notificação" text="Nenhum agendamento real foi encontrado para gerar notificações." />}
      isLoading={isLoading}
      loadingState={<EmptyState title="Carregando notificações" text="Buscando atualizações dos seus agendamentos." />}
      notifications={notifications}
      onClose={onClose}
      onMarkAllRead={markAllRead}
      renderIcon={(name) => <Icon name={name} />}
      title={<ModalTitle icon="bell-purple" title="Notificações" text="Acompanhe atualizações dos seus agendamentos." />}
      unreadCount={unreadCount}
    />
  );
}

function AdminBlockModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(toIsoDate(new Date()));
  const [fullDay, setFullDay] = useState(true);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [cancelConflicts, setCancelConflicts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const toggleTime = (time: string) => {
    setSelectedTimes((current) => current.includes(time) ? current.filter((item) => item !== time) : [...current, time].sort());
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await createAdminBlocks({
        entries: [{ date, times: selectedTimes }],
        mode: fullDay ? 'full-day' : 'specific-hours',
        reason,
        cancelConflictingBookings: cancelConflicts,
      });
      await queryClient.invalidateQueries({ queryKey: ['wireframe-admin-blocks'] });
      setMessage('Bloqueio salvo na agenda.');
      window.setTimeout(onClose, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o bloqueio.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ModalTitle icon="calendar-block" title="Bloquear agenda" text="Defina os dias e horários em que você ou sua equipe não estarão disponíveis." />
      <div className="wf-admin-block-modal wf-admin-block-modal--wireframe">
        <section>
          <strong>Selecione os dias para bloquear</strong>
          <label className="wf-block-date-field">Data do bloqueio<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <MiniMonth />
          <div className="wf-block-legend"><span>Seleção manual</span><button type="button" onClick={() => { setDate(toIsoDate(new Date())); setSelectedTimes([]); setReason(''); }}>Limpar seleção</button></div>
        </section>
        <section className="wf-admin-block-controls">
          <label>Bloquear dia inteiro <input type="checkbox" checked={fullDay} onChange={(event) => setFullDay(event.target.checked)} /></label>
          <strong>Selecione os horários para bloquear</strong>
          <div className="wf-time-options">{modalTimeOptions.map((time) => <button type="button" key={time} className={selectedTimes.includes(time) ? 'is-selected' : ''} disabled={fullDay} onClick={() => toggleTime(time)}>{time}</button>)}</div>
          <label className="wf-check-line"><input type="checkbox" checked={cancelConflicts} onChange={(event) => setCancelConflicts(event.target.checked)} /> Cancelar agendamentos conflitantes, se houver</label>
          <label>Motivo / Observação<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ex.: treinamento, manutenção, folga etc." /></label>
        </section>
      </div>
      {error ? <p className="booking-form__error">{error}</p> : null}
      {message ? <p className="booking-form__hint">{message}</p> : null}
      <ModalActions primary={saving ? 'Salvando...' : 'Salvar bloqueio'} secondary="Cancelar" primaryIcon="lock-green" onSecondary={onClose} onPrimary={save} disabledPrimary={saving || !date || (!fullDay && selectedTimes.length === 0)} />
    </>
  );
}

function EditAdminBookingModal({ booking, onClose }: { booking?: BookingItem; onClose: () => void }) {
  const source = booking?.source && 'eventId' in booking.source ? booking.source as ServicoResponse : null;
  const [date, setDate] = useState(booking?.date ?? '');
  const [time, setTime] = useState(booking?.time ?? '');
  const [serviceType, setServiceType] = useState(source?.serviceType || booking?.service || '');
  const [serviceNotes, setServiceNotes] = useState(source?.serviceNotes || booking?.notes || 'Observacao detalhada nao informada.');
  const [firstName, setFirstName] = useState(source?.clientFirstName || booking?.name.split(' ')[0] || '');
  const [lastName, setLastName] = useState(source?.clientLastName || booking?.name.split(' ').slice(1).join(' ') || '');
  const [email, setEmail] = useState(source?.clientEmail || booking?.email || '');
  const [phone, setPhone] = useState(source?.clientPhone || booking?.phone || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!booking?.id || !source || saving) return;
    setSaving(true);
    setError('');
    const payload: ServicoRequest = {
      serviceType,
      serviceNotes,
      date,
      time,
      clientFirstName: firstName,
      clientLastName: lastName,
      clientEmail: email,
      clientPhone: phone.replace(/\D/g, ''),
      clientCep: source.clientCep,
      clientStreet: source.clientStreet,
      clientNeighborhood: source.clientNeighborhood,
      clientNumber: source.clientNumber,
      clientComplement: source.clientComplement,
      clientCity: source.clientCity,
      clientState: source.clientState,
    };
    try {
      await updateAdminBooking(booking.id, payload);
      onClose();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel editar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ModalTitle icon="edit" title="Editar agendamento" text="Ajuste data, horario e dados principais do atendimento." />
      {!source ? <EmptyState title="Dados incompletos" text="Abra a edicao a partir de um agendamento real carregado do backend." /> : null}
      {source ? (
        <section className="wf-form-grid">
          <ModalField label="Servico" icon="edit" value={serviceType} onChange={setServiceType} />
          <label className="wf-span-2">Observacao<textarea value={serviceNotes} onChange={(event) => setServiceNotes(event.target.value)} placeholder="Explique o servico solicitado pelo cliente." /></label>
          <ModalField label="Data" icon="calendar" type="date" value={date} onChange={setDate} />
          <ModalField label="Horario" icon="clock" type="time" value={time} onChange={setTime} />
          <ModalField label="Telefone" icon="phone" value={phone} onChange={setPhone} />
          <ModalField label="Nome" icon="user" value={firstName} onChange={setFirstName} />
          <ModalField label="Sobrenome" icon="user" value={lastName} onChange={setLastName} />
          <ModalField className="wf-span-2" label="E-mail" icon="mail" value={email} onChange={setEmail} />
        </section>
      ) : null}
      {error ? <p className="booking-form__error">{error}</p> : null}
      <ModalActions primary={saving ? 'Salvando...' : 'Salvar alteracoes'} secondary="Cancelar" primaryIcon="edit" onSecondary={onClose} onPrimary={save} />
    </>
  );
}

function AssignProviderModal({ booking, onClose }: { booking?: BookingItem; onClose: () => void }) {
  const providersQuery = useQuery({
    queryKey: ['admin-providers'],
    queryFn: () => listAdminProviders(),
    staleTime: 60_000,
  });
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const providers = providersQuery.data ?? [];

  const save = async () => {
    if (!booking?.id || !selectedProviderId || saving) return;
    setSaving(true);
    setError('');
    try {
      await assignAdminProvider(booking.id, selectedProviderId);
      onClose();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel designar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ModalTitle icon="user" title="Designar prestador" text="Selecione o prestador ideal para este agendamento." />
      <section className="wf-assign-summary">
        <span><b>#</b><strong>ID</strong><small>{booking?.id ?? 'Não selecionado'}</small></span><span><Icon name="user" /><strong>Cliente</strong><small>{booking?.name ?? 'Não selecionado'}</small></span><span><Icon name="calendar" /><strong>Data</strong><small>{booking ? ptDate.format(toLocalDate(booking.date)) : '—'}</small></span><span><Icon name="clock" /><strong>Horário</strong><small>{booking?.time ?? '—'}</small></span><span><Icon name="map" /><strong>Endereço</strong><small>{booking?.address ?? '—'}</small></span>
      </section>
      <div className="wf-provider-list wf-provider-list--wireframe">
        {providersQuery.isLoading ? <EmptyState title="Carregando prestadores" text="Buscando prestadores cadastrados." /> : null}
        {!providersQuery.isLoading && providers.length === 0 ? <EmptyState title="Nenhum prestador cadastrado" text="Cadastre os telefones em admin_users no Supabase." /> : null}
        {providers.map((provider: AdminProviderResponse) => (
          <button key={provider.id} type="button" className={selectedProviderId === provider.id ? 'is-active' : ''} onClick={() => setSelectedProviderId(provider.id)}>
            <span className="wf-radio-dot" />
            <Avatar name={provider.name} />
            <strong>{provider.name}</strong>
            <small>{formatPhoneForDisplay(provider.phone)}</small>
            <small>{provider.role}</small>
          </button>
        ))}
      </div>
      {error ? <p className="booking-form__error">{error}</p> : null}
      <ModalActions primary={saving ? 'Designando...' : 'Designar prestador'} secondary="Cancelar" primaryIcon="user" onSecondary={onClose} onPrimary={save} />
    </>
  );
}

function isEmailLike(value: string): boolean {
  const trimmed = value.trim();
  const at = trimmed.indexOf('@');
  const dot = trimmed.lastIndexOf('.');
  return at > 0 && dot > at + 1 && dot < trimmed.length - 1;
}

function buildAdminEmailBody(booking?: BookingItem): string {
  if (!booking) return '';
  return [
    `Olá, ${booking.name}.`,
    '',
    `Sobre seu atendimento de ${booking.service}, agendado para ${ptDate.format(toLocalDate(booking.date))} às ${booking.time}.`,
    '',
    'Mensagem:',
  ].join('\n');
}

function EmailAdminModal({ booking, onClose }: { booking?: BookingItem; onClose: () => void }) {
  const [to, setTo] = useState(booking?.email ?? '');
  const [subject, setSubject] = useState(booking ? `Atendimento ${booking.service}` : '');
  const [body, setBody] = useState(() => buildAdminEmailBody(booking));
  const [feedback, setFeedback] = useState('');
  const canSend = isEmailLike(to) && subject.trim().length > 0 && body.trim().length > 0;

  const send = () => {
    if (!canSend) {
      setFeedback('Informe destinatário, assunto e mensagem antes de enviar.');
      return;
    }
    window.location.href = buildMailtoUrl({ to, subject, body });
    setFeedback('Cliente de e-mail aberto com os dados preenchidos.');
  };

  return (
    <>
      <ModalTitle icon="mail-blue" title="Enviar e-mail" text="Comunique-se com o cliente de forma rápida e organizada." />
      <div className="wf-email-modal-layout">
        <section className="wf-form-grid wf-form-grid--email">
          <ModalField className="wf-span-2" label="Para" icon="mail" value={to} onChange={setTo} placeholder="Digite o e-mail do destinatário" required />
          <ModalField className="wf-span-2" label="Assunto" icon="file-upload" value={subject} onChange={setSubject} placeholder="Digite o assunto do e-mail" required />
          <label className="wf-span-2">Mensagem <div className="wf-editor-toolbar"><span>Normal</span><b>B</b><i>I</i><u>U</u><span>☷</span><span>🔗</span></div><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Digite sua mensagem..." /></label>
          <button type="button" className="wf-span-2 wf-attachment-drop" onClick={() => notifyUnavailable('Anexos')}><Icon name="paperclip" /><strong>Arraste arquivos aqui ou toque para selecionar</strong><small>Tamanho máximo 10MB por arquivo. Tipos permitidos: PDF, JPG, PNG, DOC, DOCX.</small></button>
        </section>
        <aside className="wf-email-security"><Icon name="email-illustration" /><p>Sua mensagem será enviada com segurança e confidencialidade. Anexe documentos, imagens ou arquivos relevantes.</p></aside>
      </div>
      {feedback ? <p className={canSend ? 'booking-form__hint' : 'booking-form__error'}>{feedback}</p> : null}
      <ModalActions primary="Enviar e-mail" secondary="Cancelar" primaryIcon="send" onSecondary={onClose} onPrimary={send} disabledPrimary={!canSend} />
    </>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} MB`;
}

function formatOfxPeriod(dashboard: FinancialDashboardDTO): string {
  const [year, monthNumber] = dashboard.month.split('-').map(Number);
  if (!year || !monthNumber) return dashboard.month;
  const first = new Date(year, monthNumber - 1, 1);
  const last = new Date(year, monthNumber, 0);
  return `${ptDate.format(first)} até ${ptDate.format(last)}`;
}

function OfxModal({ onClose, onImported }: { onClose: () => void; onImported?: (dashboard: FinancialDashboardDTO) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [dashboard, setDashboard] = useState<FinancialDashboardDTO | null>(null);
  const [autoProcess, setAutoProcess] = useState(true);
  const [error, setError] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const parseFile = async (file: File) => {
    setIsParsing(true);
    setError('');
    try {
      const text = await file.text();
      const parsedDashboard = parseOfxToFinancialDashboard(text, file.name);
      setFileName(file.name);
      setFileSize(formatFileSize(file.size));
      setDashboard(parsedDashboard);
    } catch (err) {
      setDashboard(null);
      setFileName('');
      setFileSize('');
      setError(err instanceof Error ? err.message : 'Nao foi possivel ler o arquivo OFX.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) void parseFile(file);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) void parseFile(file);
  };

  const clearFile = () => {
    setDashboard(null);
    setFileName('');
    setFileSize('');
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const importFile = () => {
    if (!dashboard) {
      setError('Selecione um arquivo OFX antes de importar.');
      return;
    }
    onImported?.(dashboard);
    onClose();
  };

  return (
    <>
      <ModalTitle icon="file-upload" title="Importar extrato OFX" text="Selecione o arquivo OFX do seu banco para importar as movimentações." />
      <input ref={inputRef} className="wf-file-input" type="file" accept=".ofx,application/ofx,application/x-ofx,text/plain" onChange={handleFileChange} />
      <button
        type="button"
        className="wf-ofx-modal-drop wf-ofx-modal-drop--wireframe"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <Icon name="cloud-upload" />
        <strong>{isParsing ? 'Lendo arquivo OFX...' : 'Arraste e solte seu arquivo OFX aqui'}</strong>
        <small>ou clique para selecionar</small>
      </button>
      <p className="wf-ofx-format"><Icon name="bell" /> Formato aceito: OFX de extratos bancários.</p>
      {error ? <p className="booking-form__error">{error}</p> : null}
      {dashboard ? (
        <>
          <div className="wf-ofx-file"><span><Icon name="file-check" /> {fileName} <small>{fileSize}</small></span><button type="button" onClick={clearFile} aria-label="Remover arquivo"><Icon name="delete" /></button></div>
          <div className="wf-ofx-period"><Icon name="calendar-blue" /><strong>Período do extrato</strong><span>{formatOfxPeriod(dashboard)}</span></div>
        </>
      ) : null}
      <label className="wf-check-line"><input type="checkbox" checked={autoProcess} onChange={(event) => setAutoProcess(event.target.checked)} /> Processar automaticamente após a importação</label>
      <ModalActions primary={autoProcess ? 'Importar extrato' : 'Salvar arquivo'} secondary="Cancelar" primaryIcon="upload" onSecondary={onClose} onPrimary={importFile} />
    </>
  );
}

function createBudgetDraftItem(): BudgetDraftItem {
  return { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, description: '', quantity: '1', unitPrice: '' };
}

function moneyToNumber(value: string): number {
  const normalized = value.replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const adminBudgetDraftsStorageKey = 'calendar_mate_admin_budget_drafts';

type StoredBudgetDraft = {
  id: string;
  bookingId?: string;
  clientName?: string;
  service?: string;
  total: number;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
  notes: string;
  savedAt: string;
};

function createStoredBudgetDraft({
  booking,
  total,
  items,
  notes,
}: {
  booking?: BookingItem;
  total: number;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
  notes: string;
}): StoredBudgetDraft {
  const savedAt = new Date().toISOString();
  return {
    id: `${booking?.id ?? 'avulso'}-${savedAt.replace(/[^0-9]/g, '')}`,
    bookingId: booking?.id,
    clientName: booking?.name,
    service: booking?.service,
    total,
    items,
    notes,
    savedAt,
  };
}

function saveBudgetDraftToStorage(draft: StoredBudgetDraft): void {
  const raw = window.localStorage.getItem(adminBudgetDraftsStorageKey);
  const current = raw ? JSON.parse(raw) as StoredBudgetDraft[] : [];
  const next = [draft, ...current.filter((item) => item.id !== draft.id)].slice(0, 50);
  window.localStorage.setItem(adminBudgetDraftsStorageKey, JSON.stringify(next));
}

function BudgetModal({ booking, onClose }: { booking?: BookingItem; onClose: () => void }) {
  const [items, setItems] = useState<BudgetDraftItem[]>(() => [createBudgetDraftItem()]);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const updateItem = (id: string, field: keyof Omit<BudgetDraftItem, 'id'>, value: string) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };
  const removeItem = (id: string) => {
    setItems((current) => current.length > 1 ? current.filter((item) => item.id !== id) : current.map(() => createBudgetDraftItem()));
  };
  const subtotal = items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0) * Math.max(0, moneyToNumber(item.unitPrice)), 0);
  const source = booking?.source && 'eventId' in booking.source ? booking.source as ServicoResponse : null;
  const session = getStoredAdminSession();
  const budgetItems = items.map((item) => ({
    id: item.id,
    description: item.description || 'Item',
    quantity: Number(item.quantity) || 0,
    unitPrice: moneyToNumber(item.unitPrice),
  }));
  const exportInput = source ? {
    provider: {
      name: session?.name || booking?.provider || 'Prestador',
      phone: session?.phone || '',
      email: '',
      city: source.clientCity || '',
    },
    service: source,
    items: budgetItems,
    issuedAt: new Date(),
    notes,
  } : null;

  const saveDraft = () => {
    try {
      saveBudgetDraftToStorage(createStoredBudgetDraft({
        booking,
        total: subtotal,
        items: budgetItems.map(({ description, quantity, unitPrice }) => ({ description, quantity, unitPrice })),
        notes,
      }));
      setMessage('Orçamento salvo no navegador. Exporte em PDF ou Excel para compartilhar.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Não foi possível salvar o orçamento no navegador.');
    }
  };

  return (
    <>
      <ModalTitle icon="budget-blue" title="Orçamento" text="Monte o orçamento do atendimento com itens, valores, anexos e exportação." />
      <section className="wf-budget-modal-layout wf-budget-modal-layout--wireframe">
        <aside className="wf-budget-context-card">
          <div className="wf-budget-context-icon"><Icon name="service-item" /></div>
          <h3>Atendimento vinculado</h3>
          <dl>
            <dt>Cliente</dt><dd>{booking?.name ?? 'Selecione um agendamento real'}</dd>
            <dt>Serviço</dt><dd>{booking?.service ?? 'Não vinculado'}</dd>
            <dt>Data</dt><dd>{booking ? `${ptDate.format(toLocalDate(booking.date))} às ${booking.time}` : '—'}</dd>
            <dt>Endereço</dt><dd>{booking?.address ?? '—'}</dd>
          </dl>
          {!booking ? <p className="wf-budget-warning"><Icon name="bell" /> Abra o orçamento a partir de um agendamento para vincular dados reais do cliente.</p> : null}
        </aside>
        <section className="wf-budget-editor">
          <div className="wf-budget-editor-head">
            <div><strong>Itens do orçamento</strong><small>Adicione somente dados reais informados pelo atendimento.</small></div>
            <button type="button" onClick={() => setItems((current) => [...current, createBudgetDraftItem()])}><Icon name="plus" /> Adicionar item</button>
          </div>
          <div className="wf-budget-items" role="list">
            {items.map((item, index) => (
              <article key={item.id} className="wf-budget-item-row" role="listitem">
                <span className="wf-budget-row-icon"><Icon name="service-item" /></span>
                <label>Descrição<input value={item.description} onChange={(event) => updateItem(item.id, 'description', event.target.value)} placeholder="Descreva o item ou serviço" /></label>
                <label>Qtd.<input inputMode="decimal" value={item.quantity} onChange={(event) => updateItem(item.id, 'quantity', event.target.value)} placeholder="1" /></label>
                <label>Valor unitário<input inputMode="decimal" value={item.unitPrice} onChange={(event) => updateItem(item.id, 'unitPrice', event.target.value)} placeholder="R$ 0,00" /></label>
                <strong>{formatCurrency((Number(item.quantity) || 0) * moneyToNumber(item.unitPrice))}</strong>
                <button type="button" aria-label={`Remover item ${index + 1}`} onClick={() => removeItem(item.id)}><Icon name="delete" /></button>
              </article>
            ))}
          </div>
          <div className="wf-budget-attachments">
            <button type="button" onClick={() => notifyUnavailable('Anexar comprovantes ao orçamento')}><Icon name="paperclip" /><span><strong>Anexar comprovantes</strong><small>PDF, JPG ou PNG relacionados ao orçamento.</small></span></button>
            <label>Observações<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Condições, validade, materiais inclusos ou observações do prestador." /></label>
          </div>
          <div className="wf-budget-total-card"><span>Total do orçamento</span><strong>{formatCurrency(subtotal)}</strong></div>
          <div className="wf-budget-export-row">
            <button type="button" onClick={() => exportInput ? exportBudgetPdf(exportInput) : setMessage('Vincule um agendamento real para exportar.')}><Icon name="pdf" /> Exportar PDF</button>
            <button type="button" onClick={() => exportInput ? exportBudgetXls(exportInput) : setMessage('Vincule um agendamento real para exportar.')}><Icon name="excel" /> Exportar Excel</button>
          </div>
        </section>
      </section>
      {message ? <p className="booking-form__hint">{message}</p> : null}
      <ModalActions primary="Salvar orçamento" secondary="Cancelar" primaryIcon="budget-orange" onSecondary={onClose} onPrimary={saveDraft} />
    </>
  );
}

function ModalActions({ primary, secondary, primaryIcon = 'plus', onPrimary, onSecondary, disabledPrimary = false }: { primary: string; secondary?: string; primaryIcon?: string; onPrimary?: () => void; onSecondary?: () => void; disabledPrimary?: boolean }) {
  return <footer className="wf-modal-actions">{secondary ? <button type="button" className="wf-ghost-btn" onClick={onSecondary}>{secondary}</button> : null}<button type="button" className="wf-primary-cta wf-primary-cta--modal" onClick={onPrimary} disabled={disabledPrimary}>{primary} <Icon name={primaryIcon} /></button></footer>;
}
