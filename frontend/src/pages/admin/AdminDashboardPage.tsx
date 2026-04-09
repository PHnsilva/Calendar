import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import HomePage from '../home/HomePage';
import HistorySheet from '../../features/history/components/HistorySheet';
import StatementSheet from '../../features/finance/components/StatementSheet';
import { getAdminBookings } from '../../features/admin/api/get-admin-bookings';
import { buildAdminMockBookings } from '../../features/admin/mocks/admin-page-mocks';
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
  const mockBookings = useMemo(() => buildAdminMockBookings(), []);

  const bookingsQuery = useQuery({
    queryKey: ['admin', 'bookings', 'all'],
    queryFn: getAdminBookings,
    enabled: Boolean(token),
    retry: 1,
  });

  const sourceBookings = bookingsQuery.isError || (bookingsQuery.data?.length ?? 0) === 0
    ? mockBookings
    : (bookingsQuery.data ?? []);

  const [bookings, setBookings] = useState<ServicoResponse[]>(sourceBookings);

  useEffect(() => {
    setBookings(sourceBookings);
  }, [sourceBookings]);

  const historyBookings = useMemo(
    () => bookings.filter((booking) => isPastBooking(booking, todayIso)).sort((a, b) => b.start.localeCompare(a.start)),
    [bookings, todayIso],
  );

  if (!token) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="admin-dashboard-page">
      <HomePage
        mode="admin"
        adminBookings={bookings}
        onAdminBookingsChange={setBookings}
        adminUsesMockData={sourceBookings === mockBookings}
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
