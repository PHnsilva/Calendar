import { useEffect, useRef, useState, type ReactNode } from 'react';
import BaseNavbar, { NavbarButton, NavbarIcon, type NavbarIconName } from './BaseNavbar';

const CLIENT_BOOKINGS_PATH = '/meus-agendamentos';

type ClientNavbarPage = 'home' | 'my';

type ClientNavbarProps = {
  onConfirmPhone?: () => void;
  onCreate?: () => void;
  onMenu?: () => void;
  page?: ClientNavbarPage;
};

type ProfileMenuItem = {
  icon: NavbarIconName;
  label: string;
  onClick?: () => void;
  to?: string;
};

function ClientProfileMenu({
  compact = false,
  labelContent,
  onConfirmPhone,
  onCreate,
  onNotifications,
  page,
}: {
  compact?: boolean;
  labelContent?: ReactNode;
  onConfirmPhone?: () => void;
  onCreate?: () => void;
  onNotifications?: () => void;
  page: ClientNavbarPage;
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

  const navItem: ProfileMenuItem = page === 'my'
    ? { icon: 'home', label: 'Página inicial', to: '/' }
    : { icon: 'calendar', label: 'Meus agendamentos', to: CLIENT_BOOKINGS_PATH };

  const menuItems: ProfileMenuItem[] = [
    { icon: 'bell', label: 'Notificações', onClick: onNotifications },
    navItem,
    { icon: 'user', label: 'Confirmar telefone', onClick: onConfirmPhone },
    { icon: 'plus', label: 'Novo agendamento', onClick: onCreate },
  ];

  return (
    <div className="wf-profile-menu-wrap" ref={menuRef}>
      <NavbarButton
        compact={compact}
        onClick={() => setOpen((current) => !current)}
        ariaLabel="Abrir opções do cliente"
        title="Abrir opções do cliente"
        className="wf-client-profile-trigger"
      >
        {labelContent ?? <><NavbarIcon name="user" /> <span>{page === 'my' ? 'Cliente' : 'Olá! Visitante'}</span> <NavbarIcon name="chevron" /></>}
      </NavbarButton>
      {open ? (
        <div className="wf-profile-menu" role="menu" aria-label="Opções do cliente">
          {menuItems.map((item) => {
            const content = <><NavbarIcon name={item.icon} /><span>{item.label}</span></>;
            if (item.to) {
              return (
                <NavbarButton key={item.label} to={item.to} variant="ghost" className="wf-profile-menu-link" ariaLabel={item.label} onClick={() => setOpen(false)}>
                  {content}
                </NavbarButton>
              );
            }
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
              >
                {content}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function ClientNavbar({ onConfirmPhone, onCreate, onMenu, page = 'home' }: ClientNavbarProps) {
  const isHome = page === 'home';

  const desktopActions = isHome ? (
    <>
      <NavbarButton to={CLIENT_BOOKINGS_PATH}><NavbarIcon name="calendar" /> <span>Meus agendamentos</span></NavbarButton>
      <ClientProfileMenu page={page} onConfirmPhone={onConfirmPhone} onCreate={onCreate} onNotifications={onMenu} />
      <NavbarButton variant="orange" onClick={onCreate}><span>Criar agendamento</span> <NavbarIcon name="plus" /></NavbarButton>
    </>
  ) : (
    <>
      <NavbarButton to="/"><NavbarIcon name="home" /> <span>Página inicial</span></NavbarButton>
      <ClientProfileMenu page={page} onConfirmPhone={onConfirmPhone} onCreate={onCreate} onNotifications={onMenu} />
      <NavbarButton variant="orange" onClick={onCreate}><NavbarIcon name="plus" /> <span>Novo agendamento</span></NavbarButton>
    </>
  );

  const homeMobileActions = (
    <>
      <NavbarButton to={isHome ? CLIENT_BOOKINGS_PATH : '/'} compact ariaLabel={isHome ? 'Meus agendamentos' : 'Página inicial'}>
        <NavbarIcon name={isHome ? 'calendar' : 'home'} />
      </NavbarButton>
      <ClientProfileMenu compact page={page} labelContent={<NavbarIcon name="user" />} onConfirmPhone={onConfirmPhone} onCreate={onCreate} onNotifications={onMenu} />
      <NavbarButton variant="orange" compact onClick={onMenu ?? onCreate} ariaLabel={isHome ? 'Contato' : 'Notificações'}>
        <NavbarIcon name="menu" />
      </NavbarButton>
    </>
  );

  const bookingsMobileLeading = (
    <NavbarButton variant="ghost" compact className="wf-client-mobile-menu" onClick={onMenu} ariaLabel="Menu">
      <NavbarIcon name="menu" />
    </NavbarButton>
  );

  const bookingsMobileActions = (
    <>
      <ClientProfileMenu
        page={page}
        labelContent={<><NavbarIcon name="user" /><span>Cliente</span><NavbarIcon name="chevron" /></>}
        onConfirmPhone={onConfirmPhone}
        onCreate={onCreate}
        onNotifications={onMenu}
      />
      <NavbarButton variant="orange" compact onClick={onCreate} ariaLabel="Novo agendamento">
        <NavbarIcon name="plus" />
      </NavbarButton>
    </>
  );

  return (
    <BaseNavbar
      profile="client"
      actions={desktopActions}
      mobileLeadingAction={isHome ? undefined : bookingsMobileLeading}
      mobileActions={isHome ? homeMobileActions : bookingsMobileActions}
    />
  );
}
