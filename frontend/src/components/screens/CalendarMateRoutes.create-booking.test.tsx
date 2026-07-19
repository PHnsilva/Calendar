// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { ServicoCreateResponse } from '../../types/api';

vi.setConfig({ testTimeout: 30000 });

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  useAvailableMonthDates: vi.fn(),
  useAvailableSlots: vi.fn(),
  usePublicBootstrap: vi.fn(),
}));

vi.mock('../../features/bookings/hooks/useCreateBooking', () => ({
  useCreateBooking: () => ({ isPending: false, mutateAsync: mocks.mutateAsync }),
}));
vi.mock('../../features/calendar/hooks/useAvailableMonthDates', () => ({
  useAvailableMonthDates: mocks.useAvailableMonthDates,
}));
vi.mock('../../features/calendar/hooks/useAvailableSlots', () => ({
  useAvailableSlots: mocks.useAvailableSlots,
}));
vi.mock('../../features/public-config/hooks/usePublicBootstrap', () => ({
  usePublicBootstrap: mocks.usePublicBootstrap,
}));
vi.mock('../../lib/navigation-history', () => ({
  useDoubleBackToLeavePage: () => undefined,
  useModalBrowserBack: (_open: boolean, _key: string, onClose: () => void) => onClose,
}));
vi.mock('../../features/booking-form/components/AddressAutocompleteField', () => ({
  default: ({
    value,
    onChange,
    onSelectSuggestion,
  }: {
    value: string;
    onChange: (value: string) => void;
    onSelectSuggestion: (suggestion: Record<string, unknown>) => void;
  }) => (
    <>
      <input
        aria-label="Endereco do atendimento"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        onClick={() => onSelectSuggestion({
          id: 'address-1',
          label: 'Rua do Teste, 10 - Centro',
          placeId: 'address-1',
          formatted: 'Rua do Teste, 10 - Centro, Itabirito - MG',
          latitude: -20.25,
          longitude: -43.8,
          lat: -20.25,
          lon: -43.8,
          addressLine1: 'Rua do Teste, 10',
          addressLine2: 'Centro',
          street: 'Rua do Teste',
          houseNumber: '10',
          neighborhood: 'Centro',
          city: 'Itabirito',
          state: 'MG',
          stateCode: 'MG',
          postcode: '35450-000',
        })}
      >
        Selecionar endereco de teste
      </button>
    </>
  ),
}));

const createResponse: ServicoCreateResponse = {
  servico: {
    eventId: 'created-event-1',
    eventLink: '',
    serviceType: 'Visita tecnica',
    serviceNotes: 'Trocar a tomada da sala.',
    start: '2026-07-20T09:00:00-03:00',
    end: '2026-07-20T10:00:00-03:00',
    clientFirstName: 'Cliente',
    clientLastName: 'Teste',
    clientEmail: 'cliente@example.test',
    clientPhone: '31954115323',
    clientCep: '',
    clientStreet: 'Rua do Teste',
    clientNeighborhood: 'Centro',
    clientNumber: '10',
    clientCity: 'Itabirito',
    clientState: 'MG',
    clientAddressLine: 'Rua do Teste, 10 - Centro',
    status: 'CONFIRMED',
  },
  manageToken: 'manage-created-event-1',
  verificationId: '',
  expiresInSeconds: 0,
  resendAfterSeconds: 0,
  pendingExpiresAt: '2026-07-20T09:00:00-03:00',
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

async function renderCreateModal(audience: 'client' | 'admin') {
  const { CalendarMateModal } = await import('./CalendarMateRoutes');
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onClose = vi.fn();

  const view = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[audience === 'admin' ? '/admin/dashboard' : '/']}>
        <CalendarMateModal
          modal="create-client"
          bookingAudience={audience}
          onClose={onClose}
        />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { ...view, onClose };
}

function fieldLabels(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('.wf-field-label')).map((label) => label.textContent?.trim() ?? '');
}

