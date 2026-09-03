import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useHomeBookingSelection } from '../../../app/home-booking-context';
import { buildMailtoUrl } from '../../../lib/mailto';
import { getPhoneVerificationChangedEventName, getStoredPhoneVerification } from '../../../lib/storage';
import { buildBusinessWhatsAppUrl } from '../../../lib/support-contact';

const PHONE_NUMBER = '+55 31 9541-5323';
const COMPANY_EMAIL = 'SGpequenosReparos@gmail.com';

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

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12.05 3.2a8.72 8.72 0 0 0-7.47 13.22L3.5 20.5l4.18-1.1A8.72 8.72 0 1 0 12.05 3.2Z" fill="#25D366" />
      <path d="M9.12 7.72c-.2-.46-.42-.47-.61-.48h-.53c-.18 0-.49.07-.75.35-.26.28-.98.96-.98 2.35 0 1.38 1.01 2.72 1.15 2.91.14.18 1.96 3.16 4.87 4.32 2.42.96 2.91.77 3.43.72.53-.05 1.68-.69 1.91-1.35.23-.66.23-1.23.16-1.35-.06-.11-.25-.18-.52-.32-.26-.14-1.58-.78-1.82-.87-.24-.09-.41-.14-.59.14-.17.26-.66.87-.81 1.05-.15.18-.3.2-.56.06-.26-.14-1.1-.41-2.11-1.3-.78-.7-1.31-1.56-1.46-1.83-.15-.26-.02-.41.12-.54.12-.12.26-.32.4-.49.14-.16.18-.27.27-.46.09-.18.05-.35-.02-.49-.07-.14-.61-1.59-.85-2.1Z" fill="#fff" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="sg-header-instagram-gradient" x1="0" x2="1" y1="1" y2="0">
          <stop offset="0" stopColor="#FEDA75" />
          <stop offset="0.45" stopColor="#D62976" />
          <stop offset="0.75" stopColor="#962FBF" />
          <stop offset="1" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="5.2" fill="url(#sg-header-instagram-gradient)" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="#fff" strokeWidth="1.75" />
      <circle cx="17.1" cy="6.9" r="1.15" fill="#fff" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" fill="#f4f6fa" />
      <path
        d="M7.45 6.2c.28-.26 2.16-.28 2.54.14.38.4 1.03 1.97.97 2.34-.05.37-.49.67-.89.95-.15.1-.31.2-.34.33-.07.31.52 1.31 1.45 2.24.93.93 1.93 1.52 2.24 1.45.12-.03.23-.19.33-.34.28-.4.58-.84.95-.89.37-.06 1.94.59 2.34.97.42.38.4 2.26.14 2.54-.66.7-2 1.12-3.04 1-1.1-.13-3.14-.88-5.06-2.8-1.92-1.92-2.67-3.96-2.8-5.06-.12-1.04.3-2.38 1-3.04Z"
        fill="#394a60"
      />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="6.5" width="16" height="11" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="m5.5 8 6.5 5 6.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="8" y="8" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 15.5H5.8A1.8 1.8 0 0 1 4 13.7V5.8A1.8 1.8 0 0 1 5.8 4h7.9A1.8 1.8 0 0 1 15.5 5.8V6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

type ActivePopover = 'options' | 'contact' | null;

export default function HomeMobileHeaderActions() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activePopover, setActivePopover] = useState<ActivePopover>(null);
  const [phoneVerified, setPhoneVerified] = useState(() => Boolean(getStoredPhoneVerification()));
  const [isPhoneVisible, setIsPhoneVisible] = useState(false);
  const {
    lastCreatedBooking,
    requestOpenProfile,
  } = useHomeBookingSelection();

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
    setIsPhoneVisible(false);
  };

  const openBookings = () => {
    window.dispatchEvent(new CustomEvent('home-client:open-edit-bookings-modal'));
    setActivePopover(null);
  };

  const openProfile = () => {
    requestOpenProfile();
    setActivePopover(null);
  };

  const openContact = () => {
    setActivePopover('contact');
    setIsPhoneVisible(false);
  };

  const copyPhoneNumber = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(PHONE_NUMBER);
    } catch {
      // Mantém o número visível mesmo se o navegador bloquear o clipboard.
    }
  };

  return (
    <div ref={containerRef} className="mobile-header-actions" aria-label="Ações rápidas">
      <div className="mobile-header-actions__item mobile-header-actions__item--desktop-profile">
        <button
          type="button"
          className={`mobile-header-actions__button mobile-header-actions__button--profile${phoneVerified ? '' : ' mobile-header-actions__button--warning'}`}
          onClick={openProfile}
          aria-label={phoneVerified ? 'Editar perfil' : 'Confirmar telefone'}
          title={phoneVerified ? 'Editar perfil' : 'Confirmar telefone'}
        >
          {phoneVerified ? <ProfileEditIcon /> : <ProfileWarningIcon />}
        </button>
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
              <span>{lastCreatedBooking ? 'Ver último agendamento' : 'Meus agendamentos'}</span>
            </button>
            <button type="button" className="mobile-header-menu-action" onClick={openContact} role="menuitem">
              <ContactIcon />
              <span>Contate-nos</span>
            </button>
          </div>
        ) : null}

        {activePopover === 'contact' ? (
          <div className="mobile-header-popover mobile-header-popover--contact" role="dialog" aria-label="Contate-nos">
            <span className="mobile-header-popover__eyebrow">Contate-nos</span>
            <div className="mobile-header-contact-actions">
              <a
                className="mobile-header-contact-action"
                href={buildBusinessWhatsAppUrl()}
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir WhatsApp"
              >
                <WhatsAppIcon />
                <span>WhatsApp</span>
              </a>

              <a
                className="mobile-header-contact-action"
                href="https://www.instagram.com/sg_pequenos_reparos/"
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir Instagram"
              >
                <InstagramIcon />
                <span>Instagram</span>
              </a>

              <div className={['mobile-header-contact-action', 'mobile-header-contact-action--phone', isPhoneVisible ? 'mobile-header-contact-action--phone-open' : ''].join(' ')}>
                <button
                  type="button"
                  className="mobile-header-contact-action__toggle"
                  onClick={() => setIsPhoneVisible((current) => !current)}
                  aria-label={isPhoneVisible ? 'Ocultar telefone' : 'Mostrar telefone'}
                >
                  <PhoneIcon />
                  <span>{isPhoneVisible ? PHONE_NUMBER : 'Telefone'}</span>
                </button>
                {isPhoneVisible ? (
                  <button type="button" className="mobile-header-contact-action__copy" onClick={copyPhoneNumber} aria-label="Copiar telefone">
                    <CopyIcon />
                  </button>
                ) : null}
              </div>

              <a
                className="mobile-header-contact-action mobile-header-contact-action--email"
                href={buildMailtoUrl({ to: COMPANY_EMAIL, subject: '', body: '' })}
                aria-label="Enviar e-mail"
              >
                <EmailIcon />
                <span>E-mail</span>
              </a>
            </div>
            <small className="mobile-header-contact-founded">Empresa fundada em 15/09/2021</small>
          </div>
        ) : null}
      </div>
    </div>
  );
}
