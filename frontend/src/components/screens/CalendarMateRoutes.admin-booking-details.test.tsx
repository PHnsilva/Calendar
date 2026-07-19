// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthContext } from '../../app/providers/auth-context';
import { getStoredAdminSession, saveAdminSession, setAdminWorkspace } from '../../lib/storage';
import type { AdminMeResponse, ServicoResponse } from '../../types/api';

vi.setConfig({ testTimeout: 30000 });

const mocks = vi.hoisted(() => ({
  deleteAdminBooking: vi.fn(),
  requestLocation: vi.fn(),
  updateAdminBooking: vi.fn(),
  useAdminBookingDetails: vi.fn(),
  useAdminRoute: vi.fn(),
  useLocationPreview: vi.fn(),
  useUserGeolocation: vi.fn(),
}));

vi.mock('../../features/admin/hooks/useAdminBookingDetails', () => ({ useAdminBookingDetails: mocks.useAdminBookingDetails }));
vi.mock('../../features/admin/hooks/useAdminRoute', () => ({ useAdminRoute: mocks.useAdminRoute }));
vi.mock('../../features/maps/hooks/useLocationPreview', () => ({ useLocationPreview: mocks.useLocationPreview }));
vi.mock('../../features/maps/hooks/useUserGeolocation', () => ({ useUserGeolocation: mocks.useUserGeolocation }));
vi.mock('../../features/admin/api/delete-admin-booking', () => ({ deleteAdminBooking: mocks.deleteAdminBooking }));
vi.mock('../../features/admin/api/update-admin-booking', () => ({ updateAdminBooking: mocks.updateAdminBooking }));
vi.mock('../../lib/navigation-history', () => ({
  useDoubleBackToLeavePage: () => undefined,
  useModalBrowserBack: (_open: boolean, _key: string, onClose: () => void) => onClose,
}));

const owner: AdminMeResponse = {
  id: 'owner-1',
  name: 'SG Admin',
  phone: '31999999999',
  role: 'OWNER',
  permissions: ['BOOKINGS_READ_ALL'],
  sessionExpiresAt: Math.floor(Date.now() / 1000) + 3600,
};

const booking: ServicoResponse = {
  eventId: 'event-detail-1',
  eventLink: '',
  serviceType: 'Eletrica',
  serviceNotes: 'Trocar a tomada principal da sala.',
  start: '2026-07-20T09:00:00-03:00',
  end: '2026-07-20T10:00:00-03:00',
  clientFirstName: 'Maria',
  clientLastName: 'Souza',
  clientEmail: 'maria@example.test',
  clientPhone: '31988887777',
  clientCep: '',
  clientStreet: 'Rua do Teste',
  clientNeighborhood: 'Centro',
  clientNumber: '10',
  clientCity: 'Itabirito',
  clientState: 'MG',
  clientAddressLine: 'Rua do Teste, 10 - Centro - Itabirito/MG - CEP: ',
  clientLatitude: -20.253,
  clientLongitude: -43.802,
  assignedProviderName: 'Joao Prestador',
  assignedProviderPhone: '31977776666',
  status: 'CONFIRMED',
};

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

async function renderDetails() {
  const { AdminBookingDetails } = await import('./CalendarMateRoutes');
  saveAdminSession('owner-session', owner);
  setAdminWorkspace({ mode: 'ADMIN' });
  const session = getStoredAdminSession();
  if (!session) throw new Error('Expected admin session');
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const view = render(
    <AuthContext.Provider value={{ adminSession: session, adminStatus: 'authenticated' }}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/booking/event-detail-1']}>
          <Routes>
            <Route path="/admin/booking/:eventId" element={<AdminBookingDetails />} />
            <Route path="/admin/dashboard" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </AuthContext.Provider>,
  );
  return { ...view, queryClient };
}

