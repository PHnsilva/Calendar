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
  action: 'email' | 'budget' | 'logout';
  icon: NavbarIconName;
  label: string;
  onClick?: () => void;
  danger?: boolean;
};

const adminTabs: AdminTab[] = [
  { key: 'agendamentos', label: 'Agenda', icon: 'calendar' },
  { key: 'bloqueios', label: 'Bloqueios', icon: 'lock', ownerOnly: true },
  { key: 'historico', label: 'Histórico', icon: 'clock' },
  { key: 'extrato', label: 'Extrato', icon: 'chart', ownerOnly: true },
];

function getAdminFirstName(adminName?: string): string {
  const normalized = adminName?.trim() || 'Admin';
  const sanitized = normalized.replace(/^olá,\s*/i, '').trim();
  return sanitized.split(/\s+/)[0] || 'Admin';
}

function AdminProfileMenu({
  compact = false,
  firstName,
  labelContent,
  onBudgetClick,
  onEmailClick,
  onLogout,
}: {
  compact?: boolean;
  firstName: string;
  labelContent?: ReactNode;
  onBudgetClick?: () => void;
  onEmailClick?: () => void;
  onLogout?: () => void;
}) {
  const menuItems: ProfileMenuItem[] = [
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
          {labelContent ?? <><NavbarIcon name="user" /> <span>{firstName}</span> <NavbarIcon name="chevron" /></>}
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
  onView,
  owner = false,
}: AdminNavbarProps) {
  const visibleTabs = owner ? adminTabs : adminTabs;
  const firstName = getAdminFirstName(adminName);
  const openEmail = onEmailClick ?? (() => undefined);
  const logout = onMobileAdminClick ?? onAdminClick;

  const desktopActions = (
    <>
      <NavbarButton variant="orange" onClick={onCreate}><NavbarIcon name="plus" /> <span>Novo agendamento</span></NavbarButton>
      <AdminProfileMenu
        firstName={firstName}
        onBudgetClick={onBudgetClick}
        onEmailClick={openEmail}
        onLogout={onAdminClick}
      />
    </>
  );

  const mobileActions = (
    <>
      <NavbarButton variant="ghost" compact onClick={onMobileMenu} ariaLabel="Abrir menu administrativo" title="Menu">
        <NavbarIcon name="menu" />
      </NavbarButton>
      <AdminProfileMenu
        firstName={firstName}
        labelContent={<><NavbarIcon name="user" /> <span>{firstName}</span></>}
        onBudgetClick={onBudgetClick}
        onEmailClick={openEmail}
        onLogout={logout}
      />
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
