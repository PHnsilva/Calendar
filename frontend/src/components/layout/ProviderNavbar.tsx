import BaseNavbar, { NavbarButton, NavbarIcon, type NavbarIconName } from './BaseNavbar';

export type ProviderNavItem = {
  active?: boolean;
  icon?: NavbarIconName;
  label: string;
  onClick?: () => void;
  to?: string;
};

type ProviderNavbarProps = {
  actions?: ProviderNavItem[];
  onMenu?: () => void;
  onProviderClick?: () => void;
  primaryAction?: ProviderNavItem;
  providerName?: string;
};

function renderProviderItem(item: ProviderNavItem, compact = false) {
  const content = (
    <>
      {item.icon ? <NavbarIcon name={item.icon} /> : null}
      {!compact ? <span>{item.label}</span> : null}
    </>
  );

  return (
    <NavbarButton
      key={item.label}
      to={item.to}
      onClick={item.onClick}
      compact={compact}
      ariaLabel={item.label}
      variant={item.active ? 'orange' : 'blue'}
    >
      {content}
    </NavbarButton>
  );
}

export default function ProviderNavbar({
  actions = [],
  onMenu,
  onProviderClick,
  primaryAction,
  providerName = 'Prestador',
}: ProviderNavbarProps) {
  const providerLabel = `Olá, ${providerName}`;
  const desktopActions = (
    <>
      {actions.map((item) => renderProviderItem(item))}
      <NavbarButton onClick={onProviderClick}><NavbarIcon name="user" /> <span>{providerLabel}</span> <NavbarIcon name="chevron" /></NavbarButton>
      {primaryAction ? (
        <NavbarButton variant="orange" to={primaryAction.to} onClick={primaryAction.onClick}>
          {primaryAction.icon ? <NavbarIcon name={primaryAction.icon} /> : null}
          <span>{primaryAction.label}</span>
        </NavbarButton>
      ) : null}
    </>
  );

  const mobileActions = (
    <>
      {actions.slice(0, 1).map((item) => renderProviderItem(item, true))}
      <NavbarButton compact onClick={onProviderClick} ariaLabel={providerLabel}><NavbarIcon name="user" /></NavbarButton>
      <NavbarButton variant="orange" compact onClick={onMenu ?? primaryAction?.onClick} ariaLabel="Menu do prestador"><NavbarIcon name="menu" /></NavbarButton>
    </>
  );

  return <BaseNavbar profile="provider" logoTo="/admin/dashboard?view=agendamentos" actions={desktopActions} mobileActions={mobileActions} />;
}
