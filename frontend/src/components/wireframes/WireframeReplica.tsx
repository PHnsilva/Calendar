import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
import adminAppointmentsIcon from '../../assets/wireframes/icons/admin-appointments-clipboard.png';
import adminBlocksIcon from '../../assets/wireframes/icons/admin-blocks-lock.png';
import adminHistoryIcon from '../../assets/wireframes/icons/admin-history-clock.png';
import adminFinanceIcon from '../../assets/wireframes/icons/admin-finance-chart.png';
import confirmPhoneSecurityIllustration from '../../assets/wireframes/modals/confirm-phone-security.png';
import emailIllustrationAsset from '../../assets/wireframes/modals/email-illustration.png';
import { ALLOWED_CITIES } from '../../data/allowed-cities';
import { listAdminBlocks } from '../../features/admin/api/manage-admin-blocks';
import { useAdminBookings } from '../../features/admin/hooks/useAdminBookings';
import { useMyBookings } from '../../features/bookings/hooks/useMyBookings';
import type { CalendarEvent } from '../../features/calendar/types';
import { FinancialChart } from '../../features/finance/components/FinancialChart';
import { buildFinancialDashboardFromEntries, parseOfxToFinancialDashboard } from '../../features/finance/services/ofx-parser';
import type { FinancialDashboardDTO, FinancialTransaction } from '../../features/finance/types';
import {
  formatPhoneForDisplay,
  getLocalCalendarEvents,
  getLocalEventsChangedEventName,
  getManageTokens,
  getStoredAdminSession,
  getStoredAdminToken,
  getStoredPhoneVerification,
  isStoredAdminOwner,
  clearAdminToken,
} from '../../lib/storage';
import type { AdminProviderResponse, AvailabilityBlockResponse, ServicoRequest, ServicoResponse } from '../../types/api';
import { assignAdminProvider } from '../../features/admin/api/assign-admin-provider';
import { confirmAdminLogin, listAdminProviders, startAdminLogin } from '../../features/admin/api/admin-auth';
import { getAdminHistory } from '../../features/admin/api/get-admin-history';
import { updateAdminBooking } from '../../features/admin/api/update-admin-booking';
import { exportBudgetPdf, exportBudgetXls } from '../../features/admin/services/budget-export';
import '../../app/wireframes.css';

type ModalKind =
  | 'create-client'
  | 'confirm-phone'
  | 'client-details'
  | 'contact'
  | 'notifications'
  | 'block-admin'
  | 'assign-provider'
  | 'edit-admin'
  | 'email-admin'
  | 'ofx-admin'
  | 'budget-admin'
  | 'how-it-works'
  | null;

type AdminView = 'agenda' | 'agendamentos' | 'bloqueios' | 'historico' | 'extrato';
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
  color: Accent;
  status: string;
  source?: ServicoResponse | CalendarEvent;
};

type ModalContext = {
  booking?: BookingItem;
};

type BudgetDraftItem = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

const fallbackFinanceDashboard = buildFinancialDashboardFromEntries([
  { id: 'fallback-1', title: 'Pagamento recebido AGD-2025-0126', date: '2025-05-03', time: '', category: 'credit', amount: 420 },
  { id: 'fallback-2', title: 'Compra de material', date: '2025-05-04', time: '', category: 'material', amount: -89.5 },
  { id: 'fallback-3', title: 'Pagamento recebido AGD-2025-0127', date: '2025-05-09', time: '', category: 'credit', amount: 280 },
  { id: 'fallback-4', title: 'Taxa da plataforma', date: '2025-05-13', time: '', category: 'taxa', amount: -32.9 },
  { id: 'fallback-5', title: 'Pagamento recebido AGD-2025-0128', date: '2025-05-18', time: '', category: 'credit', amount: 350 },
  { id: 'fallback-6', title: 'Pagamento recebido AGD-2025-0129', date: '2025-05-24', time: '', category: 'credit', amount: 520 },
]);

const accentCycle: Accent[] = ['blue', 'orange', 'green', 'purple', 'cyan'];
const ptDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const ptWeekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });
const ptMonth = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
const ptLongDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
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

function useAdminHistoryData() {
  const hasAdminToken = Boolean(getStoredAdminToken());
  const query = useQuery({
    queryKey: ['wireframe-admin-history'],
    queryFn: () => getAdminHistory(),
    enabled: hasAdminToken,
    staleTime: 15_000,
    retry: 0,
  });
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

function openWhatsApp(phone?: string) {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) {
    window.alert('Telefone não disponível para este agendamento.');
    return;
  }
  const normalized = digits.startsWith('55') ? digits : `55${digits}`;
  window.open(`https://wa.me/${normalized}`, '_blank', 'noopener,noreferrer');
}

function notifyUnavailable(action: string) {
  window.alert(`${action} depende do fluxo real do sistema. Mantive o botão ativo e sem dados simulados.`);
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
    'admin-appointments': adminAppointmentsIcon,
    'admin-blocks': adminBlocksIcon,
    'admin-history': adminHistoryIcon,
    'admin-finance': adminFinanceIcon,
    'confirm-phone-security': confirmPhoneSecurityIllustration,
    'email-illustration': emailIllustrationAsset,
  };
  const imageIcon = imageIcons[name];
  if (imageIcon) {
    return (
      <span aria-hidden="true" className={cx('wf-icon', 'wf-icon--image', `wf-icon--${name.replace(/[^a-zA-Z0-9-]/g, '-')}`)}>
        <img src={imageIcon} alt="" />
      </span>
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
    'file-upload': <svg {...common}><defs><linearGradient id={`${uid}-file`} x1="13" y1="8" x2="52" y2="56"><stop stopColor="#8f71ff"/><stop offset="1" stopColor="#6d2ee8"/></linearGradient></defs><path d="M18 8h25l9 10v38H18V8Z" fill="#f4efff" stroke={`url(#${uid}-file)`} strokeWidth="4" strokeLinejoin="round"/><path d="M43 9v11h9" stroke="#6d2ee8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M31 44V28M23 36l8-8 8 8" stroke="#6d2ee8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><path d="M41 41h7M45 37v8" stroke="#0358ff" strokeWidth="3.2" strokeLinecap="round"/></svg>,
    'file-check': <svg {...common}><defs><linearGradient id={`${uid}-fcheck`} x1="13" y1="8" x2="52" y2="56"><stop stopColor="#5be18f"/><stop offset="1" stopColor="#09a64b"/></linearGradient></defs><path d="M18 8h25l9 10v38H18V8Z" fill="#edfff5" stroke={`url(#${uid}-fcheck)`} strokeWidth="4" strokeLinejoin="round"/><path d="M43 9v11h9" stroke="#09a64b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="45" cy="45" r="9" fill="#09a64b"/><path d="m40.5 45 3 3.2 6.2-7.2" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    paperclip: <svg {...common}><path d="M24 36 39 21a9 9 0 0 1 13 13L31 55a14 14 0 0 1-20-20l22-22a8 8 0 0 1 12 12L24 46a4 4 0 0 1-6-6l20-20" {...line}/></svg>,
    'email-illustration': <svg {...common} viewBox="0 0 128 128"><defs><linearGradient id={`${uid}-env`} x1="24" y1="43" x2="91" y2="102"><stop stopColor="#6f8cff"/><stop offset="1" stopColor="#0358ff"/></linearGradient><linearGradient id={`${uid}-plane`} x1="76" y1="20" x2="112" y2="58"><stop stopColor="#b8c8ff"/><stop offset="1" stopColor="#6b86ff"/></linearGradient></defs><path d="M22 64c10-14 22-10 29 3 8 15 26 11 31-2 6-16 25-11 26 4" stroke="#9fbaff" strokeWidth="3" strokeDasharray="5 7" fill="none"/><path d="M31 55h58v42H31z" fill={`url(#${uid}-env)`}/><path d="m31 56 29 24 29-24" stroke="#fff" strokeWidth="4" strokeLinejoin="round"/><path d="M47 39h39v34H47z" fill="#fff" stroke="#cbd8ff" strokeWidth="3"/><path d="M57 51h20M57 62h18" stroke="#c4cdf9" strokeWidth="4" strokeLinecap="round"/><path d="M81 31 113 18l-13 35-9-12-10 4Z" fill={`url(#${uid}-plane)`}/><circle cx="88" cy="90" r="18" fill="#7c92ff" stroke="#fff" strokeWidth="5"/><path d="m79 90 7 7 13-15" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 41h15M14 47h24M94 75h20" stroke="#e5ecff" strokeWidth="8" strokeLinecap="round"/></svg>,
  };

  return <span aria-hidden="true" className={cx('wf-icon', `wf-icon--${name.replace(/[^a-zA-Z0-9-]/g, '-')}`)}>{icons[name] ?? icons.check}</span>;
}

