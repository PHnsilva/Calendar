// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { ServicoCreateResponse } from '../../types/api';
import type { CreateBookingPrefill } from '../../features/appointments/model/booking-history';

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
    serviceType: 'Eletrica',
    serviceNotes: 'Eletrica',
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

const bootstrapData = {
  services: ['Elétrica', 'Hidráulica'],
  schedule: { cycleStart: '2026-05-16', workStart: '08:00', workEnd: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
  booking: { slotMinutes: 60, maxFutureMonthsAhead: 1 },
  serviceArea: { allowedCities: ['Itabirito'], allowedStates: ['MG'], durationByCity: { Itabirito: 60 } },
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

async function renderCreateModal(audience: 'client' | 'admin', createPrefill?: CreateBookingPrefill) {
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
          context={{ createPrefill }}
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
  fireEvent.change(screen.getByRole('combobox', { name: /Servi/ }), { target: { value: 'Elétrica' } });
  fireEvent.change(screen.getByLabelText('Observações adicionais (opcional)'), { target: { value: 'Utilize a entrada lateral, por favor.' } });
}

beforeEach(() => {
  cleanup();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 6, 18, 12));
  window.localStorage.clear();
  mocks.mutateAsync.mockReset();
  mocks.mutateAsync.mockResolvedValue(createResponse);
  mocks.usePublicBootstrap.mockReset();
  mocks.usePublicBootstrap.mockReturnValue({
    data: bootstrapData,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
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
    const notes = screen.getByLabelText('Observações adicionais (opcional)');
    expect(notes.tagName).toBe('TEXTAREA');
    expect(notes.getAttribute('placeholder')).toBe('Adicione informações úteis para a realização do serviço.');
    expect(notes.closest('.wf-create-field--notes')).toBeTruthy();
    expect(notes.closest('.wf-create-field--complement')).toBeNull();
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

    expect(Array.from(document.querySelectorAll('.wf-field-error')).map((node) => node.textContent)).toEqual([]);

    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledTimes(1));
    expect(mocks.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      serviceType: 'Elétrica',
      date: '2026-07-20',
      time: '09:00',
      clientFirstName: 'Cliente',
      clientLastName: 'Teste',
      clientStreet: 'Rua do Teste',
      clientNeighborhood: 'Centro',
      clientNumber: '10',
      clientCep: '35450000',
      clientComplement: undefined,
      serviceNotes: 'Utilize a entrada lateral, por favor.',
    }));

    if (audience === 'client') {
      fireEvent.click(await screen.findByRole('button', { name: 'Ver meus agendamentos' }));
    } else {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(700);
      });
    }

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location').textContent).toBe(expectedPath);
    expect(Boolean(window.localStorage.getItem('calendar.clientProfile'))).toBe(persistsClientData);
    expect(Boolean(window.localStorage.getItem('calendar.manageTokens'))).toBe(persistsClientData);
    expect(Boolean(window.localStorage.getItem('calendar.localEvents'))).toBe(persistsClientData);
  });

  it('renders service loading, empty, and error states from the shared API catalog', async () => {
    const refetch = vi.fn();
    mocks.usePublicBootstrap.mockReturnValueOnce({ data: undefined, isLoading: true, isError: false, refetch });
    const loadingView = await renderCreateModal('client');
    expect(screen.getByRole('combobox', { name: /Servi/ }).textContent).toContain('Carregando');
    expect((screen.getByRole('combobox', { name: /Servi/ }) as HTMLSelectElement).disabled).toBe(true);
    loadingView.unmount();

    mocks.usePublicBootstrap.mockReturnValueOnce({ data: { ...bootstrapData, services: [] }, isLoading: false, isError: false, refetch });
    const emptyView = await renderCreateModal('admin');
    expect(screen.getByText(/Nenhum servi.*dispon.vel/i)).toBeTruthy();
    emptyView.unmount();

    mocks.usePublicBootstrap.mockReturnValueOnce({ data: undefined, isLoading: false, isError: true, refetch });
    await renderCreateModal('client');
    expect(screen.getByText(/N.o foi poss.vel carregar os servi/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('starts a fresh validated booking from history with only service, client, and address prefilled', async () => {
    await renderCreateModal('client', {
      serviceType: 'Elétrica',
      client: { fullName: 'Maria Souza', phone: '31988888888', email: 'maria@example.test' },
      address: {
        postalCode: '35450000',
        street: 'Rua Um',
        neighborhood: 'Centro',
        number: '10',
        complement: 'Casa',
        city: 'Itabirito',
        state: 'MG',
        latitude: -20.25,
        longitude: -43.8,
      },
    });

    expect((screen.getByPlaceholderText('Digite seu nome completo') as HTMLInputElement).value).toBe('Maria Souza');
    expect((screen.getByPlaceholderText('(11) 99999-9999') as HTMLInputElement).value).toBe('(31) 98888-8888');
    expect((screen.getByPlaceholderText('seu@email.com') as HTMLInputElement).value).toBe('maria@example.test');
    expect((screen.getByLabelText('Endereco do atendimento') as HTMLInputElement).value).toBe('Rua Um, Centro');
    expect((screen.getByPlaceholderText('123 ou S/N') as HTMLInputElement).value).toBe('10');
    expect((screen.getByRole('combobox', { name: /Servi/ }) as HTMLSelectElement).value).toBe('Elétrica');
    expect(document.querySelector('.wf-date-options .is-active')).toBeNull();
    expect(document.querySelector('.wf-time-options .is-active')).toBeNull();

    const dateButton = document.querySelector<HTMLButtonElement>('.wf-date-options button:not(.wf-date-next-button)');
    if (!dateButton) throw new Error('Expected an available date button');
    fireEvent.click(dateButton);
    fireEvent.click(screen.getByRole('button', { name: '09:00' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar agendamento' }));

    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledTimes(1));
    expect(mocks.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      serviceType: 'Elétrica',
      date: '2026-07-20',
      time: '09:00',
      clientFirstName: 'Maria',
      clientLastName: 'Souza',
      clientCep: '35450000',
      clientStreet: 'Rua Um',
      clientNeighborhood: 'Centro',
      clientNumber: '10',
      clientComplement: 'Casa',
      clientLatitude: -20.25,
      clientLongitude: -43.8,
    }));
  });

  it('keeps actions outside the scrolling form and closes only from the real overlay', async () => {
    const { container, onClose } = await renderCreateModal('client');
    const dialog = screen.getByRole('dialog', { name: 'Criar agendamento' });
    const scrollBody = container.querySelector('.wf-create-booking-modal__scroll');
    const actions = container.querySelector('.wf-modal-actions');
    expect(scrollBody).toBeTruthy();
    expect(actions).toBeTruthy();
    expect(scrollBody?.contains(actions)).toBe(false);

    fireEvent.mouseDown(dialog);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(dialog.parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('prevents Escape, close button, and overlay dismissal during submission', async () => {
    let resolveBooking!: (value: ServicoCreateResponse) => void;
    mocks.mutateAsync.mockReturnValueOnce(new Promise<ServicoCreateResponse>((resolve) => { resolveBooking = resolve; }));
    const { onClose } = await renderCreateModal('client');
    fillValidBooking();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar agendamento' }));
    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledTimes(1));

    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Fechar modal' }));
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement as HTMLElement);
    expect(onClose).not.toHaveBeenCalled();

    resolveBooking(createResponse);
    await act(async () => { await Promise.resolve(); });
  });
});
