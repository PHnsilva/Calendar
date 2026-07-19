import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/query-keys';
import { getStoredAdminWorkspace } from '../../../lib/storage';
import { toBusinessDateTimeParts } from '../../../lib/dates';
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
  const start = toBusinessDateTimeParts(servico.start);
  const end = toBusinessDateTimeParts(servico.end);

  return {
    id: servico.eventId,
    title: customerName || servico.serviceType,
    date: start.date,
    startTime: start.time,
    endTime: end.time,
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
    queryFn: ({ signal }) => getAdminBookings(filters, signal),
    enabled,
    retry: 0,
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  return {
    ...query,
    calendarEvents: (query.data ?? []).map(mapServicoToCalendarEvent),
  };
}
