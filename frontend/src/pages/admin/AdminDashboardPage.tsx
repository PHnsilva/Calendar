import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import HomePage from '../home/HomePage';
import HistorySheet from '../../features/history/components/HistorySheet';
import StatementSheet from '../../features/finance/components/StatementSheet';
import { getAdminBookings } from '../../features/admin/api/get-admin-bookings';
import { clearStoredAdminToken, getStoredAdminToken } from '../../lib/storage';
import { ApiError } from '../../lib/api-client';
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
    retry: false,
  });

  const bookings = bookingsQuery.data ?? [];

  const historyBookings = useMemo(
    () => bookings.filter((booking) => isPastBooking(booking, todayIso)).sort((a, b) => b.start.localeCompare(a.start)),
    [bookings, todayIso],
  );

  if (!token) {
    return <Navigate to="/admin" replace />;
  }

  if (bookingsQuery.error instanceof ApiError && bookingsQuery.error.status === 403) {
    clearStoredAdminToken();
    return <Navigate to="/admin" replace />;
  }

  return (
    <>
      <HomePage
        mode="admin"
        adminBookings={bookings}
        adminUsesMockData={false}
      />

      <div className="admin-dashboard__dock" aria-label="Ações rápidas do admin">
        <button
          type="button"
          className={['admin-dashboard__dock-button', historyOpen ? 'admin-dashboard__dock-button--active' : ''].filter(Boolean).join(' ')}
          onClick={() => setHistoryOpen((current) => !current)}
        >
          Histórico
        </button>
        <button
          type="button"
          className={['admin-dashboard__dock-button', statementOpen ? 'admin-dashboard__dock-button--active' : ''].filter(Boolean).join(' ')}
          onClick={() => setStatementOpen((current) => !current)}
        >
          Extrato
        </button>
      </div>

      <HistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} bookings={historyBookings} />
      <StatementSheet open={statementOpen} onClose={() => setStatementOpen(false)} bookings={bookings} />
    </>
  );
}
