import { Navigate, Outlet, useLocation } from 'react-router-dom';
import AppShell from './AppShell';
import Logo from '../components/branding/Logo';
import { getStoredAdminToken } from '../lib/storage';
import { env } from '../lib/env';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import '../app/admin-isolated-overrides.css';

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3.7v2.6M17 3.7v2.6M4.8 9h14.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="4.6" y="5.4" width="14.8" height="14.2" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="m9 15.9 2.1 2.1 4.2-4.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return <span className="admin-plus-action__icon" aria-hidden="true">+</span>;
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.8 19.2c.8-2.8 3.3-4.5 6.2-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10.8" cy="8.2" r="3.4" stroke="currentColor" strokeWidth="1.8" />
      <path d="m15.4 17.9 4.2-4.2 1.6 1.6-4.2 4.2h-1.6v-1.6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="5.5" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="18.5" r="1.8" fill="currentColor" />
    </svg>
  );
}

function dispatchAdminAction(name: string) {
  window.dispatchEvent(new CustomEvent(name));
}

export default function AdminLayout() {
  const location = useLocation();
  const hasToken = Boolean(getStoredAdminToken());
  const isGatePage = location.pathname === '/admin';

  if (!env.adminEnabled) {
    return <Navigate to="/403" replace />;
  }

  if (!hasToken && !isGatePage) {
    return <Navigate to="/admin" replace />;
  }

  const header = (
    <header className="public-header public-header--admin">
      <div className="brand-lockup" aria-label="Painel administrativo">
        <Logo />
      </div>

      {hasToken ? (
        <div className="public-header__actions public-header__actions--admin">
          <button
            type="button"
            className="admin-nav-pill"
            onClick={() => dispatchAdminAction('admin:focus-bookings')}
          >
            <CalendarIcon />
            Meus agendamentos
          </button>

          <button
            type="button"
            className="admin-plus-action"
            aria-label="Criar agendamento"
            onClick={() => dispatchAdminAction('admin:open-booking')}
          >
            <PlusIcon />
          </button>

          <button
            type="button"
            className="admin-profile-action"
            aria-label="Perfil admin"
            onClick={() => dispatchAdminAction('admin:open-profile')}
          >
            <ProfileIcon />
          </button>

          <button
            type="button"
            className="admin-more-action"
            aria-label="Mais ações administrativas"
            onClick={() => dispatchAdminAction('admin:open-actions')}
          >
            <MoreIcon />
          </button>

          <ThemeToggle />
        </div>
      ) : null}
    </header>
  );

  return (
    <AppShell header={header}>
      <main className="public-layout__content public-layout__content--admin">
        <Outlet />
      </main>
    </AppShell>
  );
}