function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className={cx('wf-logo', compact && 'wf-logo--compact')}>
      <img src={logo} alt="SG Pequenos Reparos Agendamentos" />
    </Link>
  );
}

function HeaderButton({ children, variant = 'blue', to, onClick, compact = false }: { children: ReactNode; variant?: 'blue' | 'orange' | 'ghost'; to?: string; onClick?: () => void; compact?: boolean }) {
  const className = cx('wf-top-btn', `wf-top-btn--${variant}`, compact && 'wf-top-btn--compact');
  if (to) return <Link to={to} className={className}>{children}</Link>;
  return <button type="button" className={className} onClick={onClick}>{children}</button>;
}

function PublicHeader({ onCreate, onMenu, onConfirmPhone, page = 'home' }: { onCreate?: () => void; onMenu?: () => void; onConfirmPhone?: () => void; page?: 'home' | 'my' }) {
  return (
    <header className="wf-header wf-header--public">
      <LogoMark />
      <nav className="wf-header-actions">
        {page === 'home' ? (
          <>
            <HeaderButton to="/my"><Icon name="calendar" /> <span>Meus agendamentos</span></HeaderButton>
            <HeaderButton variant="blue" onClick={onConfirmPhone}><Icon name="user" /> <span>Olá! Visitante</span> <Icon name="chevron" /></HeaderButton>
            <HeaderButton variant="orange" onClick={onCreate}><span>Criar agendamento</span> <Icon name="plus" /></HeaderButton>
          </>
        ) : (
          <>
            <HeaderButton to="/"><Icon name="home" /> <span>Página inicial</span></HeaderButton>
            <HeaderButton variant="blue" onClick={onConfirmPhone}><Icon name="user" /> <span>Cliente</span> <Icon name="chevron" /></HeaderButton>
            <HeaderButton variant="orange" onClick={onCreate}><Icon name="plus" /> <span>Novo agendamento</span></HeaderButton>
          </>
        )}
      </nav>
      <nav className="wf-mobile-actions" aria-label="Ações rápidas">
        <HeaderButton to={page === 'home' ? '/my' : '/'} compact><Icon name={page === 'home' ? 'calendar' : 'home'} /></HeaderButton>
        <HeaderButton compact onClick={onConfirmPhone}><Icon name="user" /></HeaderButton>
        <HeaderButton variant="orange" compact onClick={onMenu ?? onCreate}><Icon name="menu" /></HeaderButton>
      </nav>
    </header>
  );
}

function AdminHeader({ active, onView, onCreate, onBudget }: { active: AdminView; onView?: (view: AdminView) => void; onCreate?: () => void; onBudget?: () => void }) {
  const navigate = useNavigate();
  const session = getStoredAdminSession();
  const owner = session?.role === 'OWNER';
  const allTabs: Array<{ key: AdminView; label: string; icon: string; ownerOnly?: boolean }> = [
    { key: 'agenda', label: 'Orcamento', icon: 'budget' },
    { key: 'agendamentos', label: 'Agendamentos', icon: 'calendar' },
    { key: 'bloqueios', label: 'Bloqueios', icon: 'lock', ownerOnly: true },
    { key: 'historico', label: 'Histórico', icon: 'clock' },
    { key: 'extrato', label: 'Extrato', icon: 'chart', ownerOnly: true },
  ];
  const tabs = allTabs.filter((tab) => owner || !tab.ownerOnly);

  const selectView = (view: AdminView) => {
    if (view === 'agenda') {
      onBudget?.();
      return;
    }
    onView?.(view);
    navigate(`/admin/dashboard?view=${view}`);
  };

  return (
    <header className="wf-header wf-header--admin">
      <LogoMark />
      <nav className="wf-admin-tabs" aria-label="Navegação administrativa">
        {tabs.map((tab) => (
          <button key={tab.key} type="button" className={cx('wf-admin-tab', active === tab.key && 'is-active')} onClick={() => selectView(tab.key)}>
            <Icon name={tab.icon} /> {tab.label}
          </button>
        ))}
      </nav>
      <nav className="wf-header-actions wf-header-actions--admin">
        <HeaderButton variant="blue" onClick={() => { clearAdminToken(); navigate('/admin', { replace: true }); }}><Icon name="user" /> <span>{session?.name || 'Admin'}</span> <Icon name="chevron" /></HeaderButton>
        <HeaderButton variant="orange" onClick={onCreate}><span>Novo agendamento</span> <Icon name="plus" /></HeaderButton>
      </nav>
      <nav className="wf-mobile-actions" aria-label="Ações administrativas rápidas">
        <HeaderButton compact onClick={() => selectView('agendamentos')}><Icon name="calendar" /></HeaderButton>
        <HeaderButton compact onClick={() => notifyUnavailable('Menu do administrador')}><Icon name="user" /></HeaderButton>
        <HeaderButton variant="orange" compact onClick={onCreate}><Icon name="plus" /></HeaderButton>
      </nav>
    </header>
  );
}

function Badge({ icon, children, color = 'orange' }: { icon?: string; children: ReactNode; color?: Accent }) {
  return <span className={cx('wf-badge', `wf-badge--${color}`)}>{icon ? <Icon name={icon} /> : null}{children}</span>;
}

function ActionCard({ icon, title, text, color, onClick, to }: { icon: string; title: string; text: string; color: Accent; onClick?: () => void; to?: string }) {
  const content = (
    <>
      <span className="wf-action-card__icon"><Icon name={icon} /></span>
      <span className="wf-action-card__body"><strong>{title}</strong><small>{text}</small></span>
      <span className="wf-action-card__arrow">›</span>
    </>
  );
  if (to) return <Link to={to} className={cx('wf-action-card', `wf-action-card--${color}`)}>{content}</Link>;
  return <button type="button" className={cx('wf-action-card', `wf-action-card--${color}`)} onClick={onClick}>{content}</button>;
}

function FeatureLine() {
  return (
    <div className="wf-feature-line">
      <span><Icon name="shield" /> Seguro e confiável</span>
      <span><Icon name="lock" /> Seus dados protegidos</span>
      <span><Icon name="check" /> Confirmação apenas por telefone</span>
    </div>
  );
}

