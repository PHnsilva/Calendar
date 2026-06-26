import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/query-keys';
import { getStoredAdminWorkspace } from '../../../lib/storage';
import type { ServicoResponse } from '../../../types/api';
import type { CalendarEvent } from '../../calendar/types';
import { getAdminBookings } from '../api/get-admin-bookings';
import type { AdminFilters } from '../types';

function buildFiltersKey(filters: AdminFilters) {
  return JSON.stringify({
    filters: filters ?? {},
    workspace: getStoredAdminWorkspace() ?? null,
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

export function useAdminBookings(filters: AdminFilters = {}, enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.adminBookings(buildFiltersKey(filters)),
    queryFn: () => getAdminBookings(filters),
    enabled,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: enabled ? 20_000 : false,
  });

  return {
    ...query,
    calendarEvents: (query.data ?? []).map(mapServicoToCalendarEvent),
  };
}
