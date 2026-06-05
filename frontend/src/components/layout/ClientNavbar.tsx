import type { ReactNode } from 'react';
import BaseNavbar, { NavbarButton, NavbarIcon, type NavbarIconName } from './BaseNavbar';
import NavbarMenu from '../../shared/ui/NavbarMenu';

const CLIENT_BOOKINGS_PATH = '/meus-agendamentos';

type ClientNavbarPage = 'home' | 'my';

type ClientNavbarProps = {
  onConfirmPhone?: () => void;
  onCreate?: () => void;
  onNotifications?: () => void;
  page?: ClientNavbarPage;
};

type ProfileMenuItem = {
  action: 'notifications' | 'home' | 'bookings' | 'profile' | 'create';
  icon: NavbarIconName;
  label: string;
  onClick?: () => void;
  to?: string;
};

type ClientProfileMenuProps = {
  compact?: boolean;
  labelContent?: ReactNode;
  onConfirmPhone?: () => void;
  onCreate?: () => void;
  onNotifications?: () => void;
  page: ClientNavbarPage;
  triggerClassName?: string;
  triggerVariant?: 'blue' | 'orange' | 'ghost';
};

function ClientProfileMenu({
  compact = false,
  labelContent,
  onConfirmPhone,
  onCreate,
  onNotifications,
  page,
  triggerClassName,
  triggerVariant = 'blue',
}: ClientProfileMenuProps) {
  const navItem: ProfileMenuItem = page === 'my'
    ? { action: 'home', icon: 'home', label: 'Início', to: '/' }
    : { action: 'bookings', icon: 'calendar', label: 'Agendamentos', to: CLIENT_BOOKINGS_PATH };

  const menuItems: ProfileMenuItem[] = [
    navItem,
    { action: 'notifications', icon: 'bell', label: 'Notificações', onClick: onNotifications },
    { action: 'profile', icon: 'user', label: page === 'my' ? 'Perfil' : 'Confirmar telefone', onClick: onConfirmPhone },
    { action: 'create', icon: 'plus', label: 'Novo agendamento', onClick: onCreate },
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
          {labelContent ?? <><NavbarIcon name="user" /> <span>Cliente</span> <NavbarIcon name="chevron" /></>}
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

export default function ClientNavbar({ onConfirmPhone, onCreate, onNotifications, page = 'home' }: ClientNavbarProps) {
  const isHome = page === 'home';

  const desktopActions = isHome ? (
    <>
      <NavbarButton to={CLIENT_BOOKINGS_PATH}><NavbarIcon name="calendar" /> <span>Agendamentos</span></NavbarButton>
      <ClientProfileMenu page={page} onConfirmPhone={onConfirmPhone} onCreate={onCreate} onNotifications={onNotifications} />
      <NavbarButton variant="orange" onClick={onCreate}><span>Criar agendamento</span> <NavbarIcon name="plus" /></NavbarButton>
    </>
  ) : (
    <>
      <NavbarButton to="/"><NavbarIcon name="home" /> <span>Início</span></NavbarButton>
      <ClientProfileMenu page={page} onConfirmPhone={onConfirmPhone} onCreate={onCreate} onNotifications={onNotifications} />
      <NavbarButton variant="orange" onClick={onCreate}><span>Criar agendamento</span> <NavbarIcon name="plus" /></NavbarButton>
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
      title="Início"
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
        onClick={onConfirmPhone}
        ariaLabel={isHome ? 'Confirmar telefone' : 'Abrir perfil'}
        title={isHome ? 'Confirmar telefone' : 'Perfil'}
      >
        <NavbarIcon name="user" />
      </NavbarButton>
      <ClientProfileMenu
        compact
        page={page}
        labelContent={<NavbarIcon name="menu" />}
        triggerClassName="wf-client-more-options-trigger"
        triggerVariant="orange"
        onConfirmPhone={onConfirmPhone}
        onCreate={onCreate}
        onNotifications={onNotifications}
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
