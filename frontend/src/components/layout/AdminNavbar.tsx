import { useEffect, useRef, useState, type ReactNode } from 'react';
import BaseNavbar, { NavbarButton, NavbarIcon, type NavbarIconName } from './BaseNavbar';

export type AdminNavView = 'email' | 'agendamentos' | 'bloqueios' | 'historico' | 'extrato';

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
  icon: NavbarIconName;
  label: string;
  onClick?: () => void;
  danger?: boolean;
};

const adminTabs: AdminTab[] = [
  { key: 'email', label: 'Email', icon: 'mail' },
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
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const menuItems: ProfileMenuItem[] = [
    { icon: 'bell', label: 'Notificações', onClick: onNotificationsClick },
    { icon: 'mail', label: 'Email', onClick: onEmailClick },
    { icon: 'budget', label: 'Orçamento', onClick: onBudgetClick },
    { icon: 'user', label: 'Sair', onClick: onLogout, danger: true },
  ];

  return (
    <div className="wf-profile-menu-wrap" ref={menuRef}>
      <NavbarButton
        compact={compact}
        onClick={() => setOpen((current) => !current)}
        ariaLabel="Abrir opções do administrador"
        title="Abrir opções do administrador"
        className="wf-admin-profile-trigger"
      >
        {labelContent ?? <><NavbarIcon name="user" /> <span>{greeting}</span> <NavbarIcon name="chevron" /></>}
      </NavbarButton>
      {open ? (
        <div className="wf-profile-menu" role="menu" aria-label="Opções do administrador">
          {menuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={item.danger ? 'is-danger' : undefined}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onClick?.();
              }}
            >
              <NavbarIcon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
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
  const openEmail = onEmailClick ?? (() => onView?.('email'));

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
        greeting={greeting}
        labelContent={<><NavbarIcon name="user" /><span>Admin</span><NavbarIcon name="chevron" /></>}
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
