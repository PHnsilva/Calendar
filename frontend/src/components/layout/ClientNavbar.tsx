import { useEffect, useState, type ReactNode } from 'react';
import BaseNavbar, { NavbarButton, NavbarIcon, type NavbarIconName } from './BaseNavbar';
import NavbarMenu from '../../shared/ui/NavbarMenu';
import {
  formatPhoneForDisplay,
  getClientProfileChangedEventName,
  getPhoneVerificationChangedEventName,
  getStoredClientProfile,
  getStoredPhoneVerification,
} from '../../lib/storage';

const CLIENT_BOOKINGS_PATH = '/meus-agendamentos';

type ClientNavbarPage = 'home' | 'my';

type ClientNavbarProps = {
  onConfirmPhone?: () => void;
  onCreate?: () => void;
  onProfile?: () => void;
  page?: ClientNavbarPage;
};

type ClientNavbarSnapshot = {
  isVerified: boolean;
  label: string;
  summary?: string;
};

type ProfileMenuItem = {
  action: 'home' | 'bookings' | 'profile' | 'create';
  icon: NavbarIconName;
  label: string;
  onClick?: () => void;
  to?: string;
};

type ClientProfileMenuProps = {
  compact?: boolean;
  labelContent?: ReactNode;
  onCreate?: () => void;
  onProfileAction: () => void;
  page: ClientNavbarPage;
  profileLabel: string;
  triggerClassName?: string;
  triggerVariant?: 'blue' | 'orange' | 'ghost';
};

function readClientNavbarSnapshot(): ClientNavbarSnapshot {
  const verification = getStoredPhoneVerification();
  const profile = getStoredClientProfile();
  const isVerified = Boolean(profile?.name || profile?.phone || profile?.email || verification);
  const firstName = profile?.name?.split(/\s+/)[0];
  const phone = profile?.phone || verification?.phone;

  return {
    isVerified,
    label: isVerified ? 'Perfil' : 'Cliente',
    summary: firstName || (phone ? formatPhoneForDisplay(phone) : undefined),
  };
}

