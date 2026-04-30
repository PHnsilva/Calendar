import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import '../../app/home-layout.css';
import '../../app/booking-sidebar.css';
import '../../app/calendar-final-pass.css';
import '../../app/home-mobile-dock.css';
import '../../app/home-mobile-sheet.css';
import '../../app/home-mobile-planner.css';
import '../../app/calendar-mobile-compact.css';
import '../../app/admin-selection.css';
import HomeCalendarSection from '../../features/home/components/HomeCalendarSection';
import HomeSidebar from '../../features/home/components/HomeSidebar';
import HomeMobileDock from '../../features/home/components/HomeMobileDock';
import HomeMobileBookingsSheet from '../../features/home/components/HomeMobileBookingsSheet';
import HomeMobileBookingDetailsModal from '../../features/home/components/HomeMobileBookingDetailsModal';
import HomeMobilePlanner from '../../features/home/components/HomeMobilePlanner';
import HomeMobileProfileSheet from '../../features/home/components/HomeMobileProfileSheet';
import BookingFormModal from '../../features/booking-form/components/BookingFormModal';
import BookingStartHintModal from '../../components/ui/BookingStartHintModal';
import { useHomeCalendarView } from '../../features/home/hooks/useHomeCalendarView';
import { useHomeBookingSelection } from '../../app/home-booking-provider';
import { ALLOWED_CITIES } from '../../data/allowed-cities';
import type { CalendarEvent } from '../../features/calendar/types';
import { getLocalCalendarEvents } from '../../lib/storage';
import { useAvailableMonthDates } from '../../features/calendar/hooks/useAvailableMonthDates';
import { useAdminBookings } from '../../features/admin/hooks/useAdminBookings';
import type { ServicoResponse } from '../../types/api';
import type { AdminBlockMode } from '../../features/admin/api/manage-admin-blocks';
import { createAdminBlocks } from '../../features/admin/api/manage-admin-blocks';
import { bulkCancelAdminBookings } from '../../features/admin/api/bulk-cancel-admin-bookings';
import AdminSelectionDock from '../../features/admin/components/AdminSelectionDock';
import AdminSelectionModal from '../../features/admin/components/AdminSelectionModal';

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
  const base = new Date(`${monthStart}T12:00:00`);
  const next = new Date(base.getFullYear(), base.getMonth() + delta, 1);
  return `${next.getFullYear()}-${`${next.getMonth() + 1}`.padStart(2, '0')}-01`;
}

function endOfMonth(monthStart: string): string {
  const reference = toLocalDate(monthStart);
  return toIsoDate(new Date(reference.getFullYear(), reference.getMonth() + 1, 0));
}

function getMonthDates(monthStart: string): string[] {
  const reference = toLocalDate(monthStart);
  const daysInMonth = new Date(reference.getFullYear(), reference.getMonth() + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) =>
    toIsoDate(new Date(reference.getFullYear(), reference.getMonth(), index + 1)),
  );
}

function build4x4UnavailableDates(monthStart: string, anchorDateString: string): string[] {
  const anchorDate = toLocalDate(anchorDateString);

  return getMonthDates(monthStart).filter((dateString) => {
    const currentDate = toLocalDate(dateString);
    const diffInDays = Math.floor((currentDate.getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24));
    const normalized = ((diffInDays % 8) + 8) % 8;
    return normalized >= 4;
  });
}

function buildUnavailableFromAvailability(monthStart: string, availableDates: string[]): string[] {
  const available = new Set(availableDates);
  return getMonthDates(monthStart).filter((date) => !available.has(date));
}

function findNextAvailableDate(startDate: string, unavailableDates: string[], nextAllowedMonth: string): string {
  const blocked = new Set(unavailableDates);
  const limit = toLocalDate(endOfMonth(nextAllowedMonth));
  const cursor = toLocalDate(startDate);

  while (cursor <= limit) {
    const iso = toIsoDate(cursor);
    if (!blocked.has(iso)) return iso;
    cursor.setDate(cursor.getDate() + 1);
  }

  return startDate;
}

