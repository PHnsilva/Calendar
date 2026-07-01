import { useEffect, useState } from 'react';
import BaseNavbar, { NavbarButton } from './BaseNavbar';
import navCalendarIcon from '../../assets/navbar/client-nav-calendar.png';
import navCreateIcon from '../../assets/navbar/client-nav-create.png';
import navHomeIcon from '../../assets/navbar/client-nav-home.png';
import navProfileIcon from '../../assets/navbar/client-nav-profile.png';
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

type ClientNavbarPngIconName = 'calendar' | 'create' | 'home' | 'profile';

const CLIENT_NAVBAR_PNG_ICONS: Record<ClientNavbarPngIconName, string> = {
  calendar: navCalendarIcon,
  create: navCreateIcon,
  home: navHomeIcon,
  profile: navProfileIcon,
};

function ClientNavbarPngIcon({ name }: { name: ClientNavbarPngIconName }) {
  return (
    <span aria-hidden="true" className={`wf-icon wf-client-nav-png-icon wf-client-nav-png-icon--${name}`}>
      <img src={CLIENT_NAVBAR_PNG_ICONS[name]} alt="" draggable={false} />
    </span>
  );
}


function ClientNavbarPlusIcon() {
  return (
    <span aria-hidden="true" className="wf-icon wf-client-nav-plus-icon">
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M32 15v34M15 32h34" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      </svg>
    </span>
  );
}

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

export default function ClientNavbar({ onConfirmPhone, onCreate, onProfile, page = 'home' }: ClientNavbarProps) {
  const isHome = page === 'home';
  const snapshot = useClientNavbarSnapshot();
  const profileLabel = snapshot.isVerified ? 'Perfil' : (isHome ? 'Olá! Visitante' : 'Cliente');
  const handleProfileAction = () => {
    onProfile?.();
  };
  void onConfirmPhone;

  const desktopProfileLabel = <><ClientNavbarPngIcon name="profile" /> <span>Perfil</span></>;

  const desktopActions = isHome ? (
    <>
      <NavbarButton to={CLIENT_BOOKINGS_PATH} className="wf-client-bookings-trigger"><ClientNavbarPngIcon name="calendar" /> <span>Meus agendamentos</span></NavbarButton>
      <NavbarButton variant="orange" className="wf-client-create-trigger" onClick={onCreate}><ClientNavbarPlusIcon /> <span>Criar agendamento</span></NavbarButton>
      <NavbarButton
        className="wf-client-profile-trigger wf-client-profile-desktop"
        onClick={handleProfileAction}
        ariaLabel="Abrir perfil"
        title={snapshot.summary ? `Perfil: ${snapshot.summary}` : 'Perfil'}
      >
        {desktopProfileLabel}
      </NavbarButton>
    </>
  ) : (
    <>
      <NavbarButton to="/" className="wf-client-bookings-trigger"><ClientNavbarPngIcon name="home" /> <span>Página inicial</span></NavbarButton>
      <NavbarButton variant="orange" className="wf-client-create-trigger" onClick={onCreate}><ClientNavbarPlusIcon /> <span>Criar agendamento</span></NavbarButton>
      <NavbarButton
        className="wf-client-profile-trigger wf-client-profile-desktop"
        onClick={handleProfileAction}
        ariaLabel="Abrir perfil"
        title={snapshot.summary ? `Perfil: ${snapshot.summary}` : 'Perfil'}
      >
        {desktopProfileLabel}
      </NavbarButton>
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
      <ClientNavbarPngIcon name="calendar" />
    </NavbarButton>
  ) : (
    <NavbarButton
      compact
      to="/"
      className="wf-client-mobile-nav"
      ariaLabel="Ir para início"
      title="Página inicial"
    >
      <ClientNavbarPngIcon name="home" />
    </NavbarButton>
  );

  const mobileActions = (
    <>
      {mobileNavigation}
      <NavbarButton
        compact
        variant="orange"
        className="wf-client-mobile-create"
        onClick={onCreate}
        ariaLabel="Criar agendamento"
        title="Criar agendamento"
      >
        <ClientNavbarPlusIcon />
      </NavbarButton>
      <NavbarButton
        compact
        className="wf-client-mobile-user"
        onClick={handleProfileAction}
        ariaLabel={profileLabel}
        title={snapshot.summary ? `${profileLabel}: ${snapshot.summary}` : profileLabel}
      >
        <ClientNavbarPngIcon name="profile" />
      </NavbarButton>
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
