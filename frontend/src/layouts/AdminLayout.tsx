import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import AppShell from './AppShell';
import Logo from '../components/branding/Logo';
import { clearAdminToken, getStoredAdminToken } from '../lib/storage';
import { env } from '../lib/env';

export default function AdminLayout() {
  const location = useLocation();
  const hasToken = Boolean(getStoredAdminToken());
  const isGatePage = location.pathname === '/admin';
  const [blockingEnabled, setBlockingEnabled] = useState(false);

  if (!env.adminEnabled) {
    return <Navigate to="/403" replace />;
  }

  if (!hasToken && !isGatePage) {
    return <Navigate to="/admin" replace />;
  }

  const header = (
    <header className="public-header">
      <div className="brand-lockup" aria-label="Painel administrativo">
        <Logo />
      </div>

      <div className="public-header__actions">
        {hasToken ? (
          <button
            type="button"
            className={[
              'booking-sidebar-rail__admin-badge',
              'booking-sidebar-rail__admin-badge--button',
              blockingEnabled ? 'booking-sidebar-rail__admin-badge--active' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => {
              setBlockingEnabled((current) => !current);
              window.dispatchEvent(new CustomEvent('admin:blocking-toggle'));
            }}
          >
            {blockingEnabled ? 'Selecionando' : 'Bloqueios'}
          </button>
        ) : null}


        {hasToken ? (
          <button
            type="button"
            className="secondary-action"
            onClick={() => {
              clearAdminToken();
              window.location.href = '/admin';
            }}
          >
            Sair
          </button>
        ) : null}
      </div>
    </header>
  );

  return (
    <AppShell header={header}>
      <main className="public-layout__content">
        <Outlet />
      </main>
    </AppShell>
  );
}
