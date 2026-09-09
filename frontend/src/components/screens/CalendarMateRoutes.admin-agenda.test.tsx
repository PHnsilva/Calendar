// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../app/providers/auth-context';
import { ApiError } from '../../lib/api-client';
import { getStoredAdminSession, saveAdminSession, setAdminWorkspace } from '../../lib/storage';
import type { AdminMeResponse, AvailabilityBlockResponse, ServicoResponse } from '../../types/api';

vi.setConfig({ testTimeout: 30000 });

const mocks = vi.hoisted(() => ({
  createAdminBlocks: vi.fn(),
  listAdminBlocks: vi.fn(),
  useAdminBookings: vi.fn(),
  usePublicBootstrap: vi.fn(),
}));

vi.mock('../../features/admin/hooks/useAdminBookings', () => ({ useAdminBookings: mocks.useAdminBookings }));
vi.mock('../../features/public-config/hooks/usePublicBootstrap', () => ({ usePublicBootstrap: mocks.usePublicBootstrap }));
vi.mock('../../features/admin/api/manage-admin-blocks', () => ({
  createAdminBlocks: mocks.createAdminBlocks,
  deleteAdminBlock: vi.fn(),
  listAdminBlocks: mocks.listAdminBlocks,
}));

const owner: AdminMeResponse = {
  id: 'owner-1',
  name: 'SG Admin',
  phone: '31999999999',
  role: 'OWNER',
  permissions: ['BOOKINGS_READ_ALL'],
  sessionExpiresAt: Math.floor(new Date(2026, 6, 19).getTime() / 1000),
};

const tomorrowBooking: ServicoResponse = {
  eventId: 'test-tomorrow',
  eventLink: '',
  serviceType: 'Instalação de luminária',
  serviceNotes: 'Agendamento de teste para amanhã.',
  start: '2026-07-19T12:00:00Z',
  end: '2026-07-19T13:00:00Z',
  clientFirstName: 'Teste',
  clientLastName: 'Amanhã',
  clientEmail: 'teste@example.test',
  clientPhone: '31900000000',
  clientCep: '35450-000',
  clientStreet: 'Rua do Teste',
  clientNeighborhood: 'Centro',
  clientNumber: '10',
  clientCity: 'Itabirito',
  clientState: 'MG',
  clientAddressLine: 'Rua do Teste, 10 - Centro',
  status: 'CONFIRMED',
};

const nextMonthBooking: ServicoResponse = {
  ...tomorrowBooking,
  eventId: 'test-next-month',
  start: '2026-08-05T12:00:00Z',
  end: '2026-08-05T13:00:00Z',
  clientFirstName: 'Teste',
  clientLastName: 'Agosto',
  clientPhone: '31900000001',
};

const manualBlock: AvailabilityBlockResponse = {
  blockId: 'manual-block-1',
  mode: 'BLOCK',
  type: 'DAY',
  start: '2026-07-20T00:00:00',
  end: '2026-07-21T00:00:00',
  reason: 'Bloqueio de teste',
};