function HeroVisual({ type }: { type: 'client' | 'admin' }) {
  const desktop = type === 'admin' ? heroAdmin : heroClient;
  const mobile = type === 'admin' ? heroAdminMobile : heroClientMobile;

  return (
    <div className={cx('wf-hero-visual', `wf-hero-visual--${type}`)}>
      <picture>
        <source media="(max-width: 720px)" srcSet={mobile} />
        <img src={desktop} alt="Prestador de pequenos reparos" />
      </picture>
    </div>
  );
}

function LandingFooter({ admin = false }: { admin?: boolean }) {
  return (
    <footer className="wf-footer">
      <LogoMark compact />
      <p>{admin ? 'Plataforma completa para gestão de agendamentos.' : 'A plataforma completa para agendar seus atendimentos e pequenos reparos com praticidade e segurança.'}</p>
      <button type="button" onClick={() => notifyUnavailable('Sobre o serviço')}>Sobre o serviço</button>
      <button type="button" onClick={() => notifyUnavailable('Perguntas frequentes')}>Perguntas frequentes</button>
      <button type="button" onClick={() => notifyUnavailable('Contato')}>Contato</button>
      <strong><Icon name="shield" /> Seus dados protegidos com privacidade.</strong>
    </footer>
  );
}

function ClientLandingModalButtons({ setModal }: { setModal: (modal: ModalKind) => void }) {
  return (
    <div className="wf-actions-grid wf-actions-grid--client">
      <ActionCard icon="calendar-create" title="Criar agendamento" text="Escolha o serviço, data e horário ideal para você." color="orange" onClick={() => setModal('create-client')} />
      <ActionCard icon="calendar-clock" title="Acompanhar agendamento" text="Veja os detalhes e o status do seu agendamento." color="blue" to="/my" />
      <ActionCard icon="mobile-phone" title="Confirmar telefone" text="Confirme seu número no dia do atendimento." color="green" onClick={() => setModal('confirm-phone')} />
      <ActionCard icon="chat-bubbles" title="Fale conosco" text="Dúvidas ou suporte? Estamos aqui para ajudar." color="purple" onClick={() => setModal('contact')} />
    </div>
  );
}

export function ClientLanding() {
  const [modal, setModal] = useState<ModalKind>(null);
  const scrollToInfo = () => document.getElementById('wf-why-use')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return (
    <div className="wf-page wf-client-landing">
      <PublicHeader onCreate={() => setModal('create-client')} onMenu={() => setModal('contact')} onConfirmPhone={() => setModal('confirm-phone')} />
      <main className="wf-landing-main">
        <section className="wf-hero wf-hero--client">
          <div className="wf-hero-copy">
            <Badge icon="calendar" color="orange">Simples, rápido e sem complicações</Badge>
            <h1>Organize seus agendamentos e pequenos reparos com <span>facilidade.</span></h1>
            <p>Crie seu agendamento sem precisar fazer login.<br />No dia, confirme seu número de telefone e pronto!</p>
            <div className="wf-hero-buttons">
              <button type="button" className="wf-primary-cta" onClick={() => setModal('create-client')}><Icon name="calendar" /> Criar agendamento</button>
              <button type="button" className="wf-secondary-cta" onClick={scrollToInfo}><span className="wf-play"><Icon name="play" /></span> Como funciona?</button>
            </div>
            <FeatureLine />
          </div>
          <HeroVisual type="client" />
        </section>

        <ClientLandingModalButtons setModal={setModal} />

        <section className="wf-info-row" id="wf-why-use">
          <article className="wf-house-card">
            <img src={houseCard} alt="Casa atendida" />
            <div>
              <h2>Agende quando e onde estiver</h2>
              <p>Do computador ou do celular, organize seus atendimentos de forma rápida e segura, 24 horas por dia.</p>
            </div>
          </article>
          <article className="wf-why-card">
            <h2>Por que usar o SG Agendamentos?</h2>
            <div className="wf-mini-features">
              <span><Icon name="clock" /><strong>Mais praticidade</strong><small>Tudo online, sem burocracia.</small></span>
              <span><Icon name="shield" /><strong>Mais segurança</strong><small>Confirmação por telefone no dia.</small></span>
              <span><Icon name="flash" /><strong>Mais rapidez</strong><small>Agende em poucos cliques.</small></span>
              <span><Icon name="calendar" /><strong>Acompanhamento</strong><small>Acompanhe o status do seu pedido.</small></span>
            </div>
          </article>
        </section>
        <LandingFooter />
      </main>
      <WireframeModal modal={modal} onClose={() => setModal(null)} />
    </div>
  );
}

function CalendarBoard({ bookings = [], admin = false }: { bookings?: BookingItem[]; admin?: boolean }) {
  const [monthStart, setMonthStart] = useState(startOfMonth());
  const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const grid = useMemo(() => getMonthGrid(monthStart), [monthStart]);
  const today = toIsoDate(new Date());
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, BookingItem[]>();
    bookings.forEach((booking) => map.set(booking.date, [...(map.get(booking.date) ?? []), booking]));
    return map;
  }, [bookings]);
  const visibleCities = useMemo(() => {
    const cities = Array.from(new Set(bookings.map((booking) => booking.city).filter(Boolean))) as string[];
    return cities.length ? cities : ALLOWED_CITIES.slice(0, 5);
  }, [bookings]);
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(toLocalDate(monthStart));
  const shift = (delta: number) => {
    const base = toLocalDate(monthStart);
    setMonthStart(toIsoDate(new Date(base.getFullYear(), base.getMonth() + delta, 1)));
  };

  return (
    <section className="wf-calendar-panel">
      <div className="wf-section-title wf-section-title--calendar">
        <span className="wf-large-icon"><Icon name="calendar" /></span>
        <div>
          <h1>Agendamentos</h1>
          <p>Visualize, organize e acompanhe os atendimentos.</p>
        </div>
        <div className="wf-month-pills"><button type="button" onClick={() => shift(-1)}>‹</button><button type="button">{monthLabel}</button><button type="button" onClick={() => shift(1)}>›</button></div>
      </div>
      <div className="wf-city-box">
        <h3><Icon name="map" /> Cidades atendidas</h3>
        <div>{visibleCities.map((city, index) => <span key={city} className={cx('wf-city-pill', `wf-city-pill--${accentCycle[index % accentCycle.length]}`)}>{city}</span>)}</div>
      </div>
      <div className="wf-calendar-grid">
        {days.map((day) => <strong key={day}>{day}</strong>)}
        {grid.map((item) => {
          const dayBookings = bookingsByDate.get(item.iso) ?? [];
          return (
            <div key={item.iso} className={cx('wf-calendar-day', item.iso === today && 'is-selected', !item.isCurrentMonth && 'is-muted', item.isWeekend && 'is-weekend')}>
              <b>{item.day}</b>
              {dayBookings.length ? <span className="wf-dots">{dayBookings.slice(0, 3).map((booking) => <i key={booking.id} />)}</span> : null}
            </div>
          );
        })}
      </div>
      {admin ? null : <small className="wf-calendar-note">Status considerados como Confirmado por padrão.</small>}
    </section>
  );
}

function FiltersBar({ admin = false, canAssign = true }: { admin?: boolean; canAssign?: boolean }) {
  const [active, setActive] = useState('Todos');
  return (
    <div className="wf-filters-bar">
      <div className="wf-filter-tabs">{['Todos', 'Próximos', 'Concluídos'].map((tab) => <button key={tab} type="button" className={active === tab ? 'is-active' : ''} onClick={() => setActive(tab)}>{tab}</button>)}</div>
      <label className="wf-search"><Icon name="search" /><input placeholder="Buscar por cliente, telefone ou endereço..." /></label>
      <button type="button" className="wf-filter-btn" onClick={() => notifyUnavailable('Filtros avançados')}><Icon name="filter" /></button>
      {admin && canAssign ? <button type="button" className="wf-filter-btn wf-filter-btn--wide" onClick={() => notifyUnavailable('Designação em lote')}>Designar em lote</button> : null}
    </div>
  );
}

