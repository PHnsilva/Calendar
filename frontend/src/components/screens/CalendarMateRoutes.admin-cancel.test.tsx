// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../app/providers/auth-context';
import { getStoredAdminSession, saveAdminSession, setAdminWorkspace } from '../../lib/storage';
import type { AdminMeResponse, ServicoResponse } from '../../types/api';

vi.setConfig({ testTimeout: 30000 });

const mocks = vi.hoisted(() => ({
  listAdminBlocks: vi.fn(),
  usePublicBootstrap: vi.fn(),
}));

vi.mock('../../features/admin/api/manage-admin-blocks', () => ({
  createAdminBlocks: vi.fn(),
  deleteAdminBlock: vi.fn(),
  listAdminBlocks: mocks.listAdminBlocks,
}));
vi.mock('../../features/public-config/hooks/usePublicBootstrap', () => ({ usePublicBootstrap: mocks.usePublicBootstrap }));
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
  sessionExpiresAt: Math.floor(new Date(2026, 6, 19, 12).getTime() / 1000) + 3600,
};

const tomorrowBooking: ServicoResponse = {
  eventId: 'event-cancel-1',
  eventLink: '',
  serviceType: 'Hidraulica',
  serviceNotes: 'Reparar vazamento da cozinha.',
  start: '2026-07-20T09:00:00-03:00',
  end: '2026-07-20T10:00:00-03:00',
  clientFirstName: 'Cliente',
  clientLastName: 'Cancelavel',
  clientEmail: 'cancelavel@example.test',
  clientPhone: '31988887777',
  clientCep: '35450000',
  clientStreet: 'Rua Um',
  clientNeighborhood: 'Centro',
  clientNumber: '10',
  clientCity: 'Itabirito',
  clientState: 'MG',
  clientAddressLine: 'Rua Um, 10 - Centro - Itabirito/MG - CEP: 35450000',
  status: 'CONFIRMED',
};

function normalizedText(value?: string | null) {
  return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 6, 19, 12));
  vi.stubEnv('VITE_API_BASE_URL', 'http://backend.test');
  window.localStorage.clear();
  mocks.listAdminBlocks.mockReset();
  mocks.listAdminBlocks.mockResolvedValue([]);
  mocks.usePublicBootstrap.mockReset();
  mocks.usePublicBootstrap.mockReturnValue({ data: { schedule: { cycleStart: '2026-05-16' } } });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('admin appointment cancellation integration', () => {
  it('calls DELETE once and immediately updates the card, date counters, and cached query', async () => {
    let listCalls = 0;
    let deleteCalls = 0;
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const method = String(init?.method ?? 'GET').toUpperCase();
      if (method === 'DELETE' && url.pathname === '/api/servicos/admin/event-cancel-1') {
        deleteCalls += 1;
        expect(new Headers(init?.headers).get('X-ADMIN-SESSION')).toBe('owner-session');
        return new Response(null, { status: 200 });
      }
      if (method === 'GET' && url.pathname === '/api/servicos/admin') {
        listCalls += 1;
        expect(url.searchParams.get('from')).toBe('2026-07-19');
        expect(url.searchParams.get('to')).toBe('2026-07-25');
        return new Response(JSON.stringify(listCalls === 1 ? [tomorrowBooking] : []), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Unexpected request: ${method} ${url}`);
    }));

    const { AdminDashboard } = await import('./CalendarMateRoutes');
    saveAdminSession('owner-session', owner);
    setAdminWorkspace({ mode: 'ADMIN' });
    const session = getStoredAdminSession();
    if (!session) throw new Error('Expected admin session');
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

    render(
      <AuthContext.Provider value={{ adminSession: session, adminStatus: 'authenticated' }}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/admin/dashboard?view=agendamentos']}>
            <AdminDashboard />
          </MemoryRouter>
        </QueryClientProvider>
      </AuthContext.Provider>,
    );

    expect(await screen.findByText('Cliente Cancelavel')).toBeTruthy();
    expect(listCalls).toBe(1);
    const initialAppointments = screen.getAllByText('Agendamentos').map((node) => node.closest('article')).find(Boolean);
    expect(normalizedText(initialAppointments?.textContent)).toContain('1proximos 7 dias');

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancelar agendamento' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar agendamento' }));

    expect(await within(dialog).findByText(/cancelado com sucesso/i)).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('Cliente Cancelavel')).toBeNull());
    const updatedAppointments = screen.getAllByText('Agendamentos').map((node) => node.closest('article')).find(Boolean);
    const updatedProvider = screen.getByText('Sem prestador').closest('article');
    expect(normalizedText(updatedAppointments?.textContent)).toContain('0proximos 7 dias');
    expect(normalizedText(updatedProvider?.textContent)).toContain('0agendamentos');
    expect(deleteCalls).toBe(1);
    await waitFor(() => expect(listCalls).toBe(2));
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
