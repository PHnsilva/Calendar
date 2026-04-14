import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import HomePage from '../home/HomePage';
import HistorySheet from '../../features/history/components/HistorySheet';
import StatementSheet from '../../features/finance/components/StatementSheet';
import { getAdminBookings } from '../../features/admin/api/get-admin-bookings';
import { getStoredAdminToken } from '../../lib/storage';
import type { ServicoResponse } from '../../types/api';
import '../../app/admin-dashboard.css';

function isPastBooking(booking: ServicoResponse, todayIso: string) {
  return booking.start.slice(0, 10) < todayIso;
}

export default function AdminDashboardPage() {
  const token = getStoredAdminToken();
  const todayIso = new Date().toISOString().slice(0, 10);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);

  const bookingsQuery = useQuery({
    queryKey: ['admin', 'bookings', 'all'],
    queryFn: getAdminBookings,
    enabled: Boolean(token),
    retry: 1,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const bookings = bookingsQuery.data ?? [];

  const historyBookings = useMemo(
    () => bookings.filter((booking) => isPastBooking(booking, todayIso)).sort((a, b) => b.start.localeCompare(a.start)),
    [bookings, todayIso],
  );

  if (!token) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="admin-dashboard-page">
      {bookingsQuery.isError ? (
        <div className="admin-dashboard__notice admin-dashboard__notice--error">
          <strong>Não foi possível carregar a agenda do admin.</strong>
          <span>{bookingsQuery.error instanceof Error ? bookingsQuery.error.message : 'O backend não respondeu como esperado.'}</span>
        </div>
      ) : null}

      {!bookingsQuery.isError && !bookingsQuery.isLoading && bookings.length === 0 ? (
        <div className="admin-dashboard__notice">
          <strong>Nenhum agendamento retornado.</strong>
          <span>Os mocks foram removidos. Se você criou um atendimento e ele não aparece aqui, agora o erro real do backend ou da autenticação ficará visível.</span>
        </div>
      ) : null}

      <HomePage
        mode="admin"
        adminBookings={bookings}
        adminLoading={bookingsQuery.isLoading}
        onRefetchAdminBookings={() => bookingsQuery.refetch()}
      />

      <div className="admin-dashboard__dock" aria-label="Ações rápidas do admin">
        <button
          type="button"
          className={`admin-dashboard__dock-button ${historyOpen ? 'admin-dashboard__dock-button--active' : ''}`}
          onClick={() => setHistoryOpen((current) => !current)}
        >
          Histórico
        </button>
        <button
          type="button"
          className={`admin-dashboard__dock-button ${statementOpen ? 'admin-dashboard__dock-button--active' : ''}`}
          onClick={() => setStatementOpen((current) => !current)}
        >
          Extrato
        </button>
      </div>

      <HistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} bookings={historyBookings} />
      <StatementSheet open={statementOpen} onClose={() => setStatementOpen(false)} bookings={bookings} />
    </div>
  );
}
