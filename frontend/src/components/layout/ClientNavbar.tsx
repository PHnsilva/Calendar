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
  className?: string;
  logoSrc?: string;
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


type ClientNavbarLineIconName = 'calendar' | 'home' | 'profile';

function ClientNavbarLineIcon({ name }: { name: ClientNavbarLineIconName }) {
  const commonProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
  } as const;

  const icon = name === 'calendar' ? (
    <svg {...commonProps}>
      <path d="M7 3.75v3M17 3.75v3M5.75 9.25h12.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M6.75 5.25h10.5a2 2 0 0 1 2 2v9.65a2 2 0 0 1-2 2H6.75a2 2 0 0 1-2-2V7.25a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.9" />
      <path d="M8.35 12.45h.02M12 12.45h.02M15.65 12.45h.02M8.35 15.6h.02M12 15.6h.02" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" />
    </svg>
  ) : name === 'home' ? (
    <svg {...commonProps}>
      <path d="M4.2 11.2 12 4.65l7.8 6.55" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.45 10.05v8.05h4.1v-4.35h2.9v4.35h4.1v-8.05" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg {...commonProps}>
      <path d="M12 12.1a3.55 3.55 0 1 0 0-7.1 3.55 3.55 0 0 0 0 7.1Z" stroke="currentColor" strokeWidth="2" />
      <path d="M5.65 19.15c.9-3.2 3.15-4.85 6.35-4.85s5.45 1.65 6.35 4.85" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  return <span aria-hidden="true" className={`wf-icon wf-client-nav-line-icon wf-client-nav-line-icon--${name}`}>{icon}</span>;
}

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

export default function ClientNavbar({ className, logoSrc, onConfirmPhone, onCreate, onProfile, page = 'home' }: ClientNavbarProps) {
  const isHome = page === 'home';
  const snapshot = useClientNavbarSnapshot();
  const [isNavbarScrolled, setIsNavbarScrolled] = useState(false);
  const profileLabel = snapshot.isVerified ? 'Perfil' : (isHome ? 'Olá! Visitante' : 'Cliente');

  useEffect(() => {
    if (!isHome) {
      return undefined;
    }

    let rafId = 0;
    const readScrollTop = () => Math.max(
      window.scrollY || 0,
      document.documentElement?.scrollTop || 0,
      document.body?.scrollTop || 0,
    );
    const handleScrollState = () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        setIsNavbarScrolled(readScrollTop() > 8);
      });
    };

    handleScrollState();
    window.addEventListener('scroll', handleScrollState, { passive: true });
    window.addEventListener('resize', handleScrollState);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScrollState);
      window.removeEventListener('resize', handleScrollState);
    };
  }, [isHome]);
  const handleProfileAction = () => {
    onProfile?.();
  };
  void onConfirmPhone;

  const desktopProfileLabel = <><ClientNavbarLineIcon name="profile" /> <span>Perfil</span></>;

  const desktopActions = isHome ? (
    <>
      <NavbarButton to={CLIENT_BOOKINGS_PATH} className="wf-client-bookings-trigger"><ClientNavbarLineIcon name="calendar" /> <span>Meus agendamentos</span></NavbarButton>
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
      <NavbarButton to="/" className="wf-client-bookings-trigger"><ClientNavbarLineIcon name="home" /> <span>Página inicial</span></NavbarButton>
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

  const navbarClassName = [
    className,
    isHome ? (isNavbarScrolled ? 'wf-client-navbar-scrolled' : 'wf-client-navbar-at-top') : undefined,
  ].filter(Boolean).join(' ');

  return (
    <BaseNavbar
      profile="client"
      actions={desktopActions}
      className={navbarClassName || undefined}
      logoSrc={logoSrc}
      mobileActions={mobileActions}
    />
  );
}
