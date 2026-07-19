// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../app/providers/auth-context';
import { getStoredAdminSession, saveAdminSession, setAdminWorkspace } from '../../lib/storage';
import type { AdminMeResponse, AvailabilityBlockResponse, ServicoResponse } from '../../types/api';

vi.setConfig({ testTimeout: 30000 });

const mocks = vi.hoisted(() => ({
  listAdminBlocks: vi.fn(),
  useAdminBookings: vi.fn(),
  usePublicBootstrap: vi.fn(),
}));

vi.mock('../../features/admin/hooks/useAdminBookings', () => ({ useAdminBookings: mocks.useAdminBookings }));
vi.mock('../../features/public-config/hooks/usePublicBootstrap', () => ({ usePublicBootstrap: mocks.usePublicBootstrap }));
vi.mock('../../features/admin/api/manage-admin-blocks', () => ({
  createAdminBlocks: vi.fn(),
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
  start: '2026-07-19T09:00:00',
  end: '2026-07-19T10:00:00',
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
  mocks.listAdminBlocks.mockReset();
  mocks.useAdminBookings.mockReset();
  mocks.usePublicBootstrap.mockReset();
  mocks.listAdminBlocks.mockResolvedValue([manualBlock]);
  mocks.useAdminBookings.mockReturnValue({
    data: [tomorrowBooking],
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
  it('loads the authenticated tomorrow booking, filters every period, and opens the pre-blocked calendar', async () => {
    await renderDashboard();

    expect(await screen.findByText('Teste Amanhã')).toBeTruthy();
    expect(screen.queryByText(/Faça login administrativo/i)).toBeNull();
    expect(mocks.useAdminBookings).toHaveBeenCalledWith({ from: '2026-07-18', to: '2026-07-24' }, true);

    const viewAction = screen.getByRole('button', { name: 'Ver' });
    expect(viewAction.querySelector('.wf-icon svg, .wf-icon img')).toBeTruthy();

    const period = screen.getByRole('combobox', { name: 'Período da agenda' });
    fireEvent.change(period, { target: { value: 'TODAY' } });
    expect(mocks.useAdminBookings).toHaveBeenCalledWith({ from: '2026-07-18', to: '2026-07-18' }, true);
    expect(screen.queryByText('Teste Amanhã')).toBeNull();
    const todaySummary = screen.getAllByText('Agendamentos').map((node) => node.closest('article')).find(Boolean);
    expect(todaySummary?.textContent).toContain('0hoje');

    fireEvent.change(period, { target: { value: 'THIS_MONTH' } });
    expect(mocks.useAdminBookings).toHaveBeenCalledWith({ from: '2026-07-01', to: '2026-07-31' }, true);
    expect(await screen.findByText('Teste Amanhã')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Abrir calendário/i }));
    expect(await screen.findByRole('heading', { name: 'Bloquear agenda' })).toBeTruthy();
    const rotationDay = screen.getByRole('button', { name: /2026-07-23, indisponível pela escala 4x4/i }) as HTMLButtonElement;
    expect(rotationDay.disabled).toBe(true);
    const adjacentMonthRotationDay = screen.getByRole('button', { name: /2026-08-01, indisponível pela escala 4x4/i }) as HTMLButtonElement;
    expect(adjacentMonthRotationDay.disabled).toBe(true);
    expect(await screen.findByRole('button', { name: /2026-07-20, bloqueio manual/i })).toBeTruthy();

    await waitFor(() => expect(mocks.listAdminBlocks).toHaveBeenCalledTimes(1));
  });

  it('keeps an authenticated API failure distinct from a login failure', async () => {
    mocks.useAdminBookings.mockReturnValue({
      data: undefined,
      isError: true,
      isFetching: false,
      isPending: false,
      refetch: vi.fn(),
    });

    await renderDashboard();

    expect(await screen.findByText(/Sua sessão está ativa, mas a agenda não respondeu/i)).toBeTruthy();
    expect(screen.queryByText(/Faça login administrativo/i)).toBeNull();
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
