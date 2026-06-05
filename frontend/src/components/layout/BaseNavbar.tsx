import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/brand/logowithname.png';

type NavbarProfile = 'client' | 'admin' | 'provider';
type NavbarButtonVariant = 'blue' | 'orange' | 'ghost';

export type NavbarIconName =
  | 'bell'
  | 'budget'
  | 'calendar'
  | 'chart'
  | 'chevron'
  | 'clock'
  | 'home'
  | 'lock'
  | 'mail'
  | 'menu'
  | 'plus'
  | 'user';

type BaseNavbarProps = {
  profile: NavbarProfile;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  mobileLeadingAction?: ReactNode;
  logoLabel?: string;
  logoTo?: string;
  mobileActions?: ReactNode;
};

type NavbarButtonProps = {
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
  compact?: boolean;
  dataMenuAction?: string;
  onClick?: () => void;
  title?: string;
  to?: string;
  variant?: NavbarButtonVariant;
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function NavbarIcon({ name }: { name: NavbarIconName }) {
  const common = {
    viewBox: '0 0 64 64',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
  } as const;
  const line = {
    stroke: 'currentColor',
    strokeWidth: 4.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  const icons: Record<NavbarIconName, ReactNode> = {
    bell: (
      <svg {...common}>
        <path d="M20 28c0-8.5 5-15 12-15s12 6.5 12 15v8l6 9H14l6-9v-8Z" {...line} />
        <path d="M27 51a6 6 0 0 0 10 0" {...line} />
        <path d="M32 8v5" {...line} />
      </svg>
    ),
    budget: (
      <svg {...common}>
        <rect x="13" y="8" width="38" height="48" rx="10" {...line} />
        <path d="M23 18h18M22 29h20M22 38h11" {...line} />
        <circle cx="40" cy="43" r="10" {...line} />
        <path d="M40 37v12M34 43h12" {...line} />
      </svg>
    ),
    calendar: (
      <svg {...common}>
        <rect x="12" y="14" width="40" height="38" rx="8" {...line} />
        <path d="M22 8v12M42 8v12M12 25h40" {...line} />
        <path d="M22 35h.01M32 35h.01M42 35h.01M22 44h.01M32 44h.01M42 44h.01" {...line} />
      </svg>
    ),
    chart: (
      <svg {...common}>
        <path d="M12 52V12M12 52h42" {...line} />
        <rect x="20" y="32" width="8" height="15" rx="3" fill="currentColor" />
        <rect x="34" y="19" width="8" height="28" rx="3" fill="currentColor" />
        <rect x="48" y="25" width="8" height="22" rx="3" fill="currentColor" />
      </svg>
    ),
    chevron: (
      <svg {...common}>
        <path d="m20 26 12 12 12-12" {...line} />
      </svg>
    ),
    clock: (
      <svg {...common}>
        <circle cx="32" cy="32" r="24" {...line} />
        <path d="M32 18v16l10 6" {...line} />
      </svg>
    ),
    home: (
      <svg {...common}>
        <path d="M9 30 32 11l23 19" {...line} />
        <path d="M15 27v27h34V27" {...line} />
        <path d="M25 54V38h14v16" {...line} />
      </svg>
    ),
    lock: (
      <svg {...common}>
        <rect x="14" y="28" width="36" height="26" rx="8" {...line} />
        <path d="M21 28v-7a11 11 0 0 1 22 0v7" {...line} />
        <path d="M32 38v7" {...line} />
      </svg>
    ),
    mail: (
      <svg {...common}>
        <rect x="10" y="16" width="44" height="34" rx="8" {...line} />
        <path d="m13 21 19 16 19-16" {...line} />
        <path d="m22 33-9 11M42 33l9 11" {...line} />
      </svg>
    ),
    menu: (
      <svg {...common}>
        <path d="M13 19h38M13 32h38M13 45h38" {...line} />
      </svg>
    ),
    plus: (
      <svg {...common}>
        <circle cx="32" cy="32" r="26" stroke="currentColor" strokeWidth="4.4" />
        <path d="M32 19v26M19 32h26" stroke="currentColor" strokeWidth="5.4" strokeLinecap="round" />
      </svg>
    ),
    user: (
      <svg {...common}>
        <circle cx="32" cy="22" r="10" {...line} />
        <path d="M14 55c3.7-12.2 9.7-18.3 18-18.3S46.3 42.8 50 55" {...line} />
      </svg>
    ),
  };

  return <span aria-hidden="true" className={cx('wf-icon', `wf-icon--${name}`)}>{icons[name]}</span>;
}

export function NavbarButton({
  children,
  ariaLabel,
  className,
  compact = false,
  dataMenuAction,
  onClick,
  title,
  to,
  variant = 'blue',
}: NavbarButtonProps) {
  const buttonClassName = cx('wf-top-btn', `wf-top-btn--${variant}`, compact && 'wf-top-btn--compact', className);

  if (to) {
    return (
      <Link to={to} className={buttonClassName} aria-label={ariaLabel} data-menu-action={dataMenuAction} title={title} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={buttonClassName} data-menu-action={dataMenuAction} onClick={onClick} aria-label={ariaLabel} title={title}>
      {children}
    </button>
  );
}

export default function BaseNavbar({
  actions,
  children,
  className,
  logoLabel = 'SG Pequenos Reparos Agendamentos',
  logoTo = '/',
  mobileLeadingAction,
  mobileActions,
  profile,
}: BaseNavbarProps) {
  return (
    <header className={cx('wf-header', 'wf-navbar', `wf-navbar--${profile}`, profile === 'client' && 'wf-header--public', profile === 'admin' && 'wf-header--admin', Boolean(children) && 'wf-navbar--has-nav', Boolean(mobileLeadingAction) && 'wf-navbar--has-mobile-leading', className)}>
      {mobileLeadingAction ? <nav className="wf-navbar__mobile-leading" aria-label="Menu">{mobileLeadingAction}</nav> : null}
      <Link to={logoTo} className="wf-logo wf-navbar__logo">
        <img src={logo} alt={logoLabel} />
      </Link>
      {children ? <nav className="wf-navbar__nav" aria-label="Navegação principal">{children}</nav> : null}
      {actions ? <nav className="wf-header-actions wf-navbar__actions" aria-label="Ações principais">{actions}</nav> : null}
      {mobileActions ? <nav className="wf-mobile-actions wf-navbar__mobile-actions" aria-label="Ações rápidas">{mobileActions}</nav> : null}
    </header>
  );
}