function fillValidBooking() {
  fireEvent.change(screen.getByPlaceholderText('Digite seu nome completo'), { target: { value: 'Cliente Teste' } });
  fireEvent.change(screen.getByPlaceholderText('(11) 99999-9999'), { target: { value: '31954115323' } });
  fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { target: { value: 'cliente@example.test' } });
  fireEvent.change(screen.getByLabelText('Endereco do atendimento'), { target: { value: 'Rua do Teste' } });
  fireEvent.click(screen.getByRole('button', { name: 'Selecionar endereco de teste' }));
  const dateButton = document.querySelector<HTMLButtonElement>('.wf-date-options button:not(.wf-date-next-button)');
  if (!dateButton) throw new Error('Expected an available date button');
  fireEvent.click(dateButton);
  fireEvent.click(screen.getByRole('button', { name: '09:00' }));
  fireEvent.change(screen.getByPlaceholderText(/Explique detalhadamente/i), { target: { value: 'Trocar a tomada da sala.' } });
}

beforeEach(() => {
  cleanup();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 6, 18, 12));
  window.localStorage.clear();
  mocks.mutateAsync.mockReset();
  mocks.mutateAsync.mockResolvedValue(createResponse);
  mocks.usePublicBootstrap.mockReset();
  mocks.usePublicBootstrap.mockReturnValue({ data: undefined });
  mocks.useAvailableMonthDates.mockReset();
  mocks.useAvailableMonthDates.mockReturnValue({
    availableDates: ['2026-07-20'],
    error: null,
    hasError: false,
    isLoading: false,
    monthDates: ['2026-07-20'],
    refetch: vi.fn(),
  });
  mocks.useAvailableSlots.mockReset();
  mocks.useAvailableSlots.mockReturnValue({
    data: [{ date: '2026-07-20', startTime: '09:00', endTime: '10:00', available: true, label: '09:00 - 10:00' }],
    error: null,
    isFetching: false,
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('shared client and admin booking creation modal', () => {
  it('uses the same responsive form structure and validation in both entry points', async () => {
    const clientView = await renderCreateModal('client');
    const clientLabels = fieldLabels(clientView.container);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar agendamento' }));
    const clientErrors = Array.from(clientView.container.querySelectorAll('.wf-field-error')).map((node) => node.textContent);
    expect(clientErrors.length).toBeGreaterThan(0);
    expect(clientView.container.querySelector('.wf-create-booking-form--wireframe')).toBeTruthy();
    expect(clientView.container.querySelector('[role="dialog"][aria-label="Criar agendamento"]')).toBeTruthy();

    clientView.unmount();
    const adminView = await renderCreateModal('admin');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar agendamento' }));
    const adminErrors = Array.from(adminView.container.querySelectorAll('.wf-field-error')).map((node) => node.textContent);

    expect(fieldLabels(adminView.container)).toEqual(clientLabels);
    expect(adminErrors).toEqual(clientErrors);
    expect(adminView.container.querySelector('.wf-create-booking-form--wireframe')).toBeTruthy();
    expect(adminView.container.querySelector('[role="dialog"][aria-label="Criar agendamento"]')).toBeTruthy();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it.each([
    { audience: 'client' as const, expectedPath: '/meus-agendamentos', persistsClientData: true },
    { audience: 'admin' as const, expectedPath: '/admin/dashboard', persistsClientData: false },
  ])('submits once for $audience while preserving role-specific post-submit behavior', async ({ audience, expectedPath, persistsClientData }) => {
    const { onClose } = await renderCreateModal(audience);
    fillValidBooking();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar agendamento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar agendamento' }));

    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledTimes(1));
    expect(mocks.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      date: '2026-07-20',
      time: '09:00',
      clientFirstName: 'Cliente',
      clientLastName: 'Teste',
      clientStreet: 'Rua do Teste',
      clientNeighborhood: 'Centro',
      clientNumber: '10',
    }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location').textContent).toBe(expectedPath);
    expect(Boolean(window.localStorage.getItem('calendar.clientProfile'))).toBe(persistsClientData);
    expect(Boolean(window.localStorage.getItem('calendar.manageTokens'))).toBe(persistsClientData);
    expect(Boolean(window.localStorage.getItem('calendar.localEvents'))).toBe(persistsClientData);
  });
});