function useClientNavbarSnapshot(): ClientNavbarSnapshot {
  const [snapshot, setSnapshot] = useState<ClientNavbarSnapshot>(() => readClientNavbarSnapshot());

  useEffect(() => {
    const refresh = () => setSnapshot(readClientNavbarSnapshot());
    window.addEventListener(getPhoneVerificationChangedEventName(), refresh);
    window.addEventListener(getClientProfileChangedEventName(), refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(getPhoneVerificationChangedEventName(), refresh);
      window.removeEventListener(getClientProfileChangedEventName(), refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return snapshot;
}

function ClientProfileMenu({
  compact = false,
  labelContent,
  onCreate,
  onProfileAction,
  page,
  profileLabel,
  triggerClassName,
  triggerVariant = 'blue',
}: ClientProfileMenuProps) {
  const navItem: ProfileMenuItem = page === 'my'
    ? { action: 'home', icon: 'home', label: 'Página inicial', to: '/' }
    : { action: 'bookings', icon: 'calendar', label: 'Meus agendamentos', to: CLIENT_BOOKINGS_PATH };

  const menuItems: ProfileMenuItem[] = [
    navItem,
    { action: 'profile', icon: 'user', label: profileLabel, onClick: onProfileAction },
    { action: 'create', icon: 'plus', label: 'Criar agendamento', onClick: onCreate },
  ];

  return (
    <NavbarMenu
      ariaLabel="Opções do cliente"
      trigger={({ toggle }) => (
        <NavbarButton
          compact={compact}
          onClick={toggle}
          ariaLabel="Abrir opções do cliente"
          title="Abrir opções do cliente"
          className={['wf-client-profile-trigger', triggerClassName].filter(Boolean).join(' ')}
          variant={triggerVariant}
        >
          {labelContent ?? <><NavbarIcon name="user" /> <span>{profileLabel}</span> <NavbarIcon name="chevron" /></>}
        </NavbarButton>
      )}
    >
      {({ close }) => menuItems.map((item) => {
        const content = <><NavbarIcon name={item.icon} /><span>{item.label}</span></>;

        if (item.to) {
          return (
            <NavbarButton
              key={item.label}
              to={item.to}
              variant="ghost"
              className="wf-profile-menu-link wf-profile-menu-item"
              ariaLabel={item.label}
              dataMenuAction={item.action}
              title={item.label}
              onClick={close}
            >
              {content}
            </NavbarButton>
          );
        }

        return (
          <button
            key={item.label}
            type="button"
            className="wf-profile-menu-item"
            data-menu-action={item.action}
            aria-label={item.label}
            title={item.label}
            role="menuitem"
            onClick={() => {
              close();
              item.onClick?.();
            }}
          >
            {content}
          </button>
        );
      })}
    </NavbarMenu>
  );
}

export default function ClientNavbar({ onConfirmPhone, onCreate, onProfile, page = 'home' }: ClientNavbarProps) {
  const isHome = page === 'home';
  const snapshot = useClientNavbarSnapshot();
  const profileLabel = snapshot.isVerified ? 'Perfil' : (isHome ? 'Olá! Visitante' : 'Cliente');
  const handleProfileAction = () => {
    onProfile?.();
  };
  void onConfirmPhone;

  const desktopProfileLabel = <><NavbarIcon name="user" /> <span>{profileLabel}</span></>;

  const desktopActions = isHome ? (
    <>
      <NavbarButton to={CLIENT_BOOKINGS_PATH} className="wf-client-bookings-trigger"><NavbarIcon name="calendar" /> <span>Meus agendamentos</span></NavbarButton>
      <NavbarButton variant="orange" className="wf-client-create-trigger" onClick={onCreate}><span>Criar agendamento</span> <NavbarIcon name="plus" /></NavbarButton>
      <ClientProfileMenu
        page={page}
        profileLabel={profileLabel}
        labelContent={desktopProfileLabel}
        triggerClassName="wf-client-profile-desktop"
        onProfileAction={handleProfileAction}
        onCreate={onCreate}
      />
    </>
  ) : (
    <>
      <NavbarButton to="/" className="wf-client-bookings-trigger"><NavbarIcon name="home" /> <span>Página inicial</span></NavbarButton>
      <NavbarButton variant="orange" className="wf-client-create-trigger" onClick={onCreate}><span>Criar agendamento</span> <NavbarIcon name="plus" /></NavbarButton>
      <ClientProfileMenu
        page={page}
        profileLabel={profileLabel}
        labelContent={desktopProfileLabel}
        triggerClassName="wf-client-profile-desktop"
        onProfileAction={handleProfileAction}
        onCreate={onCreate}
      />
    </>
  );

  const mobileNavigation = isHome ? (
    <NavbarButton
      compact
      to={CLIENT_BOOKINGS_PATH}
      className="wf-client-mobile-nav"
      ariaLabel="Ir para agendamentos"
      title="Agendamentos"
    >
      <NavbarIcon name="calendar" />
    </NavbarButton>
  ) : (
    <NavbarButton
      compact
      to="/"
      className="wf-client-mobile-nav"
      ariaLabel="Ir para início"
      title="Página inicial"
    >
      <NavbarIcon name="home" />
    </NavbarButton>
  );

  const mobileActions = (
    <>
      {mobileNavigation}
      <NavbarButton
        compact
        className="wf-client-mobile-user"
        onClick={handleProfileAction}
        ariaLabel={profileLabel}
        title={snapshot.summary ? `${profileLabel}: ${snapshot.summary}` : profileLabel}
      >
        <NavbarIcon name="user" />
      </NavbarButton>
      <ClientProfileMenu
        compact
        page={page}
        profileLabel={profileLabel}
        labelContent={<NavbarIcon name="menu" />}
        triggerClassName="wf-client-more-options-trigger"
        triggerVariant="orange"
        onProfileAction={handleProfileAction}
        onCreate={onCreate}
      />
    </>
  );

  return (
    <BaseNavbar
      profile="client"
      actions={desktopActions}
      mobileActions={mobileActions}
    />
  );
}
