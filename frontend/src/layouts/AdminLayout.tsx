import { Navigate, Outlet, useLocation } from 'react-router-dom';
import AppShell from './AppShell';
import Logo from '../components/branding/Logo';
import { getStoredAdminToken } from '../lib/storage';
import { env } from '../lib/env';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import '../app/admin-isolated-overrides.css';

function CalendarIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /></svg>;
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
}

function ProfileIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" /></svg>;
}

function MoreIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" /></svg>;
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
