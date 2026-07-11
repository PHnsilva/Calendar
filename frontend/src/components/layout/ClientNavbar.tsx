import { useEffect, useState } from 'react';
import BaseNavbar, { NavbarButton } from './BaseNavbar';
import navCalendarIcon from '../../assets/navbar/client-nav-calendar-mobile.png';
import navCreateIcon from '../../assets/navbar/client-nav-create.png';
import navHomeIcon from '../../assets/navbar/client-nav-home.png';
import navProfileIcon from '../../assets/navbar/client-nav-profile-mobile.png';
import clientProfileAvatarIcon from '../../assets/wireframes/icons/client-profile-avatar-unisex.png';
import clientAvatarFemaleAfro from '../../assets/wireframes/avatars/client-avatar-female-afro.png';
import clientAvatarFemaleLongBlack from '../../assets/wireframes/avatars/client-avatar-female-long-black.png';
import clientAvatarFemaleRedhead from '../../assets/wireframes/avatars/client-avatar-female-redhead.png';
import clientAvatarMaleBrownBeard from '../../assets/wireframes/avatars/client-avatar-male-brown-beard.png';
import clientAvatarMaleBlackBeard from '../../assets/wireframes/avatars/client-avatar-male-black-beard.png';
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
  avatarSrc?: string;
};

type ClientNavbarPngIconName = 'calendar' | 'create' | 'home' | 'profile';

const CLIENT_NAVBAR_PNG_ICONS: Record<ClientNavbarPngIconName, string> = {
  calendar: navCalendarIcon,
  create: navCreateIcon,
  home: navHomeIcon,
  profile: navProfileIcon,
};

const CLIENT_PROFILE_AVATARS: Record<string, string> = {
  default: clientProfileAvatarIcon,
  'female-afro': clientAvatarFemaleAfro,
  'female-long-black': clientAvatarFemaleLongBlack,
  'female-redhead': clientAvatarFemaleRedhead,
  'male-brown-beard': clientAvatarMaleBrownBeard,
  'male-black-beard': clientAvatarMaleBlackBeard,
};

function resolveClientProfileAvatar(avatarId?: string): string {
  const normalizedAvatarId = avatarId?.trim().toLowerCase();
  if (!normalizedAvatarId) return CLIENT_PROFILE_AVATARS.default;

  const directMatch = CLIENT_PROFILE_AVATARS[normalizedAvatarId];
  if (directMatch) return directMatch;

  const legacyMatch = Object.entries(CLIENT_PROFILE_AVATARS).find(([id, src]) => {
    const normalizedSrc = src.toLowerCase();
    return normalizedAvatarId === normalizedSrc
      || normalizedAvatarId.includes(id)
      || normalizedSrc.includes(normalizedAvatarId);
  });

  return legacyMatch?.[1] ?? CLIENT_PROFILE_AVATARS.default;
}


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

function ClientNavbarAvatar({ src }: { src: string }) {
  return (
    <span aria-hidden="true" className="wf-icon wf-client-nav-avatar">
      <img src={src} alt="" draggable={false} />
    </span>
  );
}


function ClientNavbarPlusIcon() {
  return (
    <span aria-hidden="true" className="wf-icon wf-client-nav-plus-icon">
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M32 15v10M32 39v10M15 32h10M39 32h10" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
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
    // Any persisted profile receives an avatar. Older profiles without avatarId
    // use the original male avatar until the user chooses another option.
    avatarSrc: profile ? resolveClientProfileAvatar(profile.avatarId) : undefined,
  };
}

function useClientNavbarSnapshot(): ClientNavbarSnapshot {
  const [snapshot, setSnapshot] = useState<ClientNavbarSnapshot>(() => readClientNavbarSnapshot());

  useEffect(() => {
    const refresh = () => setSnapshot(readClientNavbarSnapshot());
    const refreshAfterPersistence = () => {
      refresh();
      window.requestAnimationFrame(refresh);
      window.setTimeout(refresh, 0);
    };
    const refreshWhenVisible = () => {
      if (!document.hidden) refreshAfterPersistence();
    };

    window.addEventListener(getPhoneVerificationChangedEventName(), refreshAfterPersistence);
    window.addEventListener(getClientProfileChangedEventName(), refreshAfterPersistence);
    window.addEventListener('storage', refreshAfterPersistence);
    window.addEventListener('focus', refreshAfterPersistence);
    window.addEventListener('pageshow', refreshAfterPersistence);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.removeEventListener(getPhoneVerificationChangedEventName(), refreshAfterPersistence);
      window.removeEventListener(getClientProfileChangedEventName(), refreshAfterPersistence);
      window.removeEventListener('storage', refreshAfterPersistence);
      window.removeEventListener('focus', refreshAfterPersistence);
      window.removeEventListener('pageshow', refreshAfterPersistence);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
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
    const readScrollTop = () => {
      const candidates = [
        window.scrollY || 0,
        window.pageYOffset || 0,
        document.documentElement?.scrollTop || 0,
        document.body?.scrollTop || 0,
        (document.scrollingElement as HTMLElement | null)?.scrollTop || 0,
        (document.querySelector('.wf-page-shell') as HTMLElement | null)?.scrollTop || 0,
        (document.querySelector('.wf-client-landing') as HTMLElement | null)?.scrollTop || 0,
        (document.querySelector('.wf-landing-main') as HTMLElement | null)?.scrollTop || 0,
      ];

      return Math.max(...candidates);
    };

    const handleScrollState = () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        setIsNavbarScrolled(readScrollTop() > 8);
      });
    };

    const scrollTargets = [
      window,
      document,
      document.documentElement,
      document.body,
      document.scrollingElement,
      document.querySelector('.wf-page-shell'),
      document.querySelector('.wf-client-landing'),
      document.querySelector('.wf-landing-main'),
    ].filter(Boolean) as Array<Window | Document | Element>;

    handleScrollState();
    scrollTargets.forEach((target) => target.addEventListener('scroll', handleScrollState, { passive: true }));
    window.addEventListener('wheel', handleScrollState, { passive: true });
    window.addEventListener('touchmove', handleScrollState, { passive: true });
    window.addEventListener('resize', handleScrollState);
    window.addEventListener('orientationchange', handleScrollState);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      scrollTargets.forEach((target) => target.removeEventListener('scroll', handleScrollState));
      window.removeEventListener('wheel', handleScrollState);
      window.removeEventListener('touchmove', handleScrollState);
      window.removeEventListener('resize', handleScrollState);
      window.removeEventListener('orientationchange', handleScrollState);
    };
  }, [isHome]);
  const handleProfileAction = () => {
    onProfile?.();
  };
  void onConfirmPhone;

  const profileIcon = snapshot.avatarSrc
    ? <ClientNavbarAvatar src={snapshot.avatarSrc} />
    : <ClientNavbarLineIcon name="profile" />;
  const desktopProfileLabel = <>{profileIcon} <span>Perfil</span></>;

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
        {snapshot.avatarSrc ? <ClientNavbarAvatar src={snapshot.avatarSrc} /> : <ClientNavbarPngIcon name="profile" />}
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