const ENABLE_LAYOUT_STRESS_PREVIEW_MOCK = false;

function buildStressPreviewEvents(currentAllowedMonth: string, nextAllowedMonth: string): CalendarEvent[] {
  const current = toLocalDate(currentAllowedMonth);
  const next = toLocalDate(nextAllowedMonth);
  const customerNames = [
    'Ana Beatriz',
    'Carlos M.',
    'Eduardo T.',
    'Fernanda L.',
    'Juliana P.',
    'Lucas V.',
    'Marina C.',
    'Patrícia L.',
    'Roberto S.',
    'Vanessa G.',
  ];

  const cityAddresses: Record<string, string> = {
    'Belo Horizonte': 'Av. Afonso Pena, 1377 - Centro - Belo Horizonte/MG CEP: 30130-008',
    Itabirito: 'Rua Felipe Camarão, 158 - Compl.: casa - Vila Gonçalo - Itabirito/MG CEP: 35450069',
    'Ouro Preto': 'Rua Direita, 210 - Centro - Ouro Preto/MG CEP: 35400-000',
    Moeda: 'Rua das Flores, 85 - Centro - Moeda/MG CEP: 35470-000',
    'Nova Lima': 'Alameda dos Ipês, 420 - Jardim Canadá - Nova Lima/MG CEP: 34007-000',
    Congonhas: 'Rua Barão de Congonhas, 210 - Centro - Congonhas/MG CEP: 36415-000',
    'Rio Acima': 'Rua da Serra, 56 - Centro - Rio Acima/MG CEP: 34300-000',
    Brumadinho: 'Rua da Matriz, 98 - Centro - Brumadinho/MG CEP: 35460-000',
  };

  const plan = [
    { month: 'current', day: 1, times: ['08:00', '09:30'], cities: ['Itabirito', 'Ouro Preto'] },
    { month: 'current', day: 3, times: ['08:00', '10:00', '13:30'], cities: ['Belo Horizonte', 'Itabirito', 'Congonhas'] },
    { month: 'current', day: 5, times: ['09:00', '11:00'], cities: ['Moeda', 'Nova Lima'] },
    { month: 'current', day: 7, times: ['08:30', '14:00'], cities: ['Rio Acima', 'Brumadinho'] },
    { month: 'current', day: 9, times: ['09:00', '12:00', '15:00'], cities: ['Ouro Preto', 'Congonhas', 'Itabirito'] },
    { month: 'current', day: 11, times: ['08:00', '10:00', '13:00', '16:00'], cities: ['Belo Horizonte', 'Nova Lima', 'Rio Acima', 'Moeda'] },
    { month: 'current', day: 14, times: ['09:00', '11:30'], cities: ['Brumadinho', 'Congonhas'] },
    { month: 'current', day: 16, times: ['08:00', '10:30', '14:30'], cities: ['Itabirito', 'Ouro Preto', 'Belo Horizonte'] },
    { month: 'current', day: 18, times: ['09:00'], cities: ['Nova Lima'] },
    { month: 'current', day: 20, times: ['08:00', '09:00', '13:00', '15:30'], cities: ['Moeda', 'Rio Acima', 'Congonhas', 'Brumadinho'] },
    { month: 'current', day: 23, times: ['10:00', '12:30'], cities: ['Belo Horizonte', 'Itabirito'] },
    { month: 'current', day: 25, times: ['08:00', '11:00', '14:00'], cities: ['Ouro Preto', 'Nova Lima', 'Rio Acima'] },
    { month: 'current', day: 27, times: ['09:30', '13:00'], cities: ['Moeda', 'Congonhas'] },
    { month: 'next', day: 2, times: ['08:00', '10:00'], cities: ['Itabirito', 'Belo Horizonte'] },
    { month: 'next', day: 4, times: ['09:00', '11:00', '15:00'], cities: ['Ouro Preto', 'Nova Lima', 'Congonhas'] },
    { month: 'next', day: 6, times: ['08:30', '12:30'], cities: ['Rio Acima', 'Moeda'] },
    { month: 'next', day: 9, times: ['09:00', '14:00'], cities: ['Brumadinho', 'Itabirito'] },
    { month: 'next', day: 12, times: ['08:00', '10:00', '13:00'], cities: ['Belo Horizonte', 'Ouro Preto', 'Nova Lima'] },
  ] as const;

  return plan.flatMap((entry, planIndex) =>
    entry.times.map((startTime, itemIndex) => {
      const monthBase = entry.month === 'next' ? next : current;
      const city = entry.cities[itemIndex] ?? ALLOWED_CITIES[(planIndex + itemIndex) % ALLOWED_CITIES.length];
      const endHour = Number(startTime.slice(0, 2)) + 1;
      const endTime = `${`${endHour}`.padStart(2, '0')}:${startTime.slice(3, 5)}`;
      const date = toIsoDate(new Date(monthBase.getFullYear(), monthBase.getMonth(), entry.day));
      const id = `layout-preview-${entry.month}-${entry.day}-${itemIndex}`;
      const customerName = customerNames[(planIndex + itemIndex) % customerNames.length];
      const serviceLabel = ['Vistoria técnica', 'Instalação', 'Manutenção', 'Visita preventiva'][(planIndex + itemIndex) % 4];

      return {
        id,
        title: `Atendimento ${city}`,
        date,
        startTime,
        endTime,
        city,
        customerName,
        customerAddress: cityAddresses[city] ?? city,
        customerEmail: `preview${planIndex + 1}${itemIndex}@exemplo.com`,
        customerPhone: `(31) 98888-${`${planIndex}${itemIndex}`.padStart(4, '0')}`,
        serviceLabel,
        status: 'booked',
      } satisfies CalendarEvent;
    }),
  );
}