async function renderDashboard() {
  const { AdminDashboard } = await import('./CalendarMateRoutes');
  saveAdminSession('owner-session', owner);
  setAdminWorkspace({ mode: 'ADMIN' });
  const session = getStoredAdminSession();
  if (!session) throw new Error('Expected persisted admin session');
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <AuthContext.Provider value={{ adminSession: session, adminStatus: 'authenticated' }}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/dashboard?view=agendamentos']}>
          <AdminDashboard />
        </MemoryRouter>
      </QueryClientProvider>
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 6, 18, 12));
  window.localStorage.clear();
  mocks.createAdminBlocks.mockReset();
  mocks.listAdminBlocks.mockReset();
  mocks.useAdminBookings.mockReset();
  mocks.usePublicBootstrap.mockReset();
  mocks.listAdminBlocks.mockResolvedValue([manualBlock]);
  mocks.createAdminBlocks.mockResolvedValue([]);
  mocks.useAdminBookings.mockReturnValue({
    data: [tomorrowBooking, nextMonthBooking],
    isError: false,
    isFetching: false,
    isPending: false,
    refetch: vi.fn(),
  });
  mocks.usePublicBootstrap.mockReturnValue({ data: { schedule: { cycleStart: '2026-05-16' } } });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('admin agenda flows', () => {
  it('renders the wordmark-only admin navbar and accessible agenda controls', async () => {
    await renderDashboard();

    const brand = screen.getByRole('link', { name: 'SG Pequenos Reparos Agendamentos' });
    expect(brand.getAttribute('href')).toBe('/admin');
    expect(brand.querySelector('.cm-admin-navbar__mark')).toBeTruthy();
    expect(brand.querySelector('.cm-admin-navbar__mark img')).toBeNull();
    expect(brand.querySelector('img')?.getAttribute('src')).toContain('sg-navbar-logo-white-orange-v2');
    brand.focus();
    expect(document.activeElement).toBe(brand);
    expect(screen.queryByRole('button', { name: 'Abrir menu administrativo' })).toBeNull();

    const period = screen.getByRole('combobox', { name: 'Período da agenda' });
    expect(period.closest('.wf-admin-week-agenda__week')?.querySelector('.wf-admin-week-agenda__select-chevron')).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Próximos 30 dias' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Próximo mês' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Este mês' })).toBeNull();
    period.focus();
    expect(document.activeElement).toBe(period);

    expect(document.querySelector('.wf-admin-week-agenda__new')).toBeNull();
    const navbarCreateButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.cm-admin-create-button, .cm-admin-mobile-create-button'));
    expect(navbarCreateButtons).toHaveLength(2);
    expect(navbarCreateButtons.every((button) => Boolean(button.querySelector('svg')))).toBe(true);
    navbarCreateButtons[1].focus();
    expect(document.activeElement).toBe(navbarCreateButtons[1]);
  });

  it('loads the authenticated tomorrow booking, filters every period, and opens the pre-blocked calendar', async () => {
    await renderDashboard();

    expect(await screen.findByText('Teste Amanhã')).toBeTruthy();
    expect(screen.getByText('09:00')).toBeTruthy();
    expect(screen.queryByText(/Faça login administrativo/i)).toBeNull();
    expect(mocks.useAdminBookings).toHaveBeenCalledWith({ from: '2026-07-18', to: '2026-07-24' }, true);
    const initialAppointmentsSummary = screen.getAllByText('Agendamentos').map((node) => node.closest('article')).find(Boolean);
    const initialProviderSummary = screen.getByText('Sem prestador').closest('article');
    expect(initialAppointmentsSummary?.textContent).toContain('1próximos 7 dias');
    expect(initialProviderSummary?.textContent).toContain('1agendamentos');
    expect(screen.getByText('1 agendamento')).toBeTruthy();

    const viewAction = screen.getByRole('button', { name: 'Ver' });
    expect(viewAction.querySelector('.wf-icon svg, .wf-icon img')).toBeTruthy();

    const period = screen.getByRole('combobox', { name: 'Período da agenda' });
    fireEvent.change(period, { target: { value: 'TODAY' } });
    expect(mocks.useAdminBookings).toHaveBeenCalledWith({ from: '2026-07-18', to: '2026-07-18' }, true);
    expect(screen.queryByText('Teste Amanhã')).toBeNull();
    const todaySummary = screen.getAllByText('Agendamentos').map((node) => node.closest('article')).find(Boolean);
    expect(todaySummary?.textContent).toContain('0hoje');

    fireEvent.change(period, { target: { value: 'NEXT_30_DAYS' } });
    expect(mocks.useAdminBookings).toHaveBeenCalledWith({ from: '2026-07-18', to: '2026-08-16' }, true);
    expect(await screen.findByText('Teste Amanhã')).toBeTruthy();
    expect(await screen.findByText('Teste Agosto')).toBeTruthy();

    fireEvent.change(period, { target: { value: 'NEXT_MONTH' } });
    expect(mocks.useAdminBookings).toHaveBeenCalledWith({ from: '2026-08-01', to: '2026-08-31' }, true);
    expect(screen.queryByText('Teste Amanhã')).toBeNull();
    expect(await screen.findByText('Teste Agosto')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Abrir calendário/i }));
    expect(await screen.findByRole('heading', { name: 'Bloquear agenda' })).toBeTruthy();
    const rotationDay = screen.getByRole('button', { name: /2026-07-23, indisponível pela escala 4x4/i }) as HTMLButtonElement;
    expect(rotationDay.disabled).toBe(false);
    const adjacentMonthRotationDay = screen.getByRole('button', { name: /2026-08-01, indisponível pela escala 4x4/i }) as HTMLButtonElement;
    expect(adjacentMonthRotationDay.disabled).toBe(false);
    expect(await screen.findByRole('button', { name: /2026-07-20, bloqueio manual/i })).toBeTruthy();

    await waitFor(() => expect(mocks.listAdminBlocks).toHaveBeenCalledTimes(1));
  });

  it('releases selected hours on a day blocked by the 4x4 schedule', async () => {
    await renderDashboard();

    fireEvent.click(screen.getByRole('button', { name: /Abrir calendário/i }));
    fireEvent.click(await screen.findByRole('button', { name: /2026-07-23, indisponível pela escala 4x4/i }));

    expect(screen.getByText(/selecione abaixo os horários que deseja liberar/i)).toBeTruthy();
    expect(screen.getByText('Selecione os horários para liberar')).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: /Bloquear dia inteiro/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '09:00' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar liberação' }));

    await waitFor(() => expect(mocks.createAdminBlocks).toHaveBeenCalledWith({
      entries: [{ date: '2026-07-23', times: ['09:00'] }],
      mode: 'specific-hours',
      ruleMode: 'OPEN',
      reason: '',
      cancelConflictingBookings: false,
    }));
  });

  it('keeps an authenticated API failure distinct from a login failure', async () => {
    const refetch = vi.fn();
    const calendarError = new ApiError(
      'Não foi possível consultar a agenda agora. Tente novamente em instantes.',
      503,
      { code: 'CALENDAR_UNAVAILABLE', retryable: true },
      { code: 'CALENDAR_UNAVAILABLE', retryable: true },
    );
    mocks.useAdminBookings.mockReturnValue({
      data: undefined,
      error: calendarError,
      isError: true,
      isFetching: false,
      isPending: false,
      refetch,
    });

    await renderDashboard();

    expect(await screen.findByText(/Não foi possível consultar a agenda agora/i)).toBeTruthy();
    expect(screen.queryByText(/Faça login administrativo/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows a dedicated loading state while the authenticated request is pending', async () => {
    mocks.useAdminBookings.mockReturnValue({
      data: undefined,
      error: null,
      isError: false,
      isFetching: true,
      isPending: true,
      refetch: vi.fn(),
    });

    await renderDashboard();

    expect(await screen.findByText(/Carregando agendamentos/i)).toBeTruthy();
    expect(screen.queryByText(/Nenhum agendamento no per/i)).toBeNull();
  });

  it('shows the real empty state only after a successful empty response', async () => {
    mocks.useAdminBookings.mockReturnValue({
      data: [],
      error: null,
      isError: false,
      isFetching: false,
      isPending: false,
      refetch: vi.fn(),
    });

    await renderDashboard();

    expect(await screen.findByText(/Nenhum agendamento no per/i)).toBeTruthy();
    expect(screen.queryByText(/Carregando agendamentos/i)).toBeNull();
  });

  it('shows Filmagem com drones in Serviços prestados instead of Orçamento', async () => {
    const { CalendarMateModal } = await import('./CalendarMateRoutes');
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CalendarMateModal modal="services-info" onClose={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Filmagem com drones' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Orçamento' })).toBeNull();
  });
});
