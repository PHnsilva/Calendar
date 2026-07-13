// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServicoResponse } from '../../types/api';
import { AdminBlocksPanel } from './AdminBlocksPanel';
import { FinancialStatementPanel } from './FinancialStatementPanel';
import { HistoryPanel } from './HistoryPanel';

const mocks = vi.hoisted(() => ({
  getFinanceConfig: vi.fn(),
  getFinanceHealth: vi.fn(),
  getStatement: vi.fn(),
  useAdminBookings: vi.fn(),
}));

vi.mock('../../features/admin/hooks/useAdminBookings', () => ({ useAdminBookings: mocks.useAdminBookings }));
vi.mock('../../features/finance/api/get-finance-config', () => ({ getFinanceConfig: mocks.getFinanceConfig }));
vi.mock('../../features/finance/api/get-finance-health', () => ({ getFinanceHealth: mocks.getFinanceHealth }));
vi.mock('../../features/finance/api/get-statement', () => ({ getStatement: mocks.getStatement }));
vi.mock('../../lib/storage', () => ({ getStoredAdminToken: () => 'admin-session-test' }));

function renderWithQuery(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

function bookingFixture(): ServicoResponse {
  const date = new Date();
  const isoDate = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
  return {
    eventId: 'SG-2026-001',
    eventLink: '',
    serviceType: 'Instalação de luminária',
    serviceNotes: 'Levar escada e conferir a fiação existente.',
    start: `${isoDate}T09:00:00`,
    end: `${isoDate}T10:00:00`,
    clientFirstName: 'Maria',
    clientLastName: 'Silva',
    clientEmail: 'maria@example.test',
    clientPhone: '(31) 90000-0000',
    clientCep: '00000-000',
    clientStreet: 'Rua Principal',
    clientNeighborhood: 'Centro',
    clientNumber: '100',
    clientCity: 'Itabirito',
    clientState: 'MG',
    clientAddressLine: 'Rua Principal, 100 - Centro',
    status: 'CONCLUIDO',
    assignedProviderId: 'provider-1',
    assignedProviderName: 'João Prestador',
  };
}

beforeEach(() => {
  mocks.getFinanceConfig.mockReset();
  mocks.getFinanceHealth.mockReset();
  mocks.getStatement.mockReset();
  mocks.useAdminBookings.mockReset();
  mocks.useAdminBookings.mockReturnValue({ data: [bookingFixture()], isError: false, isFetching: false, refetch: vi.fn() });
  mocks.getFinanceConfig.mockResolvedValue({
    features: { interPjEnabled: true },
    pix: { key: '31900000000', recipientName: 'SG Teste', recipientCity: 'Itabirito', description: 'Teste' },
  });
  mocks.getFinanceHealth.mockResolvedValue({ ok: true, provider: 'test', message: 'Extrato atualizado' });
  mocks.getStatement.mockResolvedValue({
    items: [
      { id: 'entry-1', date: '2026-07-10', description: 'Pagamento SG-2026-001', amountCents: 25000, kind: 'credit', title: 'Pagamento recebido', subtitle: 'Serviços' },
      { id: 'exit-1', date: '2026-07-11', description: 'Compra de material', amountCents: 5000, kind: 'debit', title: 'Material elétrico', subtitle: 'Materiais' },
    ],
  });
});

afterEach(() => {
  cleanup();
});

describe('Admin workspace redesigned panels', () => {
  it('keeps every block field and action available, with working filters', () => {
    const onDelete = vi.fn();
    const onOpenEditor = vi.fn();
    render(
      <AdminBlocksPanel
        blocks={[{
          blockId: 'block-1',
          mode: 'BLOCK',
          type: 'SLOT',
          start: '2026-07-14T09:00:00',
          end: '2026-07-14T10:00:00',
          reason: 'Treinamento da equipe',
        }]}
        deletingId=""
        hasAdminToken
        isError={false}
        isLoading={false}
        onDelete={onDelete}
        onOpenEditor={onOpenEditor}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Bloqueios detalhados' })).toBeTruthy();
    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getByText('Treinamento da equipe')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Detalhes/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Editar/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Excluir/i })).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Data, horário ou observação'), { target: { value: 'não existe' } });
    fireEvent.click(screen.getByRole('button', { name: /Filtrar/i }));
    expect(screen.getByText('Nenhum bloqueio corresponde aos filtros')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Limpar filtros/i }));
    expect(screen.getByRole('table')).toBeTruthy();
  });

  it('renders polished loading, error and empty states for blocks', () => {
    const commonProps = { blocks: [], deletingId: '', onDelete: vi.fn(), onOpenEditor: vi.fn() };
    const { rerender } = render(<AdminBlocksPanel {...commonProps} hasAdminToken isError={false} isLoading />);
    expect(screen.getByText('Carregando bloqueios')).toBeTruthy();

    rerender(<AdminBlocksPanel {...commonProps} hasAdminToken isError isLoading={false} />);
    expect(screen.getByText('Bloqueios indisponíveis')).toBeTruthy();

    rerender(<AdminBlocksPanel {...commonProps} hasAdminToken isError={false} isLoading={false} />);
    expect(screen.getByText('Nenhum bloqueio cadastrado')).toBeTruthy();
  });

  it('shows complete history details and preserves filters', () => {
    renderWithQuery(<HistoryPanel />);

    expect(screen.getByRole('heading', { name: 'Histórico' })).toBeTruthy();
    expect(screen.getAllByText('Maria Silva').length).toBeGreaterThan(1);
    expect(screen.getAllByText('João Prestador').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Instalação de luminária').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Levar escada e conferir a fiação existente.')).toHaveLength(2);
    expect(screen.getByText('Rua Principal, 100 - Centro')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Cliente, código, serviço ou observação'), { target: { value: 'sem resultado' } });
    expect(screen.getByText('Nenhum atendimento encontrado')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: /Limpar filtros/i })[0]);
    expect(screen.getAllByText('Maria Silva').length).toBeGreaterThan(1);
  });

  it('renames the financial page to Extrato and keeps transactions and actions', async () => {
    const onOpenOfx = vi.fn();
    renderWithQuery(<FinancialStatementPanel onOpenOfx={onOpenOfx} />);

    expect(screen.getByRole('heading', { name: 'Extrato' })).toBeTruthy();
    expect(screen.queryByText(/Comissões e repasses/i)).toBeNull();
    expect(screen.getByRole('button', { name: /Importar OFX/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Exportar/i })).toBeTruthy();

    expect(await screen.findByRole('table', { name: 'Movimentações financeiras' })).toBeTruthy();
    expect(screen.getByText('Pagamento recebido')).toBeTruthy();
    expect(screen.getByText('Material elétrico')).toBeTruthy();
    expect(screen.getAllByText('Não vinculado')).toHaveLength(2);

    fireEvent.click(screen.getAllByRole('button', { name: /Gerar QR Pix/i })[0]);
    expect(screen.getByRole('dialog', { name: /Gerar QR Pix/i })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Gerar QR Pix/i })).toBeNull());
  });
});
