import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import AppShell from "./AppShell";
import Logo from "../components/branding/Logo";
import { useHomeBookingSelection } from "../app/home-booking-provider";
import HomeMobileHeaderActions from "../features/home/components/HomeMobileHeaderActions";
import { buildMailtoUrl } from "../lib/mailto";

const PHONE_NUMBER = "+55 31 9541-5323";
const COMPANY_EMAIL = "SGpequenosReparos@gmail.com";

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
        <linearGradient id="sg-instagram-gradient" x1="0" x2="1" y1="1" y2="0">
          <stop offset="0" stopColor="#FEDA75" />
          <stop offset="0.45" stopColor="#D62976" />
          <stop offset="0.75" stopColor="#962FBF" />
          <stop offset="1" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="5.2" fill="url(#sg-instagram-gradient)" />
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

export default function PublicLayout() {
  const location = useLocation();
  const { requestQuickBooking, requestOpenBookings } = useHomeBookingSelection();
  const contactRef = useRef<HTMLDivElement | null>(null);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isPhoneVisible, setIsPhoneVisible] = useState(false);
  const [isEmailVisible, setIsEmailVisible] = useState(false);

  const isHomePage = location.pathname === "/";

  useEffect(() => {
    const handleOpenContact = () => {
      setIsContactOpen(true);
      setIsPhoneVisible(false);
      setIsEmailVisible(false);
    };

    window.addEventListener("home-mobile-header:open-contact", handleOpenContact);
    return () => window.removeEventListener("home-mobile-header:open-contact", handleOpenContact);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && contactRef.current?.contains(target)) return;
      setIsContactOpen(false);
      setIsPhoneVisible(false);
      setIsEmailVisible(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsContactOpen(false);
      setIsPhoneVisible(false);
      setIsEmailVisible(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogoClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setIsContactOpen((current) => !current);
    setIsPhoneVisible(false);
    setIsEmailVisible(false);
  };

  const copyPhoneNumber = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(PHONE_NUMBER);
    } catch {
      // Mantém o número visível mesmo se o navegador bloquear o clipboard.
    }
  };

  const handleEmailClick = () => {
    if (window.matchMedia("(max-width: 730px)").matches) {
      window.location.href = buildMailtoUrl({ to: COMPANY_EMAIL, subject: "", body: "" });
      return;
    }
    setIsEmailVisible((current) => !current);
    setIsPhoneVisible(false);
  };

  const copyEmail = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(COMPANY_EMAIL);
    } catch {
      setIsEmailVisible(true);
    }
  };

  const header = (
    <header className={["public-header", isHomePage ? "public-header--home" : ""].filter(Boolean).join(" ")}>
      <div ref={contactRef} className="brand-lockup-contact-anchor">
        <Link to="/" className="brand-lockup" aria-label="Abrir contatos da empresa" onClick={handleLogoClick}>
          <Logo />
        </Link>

        {isContactOpen ? (
          <div className="brand-contact-mini-popover" role="dialog" aria-label="Contate-nos">
            <div className="brand-contact-mini-popover__actions">
              <a
                className="brand-contact-mini-popover__action"
                href="https://wa.me/553195415323"
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir WhatsApp"
              >
                <WhatsAppIcon />
              </a>

              <a
                className="brand-contact-mini-popover__action"
                href="https://www.instagram.com/sg_pequenos_reparos/"
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir Instagram"
              >
                <InstagramIcon />
              </a>

              <button
                type="button"
                className={["brand-contact-mini-popover__action", "brand-contact-mini-popover__action--phone", isPhoneVisible ? "brand-contact-mini-popover__action--phone-open" : ""].join(" ")}
                onClick={() => setIsPhoneVisible((current) => !current)}
                aria-label={isPhoneVisible ? "Ocultar telefone" : "Mostrar telefone"}
              >
                <PhoneIcon />
                {isPhoneVisible ? (
                  <span className="brand-contact-mini-popover__phone-value">
                    {PHONE_NUMBER}
                    <button type="button" onClick={copyPhoneNumber} aria-label="Copiar telefone">
                      <CopyIcon />
                    </button>
                  </span>
                ) : null}
              </button>

              <button
                type="button"
                className={["brand-contact-mini-popover__action", "brand-contact-mini-popover__action--email", isEmailVisible ? "brand-contact-mini-popover__action--email-open" : ""].join(" ")}
                onClick={handleEmailClick}
                aria-label={isEmailVisible ? "Ocultar e-mail" : "Mostrar e-mail"}
              >
                <EmailIcon />
                {isEmailVisible ? (
                  <span className="brand-contact-mini-popover__email-value">
                    {COMPANY_EMAIL}
                    <button type="button" onClick={copyEmail} aria-label="Copiar e-mail">
                      <CopyIcon />
                    </button>
                  </span>
                ) : null}
              </button>
            </div>

            <span className="brand-contact-mini-popover__founded">Empresa fundada em 15/09/2021</span>
          </div>
        ) : null}
      </div>

      <div className={["public-header__actions", isHomePage ? "public-header__actions--home" : ""].filter(Boolean).join(" ")}>
        {isHomePage ? <HomeMobileHeaderActions /> : null}

        {isHomePage ? (
          <>
            <button
              type="button"
              className="header-booking-action header-booking-action--compact-plus header-booking-action--accent-orange"
              onClick={requestQuickBooking}
              aria-label="Novo agendamento"
              title="Novo agendamento"
            >
              <span className="header-booking-action__icon" aria-hidden="true">
                +
              </span>
            </button>

            <button
              type="button"
              className="header-booking-action header-booking-action--sidebar-focus header-booking-action--bookings"
              onClick={requestOpenBookings}
            >
              <span>Meus agendamentos</span>
            </button>
          </>
        ) : null}
      </div>
    </header>
  );

  return (
    <AppShell header={header}>
      <main className="public-layout__content">
        <Outlet />
      </main>
    </AppShell>
  );
}
