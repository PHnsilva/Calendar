import type { ReactNode } from 'react';
import BaseNavbar, { NavbarButton, NavbarIcon, type NavbarIconName } from './BaseNavbar';
import NavbarMenu from '../../shared/ui/NavbarMenu';

export type AdminNavView = 'agenda' | 'agendamentos' | 'bloqueios' | 'historico' | 'extrato';

type AdminNavbarProps = {
  active?: AdminNavView;
  adminName?: string;
  onAdminClick?: () => void;
  onBudgetClick?: () => void;
  onCreate?: () => void;
  onEmailClick?: () => void;
  onMobileAdminClick?: () => void;
  onMobileMenu?: () => void;
  onNotificationsClick?: () => void;
  onView?: (view: AdminNavView) => void;
  owner?: boolean;
};

type AdminTab = {
  icon: NavbarIconName;
  key: AdminNavView;
  label: string;
  ownerOnly?: boolean;
};

type ProfileMenuItem = {
  action: 'notifications' | 'email' | 'budget' | 'logout';
  icon: NavbarIconName;
  label: string;
  onClick?: () => void;
  danger?: boolean;
};

const adminTabs: AdminTab[] = [
  { key: 'agendamentos', label: 'Agendamentos', icon: 'calendar' },
  { key: 'bloqueios', label: 'Bloqueios', icon: 'lock', ownerOnly: true },
  { key: 'historico', label: 'Histórico', icon: 'clock' },
  { key: 'extrato', label: 'Extrato', icon: 'chart', ownerOnly: true },
];

function getAdminGreeting(adminName?: string): string {
  const name = adminName?.trim() || 'Admin';
  return name.toLowerCase().startsWith('olá') ? name : `Olá, ${name}`;
}

function AdminProfileMenu({
  compact = false,
  greeting,
  labelContent,
  onBudgetClick,
  onEmailClick,
  onLogout,
  onNotificationsClick,
}: {
  compact?: boolean;
  greeting: string;
  labelContent?: ReactNode;
  onBudgetClick?: () => void;
  onEmailClick?: () => void;
  onLogout?: () => void;
  onNotificationsClick?: () => void;
}) {
  const menuItems: ProfileMenuItem[] = [
    { action: 'notifications', icon: 'bell', label: 'Notificações', onClick: onNotificationsClick },
    { action: 'email', icon: 'mail', label: 'Email', onClick: onEmailClick },
    { action: 'budget', icon: 'budget', label: 'Orçamento', onClick: onBudgetClick },
    { action: 'logout', icon: 'user', label: 'Sair', onClick: onLogout, danger: true },
  ];

  return (
    <NavbarMenu
      ariaLabel="Opções do administrador"
      trigger={({ toggle }) => (
        <NavbarButton
          compact={compact}
          onClick={toggle}
          ariaLabel="Abrir opções do administrador"
          title="Abrir opções do administrador"
          className="wf-admin-profile-trigger"
        >
          {labelContent ?? <><NavbarIcon name="user" /> <span>{greeting}</span> <NavbarIcon name="chevron" /></>}
        </NavbarButton>
      )}
    >
      {({ close }) => menuItems.map((item) => (
        <button
          key={item.label}
          type="button"
          className={['wf-profile-menu-item', item.danger ? 'is-danger' : ''].filter(Boolean).join(' ')}
          data-menu-action={item.action}
          aria-label={item.label}
          title={item.label}
          role="menuitem"
          onClick={() => {
            close();
            item.onClick?.();
          }}
        >
          <NavbarIcon name={item.icon} />
          <span>{item.label}</span>
        </button>
      ))}
    </NavbarMenu>
  );
}

export default function AdminNavbar({
  active,
  adminName,
  onAdminClick,
  onBudgetClick,
  onCreate,
  onEmailClick,
  onMobileAdminClick,
  onMobileMenu,
  onNotificationsClick,
  onView,
  owner = false,
}: AdminNavbarProps) {
  const visibleTabs = adminTabs.filter((tab) => owner || !tab.ownerOnly);
  const greeting = getAdminGreeting(adminName);
  const openEmail = onEmailClick ?? (() => undefined);

  const desktopActions = (
    <>
      <AdminProfileMenu
        greeting={greeting}
        onBudgetClick={onBudgetClick}
        onEmailClick={openEmail}
        onLogout={onAdminClick}
        onNotificationsClick={onNotificationsClick}
      />
      <NavbarButton variant="orange" onClick={onCreate}><span>Novo agendamento</span> <NavbarIcon name="plus" /></NavbarButton>
    </>
  );

  const mobileActions = (
    <>
      <AdminProfileMenu
        compact
        greeting={greeting}
        labelContent={<NavbarIcon name="user" />}
        onBudgetClick={onBudgetClick}
        onEmailClick={openEmail}
        onLogout={onMobileAdminClick ?? onAdminClick}
        onNotificationsClick={onNotificationsClick}
      />
      <NavbarButton variant="orange" compact onClick={onCreate ?? onMobileMenu} ariaLabel="Novo agendamento" title="Novo agendamento">
        <NavbarIcon name="plus" />
      </NavbarButton>
    </>
  );

  return (
    <BaseNavbar profile="admin" logoTo="/admin" actions={desktopActions} mobileActions={mobileActions}>
      <div className="wf-admin-tabs">
        {visibleTabs.map((tab) => (
          <button key={tab.key} type="button" className={['wf-admin-tab', active && active === tab.key ? 'is-active' : ''].filter(Boolean).join(' ')} onClick={() => onView?.(tab.key)}>
            <NavbarIcon name={tab.icon} /> <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </BaseNavbar>
  );
}
