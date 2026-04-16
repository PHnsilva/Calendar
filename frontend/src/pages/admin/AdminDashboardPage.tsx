import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import HomePage from '../home/HomePage';
import { getAdminBookings } from '../../features/admin/api/get-admin-bookings';
import { clearStoredAdminToken, getStoredAdminToken } from '../../lib/storage';
import { ApiError } from '../../lib/api-client';
import '../../app/admin-dashboard.css';

export default function AdminDashboardPage() {
  const token = getStoredAdminToken();

  const bookingsQuery = useQuery({
    queryKey: ['admin', 'bookings', 'all'],
    queryFn: getAdminBookings,
    enabled: Boolean(token),
    retry: false,
  });

  if (!token) {
    return <Navigate to="/admin" replace />;
  }

  if (bookingsQuery.error instanceof ApiError && bookingsQuery.error.status === 403) {
    clearStoredAdminToken();
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="admin-dashboard-page">
      <HomePage
        mode="admin"
        adminBookings={bookingsQuery.data ?? []}
        adminUsesMockData={false}
      />
    </div>
  );
}