function BookingCard({ booking, admin, canAssign = true, onDetails, onAssign, onEdit, onBudget }: { booking: BookingItem; admin?: boolean; canAssign?: boolean; onDetails?: () => void; onAssign?: () => void; onEdit?: () => void; onBudget?: () => void }) {
  return (
    <article className={cx('wf-booking-card', `wf-booking-card--${booking.color}`)}>
      <aside className="wf-date-tile">
        <small>{booking.weekday}</small>
        <strong>{booking.day}</strong>
        <span>{booking.month}</span>
        <em><Icon name="clock" /> {booking.time}</em>
      </aside>
      <div className="wf-booking-content">
        <div className="wf-booking-main">
          <div>
            <h2>{booking.name}</h2>
            <p><Icon name="phone" /> {formatPhoneForDisplay(booking.phone) || 'Telefone não informado'}</p>
            <p><Icon name="map" /> {booking.address}</p>
            <p><Icon name="edit" /> {booking.service}</p>
          </div>
          <div className="wf-provider-box">
            <strong>Prestador designado</strong>
            <p><Icon name="user" /> {booking.provider || 'A definir'}</p>
          </div>
          <Badge color="green">{booking.status}</Badge>
        </div>
        <div className="wf-booking-actions">
          <button type="button" onClick={onDetails}><Icon name="eye" /> Detalhes</button>
          <button type="button" onClick={onEdit}><Icon name="edit" /> Editar</button>
          <button type="button" onClick={() => openWhatsApp(booking.phone)}><Icon name="whatsapp" /> {admin ? 'WhatsApp' : 'Tirar dúvidas'}</button>
          {admin && canAssign ? <button type="button" onClick={onAssign}><Icon name="user" /> Designar prestador</button> : null}
          {admin ? <button type="button" onClick={onBudget}><Icon name="budget" /> Orçamento</button> : null}
          <button type="button" className="wf-danger" onClick={() => notifyUnavailable('Cancelamento')}><Icon name="delete" /> Cancelar</button>
        </div>
        <div className="wf-booking-meta">
          <span><Icon name="user" /> <b>Prestador</b>{booking.provider || 'A definir'}</span>
          <span><Icon name="clock" /> <b>Horário</b>{booking.endTime ? `${booking.time}–${booking.endTime}` : booking.time}</span>
          <span><Icon name="calendar" /> <b>Data</b>{ptDate.format(toLocalDate(booking.date))}</span>
          <span><Icon name="bell" /> <b>Status</b>{booking.status}</span>
          <span><Icon name="edit" /> <b>Serviço</b>{booking.service}</span>
          <span><Icon name="user" /> <b>Cliente</b>{booking.name}</span>
        </div>
      </div>
    </article>
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
  const { bookings, isLoading, isError, hasTokens } = useClientBookingsData();
  const openDetails = (booking: BookingItem) => { setContext({ booking }); setModal('client-details'); };
  const openCreate = () => { setContext({}); setModal('create-client'); };

  return (
    <div className="wf-page wf-page--list">
      <PublicHeader page="my" onCreate={openCreate} onMenu={() => setModal('notifications')} onConfirmPhone={() => setModal('confirm-phone')} />
      <main className="wf-two-column wf-two-column--bookings">
        <CalendarBoard bookings={bookings} />
        <section className="wf-booking-list-panel">
          <FiltersBar />
          <div className="wf-booking-stack">
            {isLoading ? <EmptyState title="Carregando agendamentos" text="Buscando seus dados reais no sistema." /> : null}
            {isError ? <EmptyState title="Não foi possível carregar" text="Confira sua conexão ou confirme novamente seu telefone." action="Confirmar telefone" onAction={() => setModal('confirm-phone')} /> : null}
            {!isLoading && !isError && bookings.length === 0 ? <EmptyState title="Nenhum agendamento encontrado" text={hasTokens ? 'Você ainda não possui agendamentos vinculados aos tokens salvos.' : 'Confirme seu telefone ou crie um novo agendamento para acompanhar por aqui.'} action="Criar agendamento" onAction={openCreate} /> : null}
            {bookings.map((booking) => <BookingCard key={booking.id} booking={booking} onDetails={() => openDetails(booking)} onEdit={openCreate} />)}
          </div>
        </section>
      </main>
      <WireframeModal modal={modal} context={context} onClose={() => setModal(null)} />
    </div>
  );
}

function AdminLandingCard({ icon, title, text, color, view, onOpen }: { icon: string; title: string; text: string; color: Accent; view: AdminView; onOpen: (view: AdminView) => void }) {
  return (
    <button type="button" className={cx('wf-admin-card', `wf-admin-card--${color}`)} onClick={() => onOpen(view)}>
      <span className="wf-admin-card__icon"><Icon name={icon} /></span>
      <span><strong>{title}</strong><small>{text}</small></span>
      <b>→</b>
    </button>
  );
}

export function AdminLanding() {
  const [modal, setModal] = useState<ModalKind>(null);
  const navigate = useNavigate();
  const session = getStoredAdminSession();
  const openView = (view: AdminView) => {
    if (view === 'agenda') {
      setModal('budget-admin');
      return;
    }
    navigate(`/admin/dashboard?view=${view}`);
  };
  if (!session) {
    return <AdminLoginScreen onDone={() => navigate('/admin/dashboard?view=agendamentos', { replace: true })} />;
  }
  const owner = session.role === 'OWNER';
  return (
    <div className="wf-page wf-admin-landing">
      <AdminHeader active="agenda" onCreate={() => setModal('create-client')} onBudget={() => setModal('budget-admin')} />
      <main className="wf-landing-main wf-landing-main--admin">
        <section className="wf-hero wf-hero--admin">
          <div className="wf-hero-copy">
            <h1>Gerencie sua agenda e atendimentos com <span>facilidade.</span></h1>
            <p>Organize sua agenda, atribua prestadores, controle bloqueios e acompanhe extrato e histórico de atendimentos em um só lugar.</p>
          </div>
          <HeroVisual type="admin" />
        </section>
        <section className="wf-admin-card-grid">
          <AdminLandingCard icon="budget" title="Orçamento" text="Crie orçamentos, itens, anexos e exportações vinculadas aos atendimentos." color="blue" view="agenda" onOpen={openView} />
          <AdminLandingCard icon="admin-appointments" title="Agendamentos" text="Crie, edite, atribua e acompanhe todos os agendamentos em um só lugar." color="orange" view="agendamentos" onOpen={openView} />
          {owner ? <AdminLandingCard icon="admin-blocks" title="Bloqueios" text="Bloqueie horários e períodos indisponíveis para evitar conflitos na agenda." color="green" view="bloqueios" onOpen={openView} /> : null}
          <AdminLandingCard icon="admin-history" title="Histórico" text="Consulte atendimentos realizados e detalhes completos de cada serviço." color="purple" view="historico" onOpen={openView} />
          {owner ? <AdminLandingCard icon="admin-finance" title="Extrato / Financeiro" text="Acompanhe recebimentos, faturamento e saldos de forma organizada." color="blue" view="extrato" onOpen={openView} /> : null}
        </section>
        <LandingFooter admin />
      </main>
      <WireframeModal modal={modal} onClose={() => setModal(null)} />
    </div>
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
      setError(err instanceof Error ? err.message : 'Nao foi possivel enviar o codigo.');
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
      setError(err instanceof Error ? err.message : 'Codigo invalido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="wf-page wf-admin-landing">
      <main className="wf-landing-main wf-landing-main--admin">
        <section className="wf-hero wf-hero--admin">
          <div className="wf-hero-copy">
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
          <HeroVisual type="admin" />
        </section>
      </main>
    </div>
  );
}

function getInitialAdminView(): AdminView {
  const param = new URLSearchParams(window.location.search).get('view');
  if (param === 'agenda' || param === 'bloqueios' || param === 'historico' || param === 'extrato' || param === 'agendamentos') return param;
  return 'agendamentos';
}

export function AdminDashboardReplica() {
  const [view, setView] = useState<AdminView>(getInitialAdminView);
  const [modal, setModal] = useState<ModalKind>(null);
  const [context, setContext] = useState<ModalContext>({});
  const [financialDashboard, setFinancialDashboard] = useState<FinancialDashboardDTO | null>(null);
  const openCreate = () => { setContext({}); setModal('create-client'); };
  const openBudget = () => { setContext({}); setModal('budget-admin'); };
  const session = getStoredAdminSession();
  const owner = session?.role === 'OWNER';
  const effectiveView = !owner && (view === 'extrato' || view === 'bloqueios') ? 'agendamentos' : view;

  if (!session) {
    return <AdminLoginScreen onDone={() => window.location.assign('/admin/dashboard?view=agendamentos')} />;
  }

  return (
    <div className="wf-page wf-admin-dashboard">
      <AdminHeader active={effectiveView} onView={setView} onCreate={openCreate} onBudget={openBudget} />
      <main className="wf-admin-main">
        {effectiveView === 'agenda' || effectiveView === 'agendamentos' ? <AdminAppointmentsView setModal={setModal} setContext={setContext} /> : null}
        {effectiveView === 'bloqueios' ? <AdminBlocksView setModal={setModal} /> : null}
        {effectiveView === 'historico' ? <AdminHistoryView setModal={setModal} setContext={setContext} /> : null}
        {effectiveView === 'extrato' ? <AdminFinanceView dashboard={financialDashboard ?? fallbackFinanceDashboard} hasImportedOfx={Boolean(financialDashboard)} setModal={setModal} /> : null}
      </main>
      <WireframeModal modal={modal} context={context} onClose={() => setModal(null)} onOfxImported={setFinancialDashboard} />
    </div>
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
  const openBudget = (booking?: BookingItem) => { setContext({ booking }); setModal('budget-admin'); };

  return (
    <div className="wf-two-column wf-two-column--bookings wf-two-column--admin">
      <CalendarBoard bookings={bookings} admin />
      <section className="wf-booking-list-panel">
        <div className="wf-admin-budget-toolbar">
          <div>
            <strong>Orçamentos</strong>
            <small>Crie orçamentos vinculados aos agendamentos reais carregados pelo sistema.</small>
          </div>
          <button type="button" className="wf-primary-cta wf-primary-cta--small" onClick={() => openBudget()}><Icon name="budget-orange" /> Novo orçamento</button>
        </div>
        <FiltersBar admin canAssign={owner} />
        <div className="wf-booking-stack wf-booking-stack--admin">
          {isLoading ? <EmptyState title="Carregando agendamentos" text="Buscando agendamentos reais do backend." /> : null}
          {isError || !hasAdminToken ? <EmptyState title="Agendamentos não disponíveis" text="Faça login administrativo para carregar os dados reais do backend." /> : null}
          {!isLoading && !isError && bookings.length === 0 ? <EmptyState title="Nenhum agendamento cadastrado" text="Ainda não há agendamentos retornados pela API administrativa." /> : null}
          {bookings.map((booking) => <BookingCard key={booking.id} booking={booking} admin canAssign={owner} onDetails={() => openDetails(booking)} onAssign={() => openAssign(booking)} onEdit={() => openEdit(booking)} onBudget={() => openBudget(booking)} />)}
        </div>
      </section>
    </div>
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
  return (
    <section className="wf-admin-section wf-blocks-view">
      <div className="wf-admin-title-row">
        <span className="wf-large-icon"><Icon name="lock" /></span>
        <div><h1>Bloqueios detalhados</h1><p>Visualize e gerencie os dias e horários marcados como indisponíveis na agenda.</p></div>
      </div>
      <div className="wf-blocks-grid">
        <div className="wf-blocks-left">
          <div className="wf-filters-card wf-filters-card--blocks">
            <label>Profissional<input placeholder="Buscar profissional" /></label>
            <label>Data inicial<input type="date" /></label>
            <label>Data final<input type="date" /></label>
            <label>Buscar por observação<input placeholder="Digite termo de busca" /></label>
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
                  <span className="wf-row-actions"><button type="button" onClick={() => setModal('block-admin')}>Editar</button><button type="button" className="wf-danger" onClick={() => notifyUnavailable('Exclusão de bloqueio')}>Excluir</button></span>
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

function AdminHistoryView({ setModal, setContext }: { setModal: (modal: ModalKind) => void; setContext: (context: ModalContext) => void }) {
  const { bookings: historyBookings, isLoading, isError, hasAdminToken } = useAdminHistoryData();
  const [selected, setSelected] = useState<BookingItem | undefined>(historyBookings[0]);
  useEffect(() => {
    if (!selected && historyBookings[0]) setSelected(historyBookings[0]);
  }, [historyBookings, selected]);
  const openBudget = (booking: BookingItem) => { setContext({ booking }); setModal('budget-admin'); };

  return (
    <section className="wf-admin-section wf-history-view">
      <div className="wf-admin-title-row">
        <span className="wf-large-icon wf-large-icon--orange"><Icon name="calendar" /></span>
        <div><h1>Histórico</h1><p>Consulte os agendamentos já concluídos e as informações registradas pelos clientes.</p></div>
      </div>
      <div className="wf-filters-card wf-filters-card--history">
        <label>Período<input type="date" /></label>
        <label>Cliente<input placeholder="Buscar cliente" /></label>
        <label>Prestador<input placeholder="Buscar prestador" /></label>
        <label>Busca<input placeholder="Buscar por cliente, prestador ou código" /></label>
      </div>
      <div className="wf-history-grid">
        <div className="wf-table-card wf-history-list">
          <h2>Agendamentos concluídos</h2>
          {isLoading ? <EmptyState title="Carregando histórico" text="Buscando dados reais do backend." /> : null}
          {isError || !hasAdminToken ? <EmptyState title="Histórico não disponível" text="Faça login administrativo para carregar o histórico real." /> : null}
          {!isLoading && !isError && historyBookings.length === 0 ? <EmptyState title="Nenhum concluído encontrado" text="Não há agendamentos concluídos retornados pela API." /> : null}
          {historyBookings.map((booking) => (
            <article className="wf-history-item" key={booking.id}>
              <span className="wf-ok-dot">✓</span>
              <div><strong>{ptDate.format(toLocalDate(booking.date))}</strong><small>{booking.time}</small></div>
              <div><strong>{booking.provider || 'A definir'}</strong><small>{booking.service}</small></div>
              <Avatar name={booking.name} large />
              <div><strong>{booking.name}</strong><small>{booking.id}</small></div>
              <button type="button" onClick={() => { setSelected(booking); setContext({ booking }); setModal('client-details'); }}>Ver detalhes ›</button>
              <button type="button" onClick={() => openBudget(booking)}>Orcamento</button>
            </article>
          ))}
        </div>
        <aside className="wf-history-detail">
          {selected ? (
            <>
              <Avatar name={selected.name} huge />
              <h2>{selected.name}</h2>
              <p>{selected.service}</p>
              <Badge color="green"><Icon name="check" /> Atendimento concluído</Badge>
              <dl>
                <dt><Icon name="calendar" /> Agendamento</dt><dd>{selected.id}</dd>
                <dt><Icon name="user" /> Cliente</dt><dd>{selected.name}</dd>
                <dt><Icon name="phone" /> Telefone</dt><dd>{formatPhoneForDisplay(selected.phone) || 'Não informado'}</dd>
                <dt><Icon name="mail" /> Ações</dt><dd><button type="button" onClick={() => { setContext({ booking: selected }); setModal('email-admin'); }}>Enviar e-mail</button> <button type="button" onClick={() => openBudget(selected)}>Orcamento</button></dd>
                <dt><Icon name="map" /> Endereço</dt><dd>{selected.address}</dd>
                <dt><Icon name="chat" /> Serviço</dt><dd>{selected.service}</dd>
              </dl>
            </>
          ) : <EmptyState title="Selecione um atendimento" text="Os detalhes aparecerão aqui quando houver histórico real." />}
        </aside>
      </div>
    </section>
  );
}

function formatFinanceMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  if (!year || !monthNumber) return month;
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, monthNumber - 1, 1));
}

function formatFinanceDate(date: string): string {
  return ptDate.format(toLocalDate(date));
}

function formatTransactionAmount(transaction: FinancialTransaction): string {
  const prefix = transaction.type === 'EXIT' ? '-' : '';
  return `${prefix}${formatCurrency(transaction.amount)}`;
}

function AdminFinanceView({
  dashboard,
  hasImportedOfx,
  setModal,
}: {
  dashboard: FinancialDashboardDTO;
  hasImportedOfx: boolean;
  setModal: (modal: ModalKind) => void;
}) {
  const monthLabel = formatFinanceMonth(dashboard.month);
  const transactionRows = dashboard.transactions.slice(0, 8);
  const dataHint = hasImportedOfx ? `Importado de OFX - ${monthLabel}` : 'Mock inicial ate o upload de OFX';

  return (
    <section className="wf-admin-section wf-finance-view">
      <div className="wf-finance-title-row">
        <div><h1>Extrato / Financeiro</h1><p>Acompanhe entradas, saídas e o desempenho financeiro do seu negócio. <strong>{monthLabel}</strong></p></div>
        <div><button type="button" onClick={() => setModal('ofx-admin')}><Icon name="upload" /> Upload de arquivo OFX</button><button type="button" onClick={() => notifyUnavailable('Exportação financeira')}><Icon name="download" /> Exportar</button><button type="button" className="wf-orange-btn" onClick={() => notifyUnavailable('Solicitação PIX')}><Icon name="money" /> Solicitar pagamento (PIX)</button></div>
      </div>
      <div className="wf-metric-grid">
        <Metric icon="money" title="Total do mês" value={formatCurrency(dashboard.totalEntries)} hint={dataHint} color="blue" />
        <Metric icon="money" title="Saldo disponível" value={formatCurrency(dashboard.availableBalance)} hint={dashboard.availableBalance >= 0 ? 'Saldo acumulado positivo' : 'Saldo acumulado negativo'} color={dashboard.availableBalance >= 0 ? 'green' : 'red'} />
        <Metric icon="upload" title="Entradas" value={formatCurrency(dashboard.totalEntries)} hint="Valores positivos do OFX" color="green" />
        <Metric icon="download" title="Saídas" value={formatCurrency(dashboard.totalExits)} hint="Valores negativos do OFX" color="red" />
        <Metric icon="calendar" title="Total de agendamentos" value={`${dashboard.totalAppointments}`} hint="Códigos AGD/SG encontrados" color="purple" />
      </div>
      <div className="wf-finance-grid">
        <div className="wf-chart-card">
          <h2>Resumo financeiro</h2>
          <FinancialChart data={dashboard.chart} />
        </div>
        <aside className="wf-finance-side">
          <div className="wf-side-card"><h2>Ações financeiras</h2><div className="wf-finance-actions"><button type="button" onClick={() => notifyUnavailable('Registrar entrada')}>Registrar entrada</button><button type="button" onClick={() => notifyUnavailable('Registrar saída')}>Registrar saída</button><button type="button" onClick={() => notifyUnavailable('Transferência')}>Transferência</button><button type="button" onClick={() => notifyUnavailable('Categorias')}>Categorias</button></div></div>
          <button type="button" className="wf-side-card wf-ofx-drop" onClick={() => setModal('ofx-admin')}><h2>Importar extrato (OFX)</h2><p><Icon name="upload" /> Arraste e solte o arquivo OFX aqui ou clique para selecionar</p><small>Máx. 10MB • Arquivos OFX</small></button>
          <div className="wf-side-card wf-disabled"><h2>InterPJ (opcional)</h2><p>Integração contábil via InterPJ.</p><Badge color="purple">Em breve</Badge></div>
        </aside>
        <div className="wf-table-card wf-finance-table">
          <h2>Últimas movimentações <button type="button" onClick={() => notifyUnavailable('Listagem completa de movimentações')}>Ver todas as movimentações →</button></h2>
          <div className="wf-money-table">
            {transactionRows.length === 0 ? <EmptyState title="Nenhuma movimentação" text="Importe um arquivo OFX para preencher a tabela." /> : null}
            {transactionRows.map((transaction) => (
              <p key={`${transaction.date}-${transaction.description}-${transaction.amount}`}>
                <span>{formatFinanceDate(transaction.date)}</span>
                <span>{transaction.description}</span>
                <b className={transaction.type === 'ENTRY' ? 'positive' : 'negative'}>{transaction.type === 'ENTRY' ? 'Entrada' : 'Saída'}</b>
                <span>{transaction.category ?? 'Sem categoria'}</span>
                <a>{transaction.appointmentCode ?? '—'}</a>
                <strong className={transaction.type === 'ENTRY' ? 'positive' : 'negative'}>{formatTransactionAmount(transaction)}</strong>
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ icon, title, value, hint, color }: { icon: string; title: string; value: string; hint: string; color: Accent }) {
  return <article className={cx('wf-metric', `wf-metric--${color}`)}><Icon name={icon} /><span><small>{title}</small><strong>{value}</strong><em>{hint}</em></span></article>;
}

export function AdminBookingDetails() {
  const [modal, setModal] = useState<ModalKind>(null);
  const [context, setContext] = useState<ModalContext>({});
  const { eventId } = useParams();
  const { bookings, isLoading, hasAdminToken } = useAdminBookingsData();
  const booking = useMemo(() => bookings.find((item) => item.id === eventId) ?? bookings[0], [bookings, eventId]);
  const owner = isStoredAdminOwner();

  useEffect(() => {
    if (booking) setContext({ booking });
  }, [booking]);

  const openBudget = () => {
    setContext(booking ? { booking } : {});
    setModal('budget-admin');
  };

  return (
    <div className="wf-page wf-admin-details-page">
      <AdminHeader active="agendamentos" onCreate={() => setModal('create-client')} onBudget={openBudget} />
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
              <div className="wf-detail-actions"><button type="button" onClick={() => setModal('edit-admin')}><Icon name="edit" /> Editar</button><button type="button" className="wf-danger" onClick={() => notifyUnavailable('Cancelamento')}><Icon name="delete" /> Cancelar</button><button type="button" onClick={() => setModal('edit-admin')}><Icon name="calendar" /> Reagendar</button>{owner ? <button type="button" onClick={() => setModal('assign-provider')}><Icon name="user" /> Trocar responsável</button> : null}<button type="button" onClick={openBudget}><Icon name="budget" /> Orçamento</button></div>
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
      <WireframeModal modal={modal} context={context} onClose={() => setModal(null)} />
    </div>
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

function WireframeModal({
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
  if (!modal) return null;
  const modalClass = cx(
    'wf-modal',
    modal === 'create-client' && 'wf-modal--create',
    modal === 'confirm-phone' && 'wf-modal--confirm',
    modal === 'client-details' && 'wf-modal--details',
    modal === 'contact' && 'wf-modal--contact',
    modal === 'notifications' && 'wf-modal--notifications',
    modal === 'block-admin' && 'wf-modal--admin-block',
    modal === 'assign-provider' && 'wf-modal--assign',
    modal === 'edit-admin' && 'wf-modal--create',
    modal === 'email-admin' && 'wf-modal--email',
    modal === 'ofx-admin' && 'wf-modal--ofx',
    modal === 'budget-admin' && 'wf-modal--budget',
  );

  return (
    <div className="wf-modal-backdrop" role="presentation" data-modal={modal}>
      <div className={modalClass} role="dialog" aria-modal="true">
        <span className="wf-modal-mobile-handle" aria-hidden="true" />
        <button type="button" className="wf-modal-close" onClick={onClose} aria-label="Fechar modal"><Icon name="close" /></button>
        {modal === 'create-client' ? <CreateBookingModal onClose={onClose} /> : null}
        {modal === 'confirm-phone' ? <ConfirmPhoneModal onClose={onClose} /> : null}
        {modal === 'client-details' ? <ClientDetailsModal booking={context.booking} onClose={onClose} /> : null}
        {modal === 'contact' ? <ContactModal onClose={onClose} /> : null}
        {modal === 'notifications' ? <NotificationsModal onClose={onClose} /> : null}
        {modal === 'block-admin' ? <AdminBlockModal onClose={onClose} /> : null}
        {modal === 'assign-provider' ? <AssignProviderModal booking={context.booking} onClose={onClose} /> : null}
        {modal === 'edit-admin' ? <EditAdminBookingModal booking={context.booking} onClose={onClose} /> : null}
        {modal === 'email-admin' ? <EmailAdminModal booking={context.booking} onClose={onClose} /> : null}
        {modal === 'ofx-admin' ? <OfxModal onClose={onClose} onImported={onOfxImported} /> : null}
        {modal === 'budget-admin' ? <BudgetModal booking={context.booking} onClose={onClose} /> : null}
      </div>
    </div>
  );
}

function ModalTitle({ icon, title, text, compact = false }: { icon: string; title: string; text: string; compact?: boolean }) {
  return (
    <header className={cx('wf-modal-title', `wf-modal-title--${icon.replace(/[^a-zA-Z0-9-]/g, '-')}`, compact && 'wf-modal-title--compact')}>
      <span><Icon name={icon} /></span>
      <div><h2>{title}</h2><p>{text}</p></div>
    </header>
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
  onChange?: (value: string) => void;
}) {
  return (
    <label className={cx('wf-modal-field', className)}>
      <span className="wf-field-label">{label}{required ? <em>*</em> : null}</span>
      <span className="wf-input-shell">
        <Icon name={icon} />
        <input type={type} value={value} defaultValue={value === undefined ? defaultValue : undefined} placeholder={placeholder} onChange={(event) => onChange?.(event.target.value)} />
      </span>
    </label>
  );
}

function buildNextDateOptions() {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      value: toIsoDate(date),
      label: `${ptWeekday.format(date).replace('.', '')}\n${date.getDate()}\n${ptMonth.format(date).replace('.', '')}`,
    };
  });
}

const modalTimeOptions = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

function CreateBookingModal({ onClose }: { onClose: () => void }) {
  const dateOptions = useMemo(buildNextDateOptions, []);
  const [selectedDate, setSelectedDate] = useState(dateOptions[0]?.value ?? '');
  const [selectedTime, setSelectedTime] = useState('');
  return (
    <>
      <ModalTitle icon="calendar-modal-blue" title="Criar agendamento" text="Preencha seus dados e informe onde e quando o serviço será realizado." />
      <div className="wf-create-booking-form">
        <ModalField label="Nome completo" icon="user" placeholder="Digite seu nome completo" required />
        <ModalField label="Telefone" icon="phone" placeholder="(11) 99999-9999" required />
        <ModalField label="E-mail" icon="mail" placeholder="seu@email.com" required />
        <ModalField label="Cidade" icon="building" placeholder="Digite sua cidade" required />
        <label className="wf-modal-field wf-span-2"> <span className="wf-field-label">Endereço<em>*</em></span>
          <div className="wf-input-action wf-input-action--with-icon"><Icon name="map" /><input placeholder="Digite seu endereço" /><button type="button" onClick={() => notifyUnavailable('Busca de endereço')}>Buscar endereço</button></div>
        </label>
        <ModalField className="wf-span-2" label="Complemento" icon="edit" placeholder="Ex.: Apto 101, Bloco B, Fundos" />
        <div className="wf-span-2 wf-choice-block">
          <strong>Escolha a data</strong>
          <div className="wf-date-options wf-date-options--scroll">{dateOptions.map((date) => <button className={selectedDate === date.value ? 'is-active' : ''} type="button" key={date.value} onClick={() => setSelectedDate(date.value)}>{date.label}</button>)}</div>
        </div>
        <div className="wf-span-2 wf-choice-block">
          <strong>Horários disponíveis</strong>
          <div className="wf-time-options wf-time-options--scroll">{modalTimeOptions.map((time) => <button className={selectedTime === time ? 'is-active' : ''} type="button" key={time} onClick={() => setSelectedTime(time)}>{time}</button>)}</div>
        </div>
        <ModalField label="Ponto de referência" icon="map" placeholder="Ex.: Próximo ao mercado, padaria, etc." />
        <ModalField label="Observações" icon="mail" placeholder="Informações adicionais que possam ajudar." />
      </div>
      <ModalActions primary="Confirmar agendamento" secondary="Cancelar" primaryIcon="arrow-right" onSecondary={onClose} onPrimary={() => notifyUnavailable('Criação de agendamento')} />
    </>
  );
}

function ConfirmPhoneModal({ onClose }: { onClose: () => void }) {
  const stored = getStoredPhoneVerification();
  return (
    <div className="wf-confirm-layout">
      <aside className="wf-confirm-visual-panel">
        <LogoMark compact />
        <div className="wf-confirm-illustration"><Icon name="confirm-phone-security" /></div>
        <div className="wf-confirm-benefits"><p><Icon name="shield-check" /> Seguro e confiável</p><p><Icon name="lock-green" /> Validação por SMS</p></div>
      </aside>
      <section className="wf-confirm-form-panel">
        <ModalTitle icon="shield-check" title="Confirme seu número" text="Precisamos confirmar seu telefone para garantir a segurança da sua conta e liberar seus agendamentos." compact />
        <ModalField className="wf-full-label" label="Nome completo" icon="user" placeholder="Digite seu nome completo" />
        <ModalField className="wf-full-label" label="Telefone" icon="phone" defaultValue={stored ? formatPhoneForDisplay(stored.phone) : ''} placeholder="(11) 99999-9999" />
        <div className="wf-code-row"><label>Código de verificação<input placeholder="—" /></label><label><input placeholder="—" /></label><label><input placeholder="—" /></label><button type="button" onClick={() => notifyUnavailable('Envio de código') }><Icon name="mail" /> Enviar código</button></div>
        <ModalActions primary="Confirmar" secondary="Cancelar" primaryIcon="lock-green" onSecondary={onClose} onPrimary={() => notifyUnavailable('Confirmação de telefone')} />
      </section>
    </div>
  );
}

function ClientDetailsModal({ booking, onClose }: { booking?: BookingItem; onClose: () => void }) {
  return (
    <>
      <ModalTitle icon="calendar-blue" title="Detalhes do agendamento" text="Confira as informações do seu agendamento." />
      {booking ? (
        <section className="wf-client-details-modal">
          <article className="wf-modal-section-card wf-modal-section-card--orange">
            <div><strong>Seu agendamento</strong><button type="button" onClick={() => notifyUnavailable('Edição do agendamento')}><Icon name="edit" /> Editar</button></div>
            <dl><dt>Data e horário</dt><dd>{ptDate.format(toLocalDate(booking.date))} às {booking.time}</dd><dt>Cidade</dt><dd>{booking.city || 'Não informada'}</dd><dt>Endereço completo</dt><dd>{booking.address}</dd><dt>Serviço</dt><dd>{booking.service}</dd></dl>
          </article>
          <article className="wf-provider-detail-card">
            <Avatar name={booking.provider || 'Prestador'} large />
            <div><strong>Prestador</strong><p>{booking.provider || 'A definir'}</p><small>Atendimento via WhatsApp</small></div>
            <Badge color="green">{booking.status}</Badge>
          </article>
          <div className="wf-safe-line"><Icon name="shield" /> Telefone validado para seu perfil. Contato verificado para sua segurança.</div>
        </section>
      ) : <EmptyState title="Nenhum agendamento selecionado" text="Abra o modal pelos detalhes de um agendamento real." />}
      <ModalActions primary="Falar no WhatsApp" secondary="Fechar" primaryIcon="whatsapp" onSecondary={onClose} onPrimary={() => openWhatsApp(booking?.phone)} />
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
        <ContactOption icon="contact-whatsapp" title="WhatsApp" text="Fale conosco pelo WhatsApp." color="green" onClick={() => notifyUnavailable('WhatsApp de suporte')} />
        <ContactOption icon="contact-instagram" title="Instagram" text="Envie uma mensagem pelo Instagram." color="purple" onClick={() => notifyUnavailable('Instagram')} />
        <ContactOption icon="contact-phone" title="Telefone" text="Entre em contato pelo nosso telefone." color="blue" onClick={() => notifyUnavailable('Telefone de contato')} />
        <ContactOption icon="contact-email" title="E-mail" text="Envie um e-mail para nossa equipe." color="orange" onClick={() => window.location.href = 'mailto:'} />
      </div>
      <p className="wf-modal-footnote"><Icon name="lock" /> Atendimento rápido, seguro e confiável.</p>
    </>
  );
}

function NotificationsModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <ModalTitle icon="bell-purple" title="Notificações" text="Acompanhe atualizações dos seus agendamentos." />
      <div className="wf-notification-tabs"><button className="is-active" type="button">Todas</button><button type="button">Não lidas</button><button type="button" onClick={() => notifyUnavailable('Marcar notificações como lidas')}>Marcar todas como lidas</button></div>
      <EmptyState title="Nenhuma notificação" text="As notificações reais aparecerão aqui quando existirem no sistema." />
      <ModalActions primary="Fechar" secondary="Preferências de notificações" primaryIcon="check" onPrimary={onClose} onSecondary={() => notifyUnavailable('Preferências de notificações')} />
    </>
  );
}

function AdminBlockModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <ModalTitle icon="calendar-block" title="Bloquear agenda" text="Defina os dias e horários em que você ou sua equipe não estarão disponíveis." />
      <div className="wf-admin-block-modal wf-admin-block-modal--wireframe">
        <section>
          <strong>Selecione os dias para bloquear</strong>
          <MiniMonth />
          <div className="wf-block-legend"><span>Seleção manual</span><button type="button" onClick={() => notifyUnavailable('Limpar seleção')}>Limpar seleção</button></div>
        </section>
        <section className="wf-admin-block-controls">
          <label>Bloquear dia inteiro <input type="checkbox" /></label>
          <strong>Selecione os horários para bloquear</strong>
          <div className="wf-time-options">{modalTimeOptions.map((time) => <button type="button" key={time}>{time}</button>)}</div>
          <label>Motivo / Observação<textarea placeholder="Ex.: treinamento, manutenção, folga etc." /></label>
        </section>
      </div>
      <ModalActions primary="Salvar bloqueio" secondary="Cancelar" primaryIcon="lock-green" onSecondary={onClose} onPrimary={() => notifyUnavailable('Salvar bloqueio')} />
    </>
  );
}

function EditAdminBookingModal({ booking, onClose }: { booking?: BookingItem; onClose: () => void }) {
  const source = booking?.source && 'eventId' in booking.source ? booking.source as ServicoResponse : null;
  const [date, setDate] = useState(booking?.date ?? '');
  const [time, setTime] = useState(booking?.time ?? '');
  const [serviceType, setServiceType] = useState(source?.serviceType || booking?.service || '');
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

function EmailAdminModal({ booking, onClose }: { booking?: BookingItem; onClose: () => void }) {
  return (
    <>
      <ModalTitle icon="mail-blue" title="Enviar e-mail" text="Comunique-se com o cliente de forma rápida e organizada." />
      <div className="wf-email-modal-layout">
        <section className="wf-form-grid wf-form-grid--email">
          <ModalField className="wf-span-2" label="Para" icon="mail" defaultValue={booking?.email ?? ''} placeholder="Digite o e-mail do destinatário" required />
          <ModalField className="wf-span-2" label="Assunto" icon="file-upload" placeholder="Digite o assunto do e-mail" required />
          <label className="wf-span-2">Mensagem <div className="wf-editor-toolbar"><span>Normal</span><b>B</b><i>I</i><u>U</u><span>☷</span><span>🔗</span></div><textarea placeholder="Digite sua mensagem..." /></label>
          <button type="button" className="wf-span-2 wf-attachment-drop" onClick={() => notifyUnavailable('Anexos')}><Icon name="paperclip" /><strong>Arraste arquivos aqui ou toque para selecionar</strong><small>Tamanho máximo 10MB por arquivo. Tipos permitidos: PDF, JPG, PNG, DOC, DOCX.</small></button>
        </section>
        <aside className="wf-email-security"><Icon name="email-illustration" /><p>Sua mensagem será enviada com segurança e confidencialidade. Anexe documentos, imagens ou arquivos relevantes.</p></aside>
      </div>
      <ModalActions primary="Enviar e-mail" secondary="Cancelar" primaryIcon="send" onSecondary={onClose} onPrimary={() => notifyUnavailable('Envio de e-mail')} />
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
      <ModalActions primary="Salvar orçamento" secondary="Cancelar" primaryIcon="budget-orange" onSecondary={onClose} onPrimary={() => { setMessage('Orcamento pronto para exportar.'); }} />
    </>
  );
}

function ModalActions({ primary, secondary, primaryIcon = 'plus', onPrimary, onSecondary }: { primary: string; secondary: string; primaryIcon?: string; onPrimary?: () => void; onSecondary?: () => void }) {
  return <footer className="wf-modal-actions"><button type="button" className="wf-ghost-btn" onClick={onSecondary}>{secondary}</button><button type="button" className="wf-primary-cta wf-primary-cta--modal" onClick={onPrimary}>{primary} <Icon name={primaryIcon} /></button></footer>;
}