function mergeEvents(events: CalendarEvent[]) {
  const map = new Map<string, CalendarEvent>();
  for (const event of events) map.set(event.id, event);
  return Array.from(map.values()).sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    return byDate !== 0 ? byDate : a.startTime.localeCompare(b.startTime);
  });
}

function mapServicoToCalendarEvent(servico: ServicoResponse): CalendarEvent {
  const customerName = `${servico.clientFirstName} ${servico.clientLastName}`.trim();

  return {
    id: servico.eventId,
    title: customerName || servico.serviceType,
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

type HomePageProps = {
  mode?: 'public' | 'admin';
  adminBookings?: ServicoResponse[];
  onAdminBookingsChange?: Dispatch<SetStateAction<ServicoResponse[]>>;
  adminUsesMockData?: boolean;
};

export default function HomePage({
  mode = 'public',
  adminBookings,
  onAdminBookingsChange,
  adminUsesMockData = false,
}: HomePageProps) {
  const isAdminMode = mode === 'admin';
  const today = new Date();
  const todayIso = toIsoDate(today);
  const currentAllowedMonth = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}-01`;
  const nextAllowedMonth = shiftMonth(currentAllowedMonth, 1);
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  const {
    selectedDate,
    selectedSlot,
    currentMonth,
    isBookingModalOpen,
    setCurrentMonth,
    handleDateSelect,
    clearSelection,
    openBookingModal,
    closeBookingModal,
  } = useHomeCalendarView();

  const {
    quickBookingRequestId,
    openBookingsRequestId,
    openProfileRequestId,
    requestQuickBooking,
    registerCreatedBooking,
  } = useHomeBookingSelection();
  const lastQuickRequestRef = useRef(0);
  const lastOpenSidebarRequestRef = useRef(0);
  const [timelineMonth, setTimelineMonth] = useState(currentAllowedMonth);
  const [isBookingGuideOpen, setIsBookingGuideOpen] = useState(false);
  const [isBookingPickMode, setIsBookingPickMode] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(() => (window.innerWidth > 730 ? !isAdminMode : false));
  const [viewportWidth, setViewportWidth] = useState<number>(() => window.innerWidth);
  const [isMobileBookingsOpen, setIsMobileBookingsOpen] = useState<boolean>(() => window.innerWidth <= 730 && !isAdminMode && getLocalCalendarEvents().some((event) => event.date >= todayIso));
  const [selectedMobileBooking, setSelectedMobileBooking] = useState<CalendarEvent | null>(null);
  const [isMobileProfileOpen, setIsMobileProfileOpen] = useState(false);
  const [mobileAgendaFocusId, setMobileAgendaFocusId] = useState(0);
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>(() =>
    getLocalCalendarEvents().filter((event) => event.date >= todayIso),
  );
  const [adminBlockingEnabled, setAdminBlockingEnabled] = useState(false);
  const [adminSelectedDates, setAdminSelectedDates] = useState<string[]>([]);
  const [adminModalMode, setAdminModalMode] = useState<'block' | 'cancel' | 'view' | null>(null);
  const [adminBlockedDates, setAdminBlockedDates] = useState<string[]>([]);

  const isDesktop = viewportWidth > 730;
  const adminBookingsQuery = useAdminBookings({}, isAdminMode && !adminBookings);
  const currentMonthAvailability = useAvailableMonthDates(currentAllowedMonth, !isAdminMode);
  const nextMonthAvailability = useAvailableMonthDates(nextAllowedMonth, !isAdminMode);

  const previewEvents = useMemo(
    () =>
      ENABLE_LAYOUT_STRESS_PREVIEW_MOCK && !isAdminMode
        ? buildStressPreviewEvents(currentAllowedMonth, nextAllowedMonth)
        : [],
    [currentAllowedMonth, isAdminMode, nextAllowedMonth],
  );

  const effectiveAdminBookings = useMemo(
    () => adminBookings ?? adminBookingsQuery.data ?? [],
    [adminBookings, adminBookingsQuery.data],
  );

  useEffect(() => {
    if (!isAdminMode || viewportWidth <= 730) return;
    if (effectiveAdminBookings.length === 0) {
      setIsSidebarExpanded(false);
    }
  }, [effectiveAdminBookings.length, isAdminMode, viewportWidth]);

  const adminCalendarEvents = useMemo(
    () => effectiveAdminBookings.map(mapServicoToCalendarEvent),
    [effectiveAdminBookings],
  );

  const allEvents = useMemo(
    () => (isAdminMode ? mergeEvents(adminCalendarEvents) : mergeEvents([...previewEvents, ...localEvents])),
    [adminCalendarEvents, isAdminMode, localEvents, previewEvents],
  );


  const allUnavailableDates = useMemo(() => {
    if (isAdminMode) {
      return adminBlockedDates;
    }

    const currentFallback = build4x4UnavailableDates(currentAllowedMonth, todayIso);
    const nextFallback = build4x4UnavailableDates(nextAllowedMonth, todayIso);

    const currentUnavailable = currentMonthAvailability.hasError || currentMonthAvailability.isLoading
      ? currentFallback
      : buildUnavailableFromAvailability(currentAllowedMonth, currentMonthAvailability.availableDates);

    const nextUnavailable = nextMonthAvailability.hasError || nextMonthAvailability.isLoading
      ? nextFallback
      : buildUnavailableFromAvailability(nextAllowedMonth, nextMonthAvailability.availableDates);

    return [...currentUnavailable, ...nextUnavailable];
  }, [
    adminBlockedDates,
    currentAllowedMonth,
    currentMonthAvailability.availableDates,
    currentMonthAvailability.hasError,
    currentMonthAvailability.isLoading,
    isAdminMode,
    nextAllowedMonth,
    nextMonthAvailability.availableDates,
    nextMonthAvailability.hasError,
    nextMonthAvailability.isLoading,
    todayIso,
  ]);

  const quickBookingDefaultDate = useMemo(
    () => findNextAvailableDate(todayIso, allUnavailableDates, nextAllowedMonth),
    [allUnavailableDates, nextAllowedMonth, todayIso],
  );

  const selectedPeriodBookings = useMemo(
    () => effectiveAdminBookings
      .filter((booking) => adminSelectedDates.includes(booking.start.slice(0, 10)))
      .sort((left, right) => left.start.localeCompare(right.start)),
    [adminSelectedDates, effectiveAdminBookings],
  );

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.classList.add('home-scroll-locked');
    body.classList.add('home-scroll-locked');

    return () => {
      html.classList.remove('home-scroll-locked');
      body.classList.remove('home-scroll-locked');
    };
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      setIsSidebarExpanded(true);
      return;
    }
    setIsSidebarExpanded((current) => current && !isBookingPickMode);
  }, [isDesktop, isBookingPickMode]);

  useEffect(() => {
    if (isDesktop) {
      setIsMobileBookingsOpen(false);
      setIsMobileProfileOpen(false);
    }
  }, [isDesktop]);

  useEffect(() => {
    if (openProfileRequestId === 0 || isDesktop) return;
    setIsMobileBookingsOpen(false);
    setIsMobileProfileOpen(true);
  }, [isDesktop, openProfileRequestId]);

  useEffect(() => {
    if (!selectedDate) return;
    const selectedMonth = toMonthStart(selectedDate);
    if (selectedMonth === currentAllowedMonth || selectedMonth === nextAllowedMonth) {
      setTimelineMonth(selectedMonth);
    }
  }, [selectedDate, currentAllowedMonth, nextAllowedMonth]);

  useEffect(() => {
    if (!isAdminMode) return;

    const toggleBlockingMode = () => {
      setAdminBlockingEnabled((current) => {
        const nextValue = !current;
        if (!nextValue) {
          setAdminSelectedDates([]);
          setAdminModalMode(null);
        }
        return nextValue;
      });
    };

    window.addEventListener('admin:blocking-toggle', toggleBlockingMode as EventListener);
    return () => window.removeEventListener('admin:blocking-toggle', toggleBlockingMode as EventListener);
  }, [isAdminMode]);

  useEffect(() => {
    if (isAdminMode) return;
    if (quickBookingRequestId === 0) return;
    if (quickBookingRequestId === lastQuickRequestRef.current) return;
    lastQuickRequestRef.current = quickBookingRequestId;

    clearSelection();
    closeBookingModal();
    setIsBookingPickMode(false);
    setIsBookingGuideOpen(false);
    setIsMobileProfileOpen(false);
    setIsSidebarExpanded(false);
    setIsMobileBookingsOpen(false);
    handleDateSelect(quickBookingDefaultDate);
    setTimelineMonth(toMonthStart(quickBookingDefaultDate));
    window.requestAnimationFrame(() => {
      openBookingModal();
    });
  }, [
    clearSelection,
    closeBookingModal,
    handleDateSelect,
    isAdminMode,
    openBookingModal,
    quickBookingDefaultDate,
    quickBookingRequestId,
  ]);

  useEffect(() => {
    if (openBookingsRequestId === 0) return;
    if (openBookingsRequestId === lastOpenSidebarRequestRef.current) return;
    lastOpenSidebarRequestRef.current = openBookingsRequestId;

    setIsBookingPickMode(false);
    setIsBookingGuideOpen(false);
    setIsMobileProfileOpen(false);

    if (isDesktop) {
      setIsSidebarExpanded(true);
      window.requestAnimationFrame(() => {
        sidebarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
      });
      return;
    }

    if (isAdminMode) {
      setIsMobileBookingsOpen((current) => !current);
      return;
    }

    window.dispatchEvent(new CustomEvent('home-mobile-planner:open-overview'));
    setMobileAgendaFocusId((current) => current + 1);
  }, [isDesktop, openBookingsRequestId]);

  const handleCalendarDateSelect = (date: string, options?: { unavailable?: boolean }) => {
    if (options?.unavailable) return;
    if (isAdminMode && adminBlockingEnabled) return;

    handleDateSelect(date);
    setTimelineMonth(toMonthStart(date));

    if (!isAdminMode && isBookingPickMode) {
      setIsBookingGuideOpen(false);
      setIsBookingPickMode(false);
      setIsSidebarExpanded(true);
      setIsMobileBookingsOpen(false);
      openBookingModal();
      return;
    }

    setIsSidebarExpanded(true);

    if (!isDesktop) {
      if (isAdminMode) {
        setIsMobileBookingsOpen(true);
      } else {
        setMobileAgendaFocusId((current) => current + 1);
      }
    }
  };

  const handleCalendarMonthChange = (month: string) => {
    closeBookingModal();
    setCurrentMonth(month);
    setTimelineMonth(month);
    setAdminSelectedDates([]);

    if (!isBookingPickMode) {
      clearSelection();
      setIsBookingGuideOpen(false);
    }
  };

  const handleTimelineMonthChange = (month: string) => {
    closeBookingModal();
    setTimelineMonth(month);
    setCurrentMonth(month);

    if (!isBookingPickMode) {
      clearSelection();
      setIsBookingGuideOpen(false);
    }
  };

  const handleRailDateSelect = (date: string) => {
    handleDateSelect(date);
    setTimelineMonth(toMonthStart(date));
    setIsSidebarExpanded(true);
  };

  const handleCloseBookingGuide = () => {
    setIsBookingGuideOpen(false);
    setIsBookingPickMode(false);
  };

  const handleBookingCreated = (event: CalendarEvent) => {
    registerCreatedBooking(event);
    setLocalEvents((current) => mergeEvents([...current, event]));
    setTimelineMonth(toMonthStart(event.date));
    handleDateSelect(event.date);
    setIsSidebarExpanded(true);
    if (!isDesktop) {
      if (isAdminMode) {
        setIsMobileBookingsOpen(true);
      } else {
        setMobileAgendaFocusId((current) => current + 1);
      }
    }
  };

  const handleConfirmBlock = async ({ mode: blockMode, entries }: { mode: AdminBlockMode; entries: { date: string; times?: string[] }[] }) => {
    try {
      await createAdminBlocks({ entries, mode: blockMode });
    } catch (error) {
      console.warn('Falha ao sincronizar bloqueios com o backend.', error);
    }

    if (blockMode === 'full-day') {
      setAdminBlockedDates((current) => Array.from(new Set([...current, ...entries.map((entry) => entry.date)])).sort());
    }

    setAdminModalMode(null);
    setAdminSelectedDates([]);
  };

  const handleConfirmCancel = async (bookingIds: string[]) => {
    if (bookingIds.length === 0) return;

    try {
      await bulkCancelAdminBookings({ eventIds: bookingIds });
    } catch (error) {
      if (!adminUsesMockData) {
        console.warn('Falha ao cancelar no backend. Aplicando atualização visual local.', error);
      }
    }

    onAdminBookingsChange?.((current) => current.filter((booking) => !bookingIds.includes(booking.eventId)));
    setAdminModalMode(null);
    setAdminSelectedDates([]);
  };

  return (
    <div className="home-page home-page--sidebar-layout">
      <div
        className={[
          'home-grid',
          isDesktop ? 'home-grid--desktop' : 'home-grid--mobile',
          isDesktop && isSidebarExpanded ? 'home-grid--sidebar-open' : '',
          isDesktop && !isSidebarExpanded ? 'home-grid--sidebar-collapsed' : '',
          !isAdminMode && isBookingPickMode ? 'home-grid--pick-mode' : '',
        ].filter(Boolean).join(' ')}
      >
        <div className="home-calendar-stack home-calendar-stack--shell">
          {!isDesktop && !isAdminMode ? (
            <HomeMobilePlanner
              selectedDate={selectedDate}
              currentMonth={currentMonth}
              currentAllowedMonth={currentAllowedMonth}
              nextAllowedMonth={nextAllowedMonth}
              events={allEvents}
              unavailableDates={allUnavailableDates}
              onDateSelect={handleCalendarDateSelect}
              onMonthChange={handleCalendarMonthChange}
              onEventSelect={setSelectedMobileBooking}
              agendaFocusRequestId={mobileAgendaFocusId}
            />
          ) : (
            <HomeCalendarSection
              selectedDate={selectedDate}
              currentMonth={currentMonth}
              currentAllowedMonth={currentAllowedMonth}
              nextAllowedMonth={nextAllowedMonth}
              events={allEvents}
              unavailableDates={allUnavailableDates}
              bookingPickMode={!isAdminMode && isBookingPickMode}
              compactMode={!isDesktop}
              showMonthPreview={isDesktop}
              onDateSelect={handleCalendarDateSelect}
              onMonthChange={handleCalendarMonthChange}
              adminSelectionEnabled={isAdminMode && adminBlockingEnabled}
              adminSelectedDates={adminSelectedDates}
              onAdminSelectedDatesChange={setAdminSelectedDates}
            />
          )}
        </div>

        {isDesktop ? (
          <div ref={sidebarRef} className="home-sidebar-anchor">
            <HomeSidebar
              selectedDate={selectedDate}
              events={allEvents}
              activeMonth={timelineMonth}
              currentAllowedMonth={currentAllowedMonth}
              nextAllowedMonth={nextAllowedMonth}
              onChangeTimelineMonth={handleTimelineMonthChange}
              onQuickBooking={() => {
                if (isAdminMode) return;
                clearSelection();
                requestQuickBooking();
              }}
              onToggleExpanded={() => setIsSidebarExpanded((current) => !current)}
              onSelectRailDate={handleRailDateSelect}
              isExpanded={isSidebarExpanded}
              isDesktop={isDesktop}
              isAdminMode={isAdminMode}
            />
          </div>
        ) : null}
      </div>

      {!isDesktop ? (
        <>
          {isAdminMode ? (
            <HomeMobileBookingsSheet
              open={isMobileBookingsOpen}
              selectedDate={selectedDate}
              events={allEvents}
              activeMonth={timelineMonth}
              currentAllowedMonth={currentAllowedMonth}
              nextAllowedMonth={nextAllowedMonth}
              onClose={() => setIsMobileBookingsOpen(false)}
              onChangeTimelineMonth={handleTimelineMonthChange}
              isAdminMode={isAdminMode}
            />
          ) : null}

          <HomeMobileProfileSheet
            open={isMobileProfileOpen}
            onClose={() => setIsMobileProfileOpen(false)}
          />

          <HomeMobileDock
            onQuickBooking={() => {
              if (isAdminMode) return;
              clearSelection();
              requestQuickBooking();
            }}
            onOpenBookings={() => {
              if (isAdminMode) {
                setIsMobileBookingsOpen((current) => !current);
                return;
              }
              setMobileAgendaFocusId((current) => current + 1);
            }}
            isBookingsOpen={isAdminMode ? isMobileBookingsOpen : true}
            showQuickBooking={!isAdminMode}
            onOpenProfile={() => {
              setIsMobileBookingsOpen(false);
              setIsMobileProfileOpen(true);
            }}
          />
        </>
      ) : null}

      {isAdminMode && adminBlockingEnabled ? (
        <AdminSelectionDock
          selectedCount={adminSelectedDates.length}
          onBlock={() => setAdminModalMode('block')}
          onCancelBookings={() => setAdminModalMode('cancel')}
          onViewBookings={() => setAdminModalMode('view')}
          onClear={() => setAdminSelectedDates([])}
        />
      ) : null}

      <AdminSelectionModal
        open={Boolean(isAdminMode && adminModalMode)}
        mode={adminModalMode}
        selectedDates={adminSelectedDates}
        bookings={selectedPeriodBookings}
        onClose={() => setAdminModalMode(null)}
        onConfirmBlock={handleConfirmBlock}
        onConfirmCancel={handleConfirmCancel}
        onDeleteBlock={() => {}}
      />

      {!isAdminMode ? <BookingStartHintModal open={isBookingGuideOpen} onClose={handleCloseBookingGuide} /> : null}

      {!isAdminMode ? (
        <BookingFormModal
          open={isBookingModalOpen}
          selectedDate={selectedDate || todayIso}
          selectedSlot={selectedSlot}
          events={allEvents}
          unavailableDates={allUnavailableDates}
          onClose={closeBookingModal}
          onBookingCreated={handleBookingCreated}
        />
      ) : null}

      {!isAdminMode ? (
        <HomeMobileBookingDetailsModal
          open={Boolean(selectedMobileBooking)}
          event={selectedMobileBooking}
          onClose={() => setSelectedMobileBooking(null)}
        />
      ) : null}
    </div>
  );
}