beforeEach(() => {
  vi.stubEnv('VITE_GEOAPIFY_PUBLIC_KEY', 'geoapify-test-key');
  window.localStorage.clear();
  mocks.deleteAdminBooking.mockReset();
  mocks.deleteAdminBooking.mockResolvedValue(undefined);
  mocks.updateAdminBooking.mockReset();
  mocks.updateAdminBooking.mockResolvedValue({ ...booking, clientFirstName: 'Paula' });
  mocks.requestLocation.mockReset();
  mocks.useAdminBookingDetails.mockReset();
  mocks.useAdminBookingDetails.mockReturnValue({
    data: booking,
    error: null,
    isError: false,
    isFetching: false,
    isPending: false,
    refetch: vi.fn(),
  });
  mocks.useAdminRoute.mockReset();
  mocks.useAdminRoute.mockReturnValue({
    data: {
      primary: {
        distanceMeters: 12300,
        durationSeconds: 1800,
        geometry: { coordinates: [[[-43.81, -20.26], [-43.802, -20.253]]] },
      },
    },
    error: null,
    isError: false,
    isFetching: false,
  });
  mocks.useLocationPreview.mockReset();
  mocks.useLocationPreview.mockReturnValue({ data: null, isError: false, isLoading: false });
  mocks.useUserGeolocation.mockReset();
  mocks.useUserGeolocation.mockReturnValue({
    coords: { lat: -20.26, lng: -43.81 },
    error: null,
    isLoading: false,
    requestLocation: mocks.requestLocation,
  });
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('admin appointment details flow', () => {
  it('loads the exact event and renders responsive sections with the real route controls', async () => {
    await renderDetails();

    expect(mocks.useAdminBookingDetails).toHaveBeenCalledWith('event-detail-1', true);
    expect(screen.getByRole('heading', { name: 'Agendamento' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Cliente' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Endere.o do atendimento/i })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Profissional respons.vel/i })).toBeTruthy();
    expect(screen.getByText('Maria Souza')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Voltar para a agenda/i }).getAttribute('href')).toContain('/admin/dashboard');
    expect(screen.queryByText(/^CEP:?$/i)).toBeNull();
    expect(document.body.textContent).not.toContain('CEP:');

    const map = screen.getByRole('img', { name: /Mapa com a rota/i });
    expect(map.getAttribute('src')).toContain('maps.geoapify.com/v1/staticmap');
    expect(screen.getByText('12.3 km')).toBeTruthy();
    expect(screen.getByText('30 min')).toBeTruthy();
    const googleMaps = screen.getByRole('link', { name: /Abrir no Google Maps/i });
    expect(googleMaps.getAttribute('href')).toContain('google.com/maps/dir');
    expect(googleMaps.getAttribute('href')).toContain('origin=-20.26%2C-43.81');

    const expand = screen.getByRole('button', { name: /Expandir mapa/i });
    fireEvent.click(expand);
    expect(expand.getAttribute('aria-expanded')).toBe('true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('button', { name: /Expandir mapa/i }).getAttribute('aria-expanded')).toBe('false');
  });

  it('edits without rendering or submitting a surname field', async () => {
    mocks.useAdminBookingDetails.mockReturnValue({
      data: { ...booking, serviceNotes: booking.serviceType },
      error: null,
      isError: false,
      isFetching: false,
      isPending: false,
      refetch: vi.fn(),
    });
    await renderDetails();
    fireEvent.click(screen.getByRole('button', { name: 'Editar dados' }));
    const dialog = screen.getByRole('dialog', { name: 'Editar agendamento' });
    expect(within(dialog).queryByText(/Sobrenome/i)).toBeNull();
    fireEvent.change(within(dialog).getByLabelText('Nome'), { target: { value: 'Paula' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar alteracoes' }));

    await waitFor(() => expect(mocks.updateAdminBooking).toHaveBeenCalledTimes(1));
    expect(mocks.updateAdminBooking).toHaveBeenCalledWith('event-detail-1', expect.objectContaining({ clientFirstName: 'Paula' }));
    expect(mocks.updateAdminBooking.mock.calls[0]?.[1]).not.toHaveProperty('clientLastName');
    expect(JSON.parse(JSON.stringify(mocks.updateAdminBooking.mock.calls[0]?.[1]))).not.toHaveProperty('serviceNotes');
  });

  it('uses the custom confirmation and removes cached list/detail data after cancellation', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { queryClient } = await renderDetails();
    queryClient.setQueryData(['admin-bookings', 'range'], [booking]);
    queryClient.setQueryData(['admin-booking', booking.eventId], booking);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar agendamento' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancelar agendamento' });
    expect(within(dialog).getByRole('heading', { name: 'Cancelar agendamento' })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar agendamento' }));

    await waitFor(() => expect(mocks.deleteAdminBooking).toHaveBeenCalledWith('event-detail-1'));
    expect(await within(dialog).findByText(/cancelado com sucesso/i)).toBeTruthy();
    expect(queryClient.getQueryData(['admin-bookings', 'range'])).toEqual([]);
    expect(queryClient.getQueryData(['admin-booking', booking.eventId])).toBeUndefined();
    await act(async () => { await vi.advanceTimersByTimeAsync(700); });
    expect(screen.getByTestId('location').textContent).toContain('/admin/dashboard?view=agendamentos');
  });

  it('keeps appointment queries intact and shows the real server error when cancellation fails', async () => {
    mocks.deleteAdminBooking.mockRejectedValueOnce(new Error('delete failed'));
    const { queryClient } = await renderDetails();
    queryClient.setQueryData(['admin-bookings', 'range'], [booking]);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar agendamento' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancelar agendamento' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar agendamento' }));

    expect(await within(dialog).findByRole('alert')).toBeTruthy();
    expect(within(dialog).getByRole('alert').textContent).toMatch(/N.o foi poss.vel cancelar/i);
    expect(queryClient.getQueryData(['admin-bookings', 'range'])).toEqual([booking]);
  });

  it('renders dedicated loading, server error, and missing-coordinate fallback states', async () => {
    const refetch = vi.fn();
    mocks.useAdminBookingDetails.mockReturnValueOnce({ data: undefined, error: null, isError: false, isFetching: true, isPending: true, refetch });
    const loading = await renderDetails();
    expect(screen.getByText(/Carregando agendamento/i)).toBeTruthy();
    loading.unmount();

    mocks.useAdminBookingDetails.mockReturnValueOnce({ data: undefined, error: new Error('backend unavailable'), isError: true, isFetching: false, isPending: false, refetch });
    const failed = await renderDetails();
    expect(screen.getByRole('alert').textContent).toMatch(/N.o foi poss.vel carregar/i);
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(refetch).toHaveBeenCalledTimes(1);
    failed.unmount();

    mocks.useAdminBookingDetails.mockReturnValueOnce({ data: { ...booking, clientLatitude: undefined, clientLongitude: undefined }, error: null, isError: false, isFetching: false, isPending: false, refetch });
    mocks.useLocationPreview.mockReturnValueOnce({ data: null, isError: true, isLoading: false });
    mocks.useAdminRoute.mockReturnValueOnce({ data: undefined, error: null, isError: false, isFetching: false });
    await renderDetails();
    expect(screen.getByText(/coordenadas do endere.o n.o est.o dispon.veis/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Abrir no Google Maps/i })).toBeTruthy();
  });
});
