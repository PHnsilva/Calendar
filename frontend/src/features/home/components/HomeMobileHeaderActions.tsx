import { useEffect, useRef, useState } from 'react';
import { useHomeBookingSelection } from '../../../app/home-booking-provider';
import { getPhoneVerificationChangedEventName, getStoredPhoneVerification } from '../../../lib/storage';
import type { CalendarEvent } from '../../calendar/types';

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mobile-header-actions__bell-svg">
      <path
        d="M18 9.7c0-3.2-2.4-5.7-6-5.7S6 6.5 6 9.7c0 4.9-2 5.8-2 7.1 0 .8.6 1.2 1.4 1.2h13.2c.8 0 1.4-.4 1.4-1.2 0-1.3-2-2.2-2-7.1Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 19.2c.4.9 1.2 1.4 2.5 1.4s2.1-.5 2.5-1.4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path d="M12 2.8v1.1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function OptionsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="5.5" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="18.5" r="1.8" fill="currentColor" />
    </svg>
  );
}

function ProfileEditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.8 19.2c.8-2.8 3.3-4.5 6.2-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10.8" cy="8.2" r="3.4" stroke="currentColor" strokeWidth="1.8" />
      <path d="m15.4 17.9 4.2-4.2 1.6 1.6-4.2 4.2h-1.6v-1.6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}


function ProfileWarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mobile-header-menu-action__warning-svg">
      <circle cx="12" cy="12" r="9" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.9" />
      <path d="M12 6.8v6.4" stroke="#dc2626" strokeWidth="2.35" strokeLinecap="round" />
      <circle cx="12" cy="16.8" r="1.25" fill="#dc2626" />
    </svg>
  );
}

function CalendarEditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 3.7v2.6M17 3.7v2.6M4.8 9h14.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="4.6" y="5.4" width="14.8" height="14.2" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="m9 15.9 2.1 2.1 4.2-4.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ContactIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5.2 7.4h13.6v9.2H5.2V7.4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="m5.6 7.8 6.4 5 6.4-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatBookingDate(booking: CalendarEvent) {
  const date = new Date(`${booking.date}T12:00:00`);
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(date);
}

function getBookingTitle(booking: CalendarEvent) {
  return booking.serviceLabel || booking.title || 'Agendamento criado';
}

type ActivePopover = 'notifications' | 'options' | null;

export default function HomeMobileHeaderActions() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activePopover, setActivePopover] = useState<ActivePopover>(null);
  const [phoneVerified, setPhoneVerified] = useState(() => Boolean(getStoredPhoneVerification()));
  const {
    lastCreatedBooking,
    requestOpenBookings,
    requestOpenProfile,
  } = useHomeBookingSelection();

  useEffect(() => {
    if (!lastCreatedBooking) return;
    setActivePopover('notifications');
  }, [lastCreatedBooking]);


  useEffect(() => {
    const updatePhoneVerification = () => {
      setPhoneVerified(Boolean(getStoredPhoneVerification()));
    };

    window.addEventListener(getPhoneVerificationChangedEventName(), updatePhoneVerification);
    window.addEventListener('storage', updatePhoneVerification);
    return () => {
      window.removeEventListener(getPhoneVerificationChangedEventName(), updatePhoneVerification);
      window.removeEventListener('storage', updatePhoneVerification);
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && containerRef.current?.contains(target)) return;
      setActivePopover(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActivePopover(null);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const togglePopover = (popover: ActivePopover) => {
    setActivePopover((current) => current === popover ? null : popover);
  };

  const openBookings = () => {
    requestOpenBookings();
    setActivePopover(null);
  };

  const openProfile = () => {
    requestOpenProfile();
    setActivePopover(null);
  };

  const openContact = () => {
    window.dispatchEvent(new Event('home-mobile-header:open-contact'));
    setActivePopover(null);
  };

  return (
    <div ref={containerRef} className="mobile-header-actions" aria-label="Ações rápidas">
      <div className="mobile-header-actions__item mobile-header-actions__item--notifications">
        <button
          type="button"
          className="mobile-header-actions__button mobile-header-actions__button--notifications"
          onClick={() => togglePopover('notifications')}
          aria-label="Ver notificações de agendamento"
          aria-expanded={activePopover === 'notifications'}
          title="Notificações"
        >
          <BellIcon />
          {lastCreatedBooking ? <span className="mobile-header-actions__dot" aria-hidden="true" /> : null}
        </button>

        {activePopover === 'notifications' ? (
          <div className="mobile-header-popover mobile-header-popover--notifications" role="dialog" aria-label="Notificações">
            <span className="mobile-header-popover__eyebrow">Notificações</span>
            {lastCreatedBooking ? (
              <button type="button" className="mobile-header-booking-card" onClick={openBookings}>
                <strong>{getBookingTitle(lastCreatedBooking)}</strong>
                <span>{formatBookingDate(lastCreatedBooking)} · {lastCreatedBooking.startTime}</span>
                <small>{lastCreatedBooking.city || 'Cidade não informada'}</small>
              </button>
            ) : (
              <p className="mobile-header-popover__empty">Nenhum agendamento criado nesta sessão.</p>
            )}
          </div>
        ) : null}
      </div>

      <div className="mobile-header-actions__item mobile-header-actions__item--options">
        <button
          type="button"
          className="mobile-header-actions__button mobile-header-actions__button--options"
          onClick={() => togglePopover('options')}
          aria-label="Abrir opções gerais"
          aria-expanded={activePopover === 'options'}
          title="Opções gerais"
        >
          <OptionsIcon />
        </button>

        {activePopover === 'options' ? (
          <div className="mobile-header-popover mobile-header-popover--options" role="menu" aria-label="Opções gerais">
            <button type="button" className="mobile-header-menu-action" onClick={openProfile} role="menuitem">
              {phoneVerified ? <ProfileEditIcon /> : <ProfileWarningIcon />}
              <span>{phoneVerified ? 'Editar perfil' : 'Confirmar telefone'}</span>
            </button>
            <button type="button" className="mobile-header-menu-action" onClick={openBookings} role="menuitem">
              <CalendarEditIcon />
              <span>Editar agendamento</span>
            </button>
            <button type="button" className="mobile-header-menu-action" onClick={openContact} role="menuitem">
              <ContactIcon />
              <span>Contate-nos</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
