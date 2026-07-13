import { useState, type MouseEvent, type ReactNode } from "react";
import footerEmailContactIcon from "../../assets/wireframes/icons/footer-email-wireframe.png";
import footerLocationContactIcon from "../../assets/footer/contact-location-red.svg";
import footerPhoneContactIcon from "../../assets/footer/contact-phone-chat-green.svg";

type FooterIconName = string;

type FooterRedirectTarget = {
  label: string;
  title: string;
  description: string;
  url: string;
  method: "external" | "email";
  icon: FooterIconName;
};

type ClientFooterProps = {
  brand: ReactNode;
  onContact: () => void;
  onHelp: () => void;
  onServices: () => void;
  openExternal: (url: string) => void;
  renderIcon: (name: FooterIconName) => ReactNode;
  supportEmail: string;
  supportInstagramUrl: string;
  supportWhatsAppUrl: string;
  supportPhoneDisplay?: string;
  serviceCitiesLabel?: string;
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

function phoneHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;
  const normalized = digits.startsWith("55") ? digits : `55${digits}`;
  return `tel:+${normalized}`;
}

function FooterContactAsset({ kind }: { kind: "phone" | "email" | "location" }) {
  const iconSrc = {
    phone: footerPhoneContactIcon,
    email: footerEmailContactIcon,
    location: footerLocationContactIcon,
  }[kind];

  return (
    <img
      className={`cm-footer__contact-asset cm-footer__contact-asset--${kind}`}
      src={iconSrc}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}

export function ClientFooter({
  brand,
  onContact,
  onHelp,
  onServices,
  openExternal,
  renderIcon,
  supportEmail,
  supportInstagramUrl,
  supportWhatsAppUrl,
  supportPhoneDisplay = "(31) 9541-5323",
  serviceCitiesLabel = "Itabirito, Ouro Preto, Moeda, Belo Horizonte e Nova Lima",
}: ClientFooterProps) {
  const [redirectTarget, setRedirectTarget] = useState<FooterRedirectTarget | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);
  const [phoneCopied, setPhoneCopied] = useState(false);

  const closeRedirectModal = () => {
    setRedirectTarget(null);
  };

  const requestRedirect = (target: FooterRedirectTarget) => {
    setRedirectTarget(target);
  };

  const confirmRedirect = () => {
    if (!redirectTarget) return;
    const target = redirectTarget;
    setRedirectTarget(null);
    if (target.method === "email") {
      window.location.href = target.url;
      return;
    }
    openExternal(target.url);
  };

  const requestInstagramRedirect = () => requestRedirect({
    label: "Instagram",
    title: "Abrir Instagram?",
    description: "Você será redirecionado para o perfil oficial da SG Pequenos Reparos em uma nova aba.",
    url: supportInstagramUrl,
    method: "external",
    icon: "footer-instagram-social",
  });

  const requestWhatsAppRedirect = () => requestRedirect({
    label: "WhatsApp",
    title: "Abrir WhatsApp?",
    description: "Você será redirecionado para iniciar uma conversa com a SG Pequenos Reparos.",
    url: supportWhatsAppUrl,
    method: "external",
    icon: "footer-whatsapp-social",
  });

  const copyTextToClipboard = async (value: string, fallbackMessage: string, onCopied: () => void) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const input = document.createElement("input");
        input.value = value;
        input.setAttribute("readonly", "true");
        input.style.position = "fixed";
        input.style.left = "-9999px";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      onCopied();
    } catch {
      window.alert(fallbackMessage);
    }
  };

  const copyEmailToClipboard = async () => {
    await copyTextToClipboard(supportEmail, `Copie o e-mail: ${supportEmail}`, () => {
      setEmailCopied(true);
      window.setTimeout(() => setEmailCopied(false), 1600);
    });
  };

  const copyPhoneToClipboard = async () => {
    await copyTextToClipboard(supportPhoneDisplay, `Copie o telefone: ${supportPhoneDisplay}`, () => {
      setPhoneCopied(true);
      window.setTimeout(() => setPhoneCopied(false), 1600);
    });
  };

  const requestEmailRedirect = () => requestRedirect({
    label: "E-mail",
    title: "Abrir e-mail?",
    description: `Seu aplicativo de e-mail será aberto para enviar uma mensagem para ${supportEmail}.`,
    url: `mailto:${supportEmail}`,
    method: "email",
    icon: "footer-email-social",
  });

  const handleEmailAction = () => {
    const isMobileFooter = window.matchMedia?.("(max-width: 900px)").matches;
    if (isMobileFooter) {
      requestEmailRedirect();
      return;
    }
    void copyEmailToClipboard();
  };

  const handlePhoneAction = (event: MouseEvent<HTMLAnchorElement>) => {
    const isMobileFooter = window.matchMedia?.("(max-width: 900px)").matches;
    if (isMobileFooter) return;
    event.preventDefault();
    void copyPhoneToClipboard();
  };

  const telHref = phoneHref(supportPhoneDisplay);

  return (
    <>
      <footer className="cm-footer" aria-label="Rodapé SG Pequenos Reparos">
        <div className="cm-footer__shell">
          <section className="cm-footer__brand-card" aria-label="SG Pequenos Reparos">
            <div className="cm-footer__brand">{brand}</div>
            <button type="button" className="cm-footer__contact-button" onClick={onContact}>
              <span>Fale conosco</span>
              <span className="cm-footer__contact-button-arrow" aria-hidden="true">›</span>
            </button>
            <div className="cm-footer__brand-copy">
              <span className="cm-footer__brand-title">Pequenos reparos, grandes soluções.</span>
              <p>Confiança, qualidade e agilidade para facilitar o seu dia a dia.</p>
            </div>
          </section>

          <nav className="cm-footer__nav" aria-label="Navegação do rodapé">
            <h2>Navegação</h2>
            <button type="button" onClick={onHelp}>Precisa de ajuda?</button>
            <button type="button" onClick={onServices}>Serviços prestados</button>
            <button type="button" onClick={onContact}>Contato</button>
          </nav>

          <section className="cm-footer__contact" aria-label="Fale conosco">
            <h2>Fale conosco</h2>
            <a
              className="cm-footer__contact-row cm-footer__contact-row--phone"
              href={telHref}
              onClick={handlePhoneAction}
              aria-label="Ligar no celular ou copiar telefone no desktop"
              title={supportPhoneDisplay}
            >
              <span className="cm-footer__row-icon cm-footer__row-icon--phone"><FooterContactAsset kind="phone" /></span>
              <span className="cm-footer__row-text">{phoneCopied ? "Telefone copiado" : supportPhoneDisplay}</span>
            </a>
            <button
              type="button"
              className="cm-footer__contact-row cm-footer__contact-row--email"
              onClick={handleEmailAction}
              aria-label="Copiar e-mail no desktop ou abrir e-mail no celular"
              title={supportEmail}
            >
              <span className="cm-footer__row-icon cm-footer__row-icon--email"><FooterContactAsset kind="email" /></span>
              <span className="cm-footer__row-text">{emailCopied ? "E-mail copiado" : supportEmail}</span>
            </button>
            <div className="cm-footer__contact-row cm-footer__contact-row--location">
              <span className="cm-footer__row-icon cm-footer__row-icon--location"><FooterContactAsset kind="location" /></span>
              <span className="cm-footer__row-text cm-footer__row-text--stacked"><b>Atendemos em:</b><small>{serviceCitiesLabel}</small></span>
            </div>
          </section>

          <section className="cm-footer__social" aria-label="Siga e fique em contato">
            <h2>Siga &amp; fique em contato</h2>
            <button
              type="button"
              className="cm-footer__social-item cm-footer__social-item--instagram"
              aria-label="Abrir Instagram da SG Pequenos Reparos"
              onClick={requestInstagramRedirect}
            >
              <span className="cm-footer__social-icon">{renderIcon("footer-instagram-social")}</span>
              <span className="cm-footer__social-text"><b>Instagram</b><small>@sgpequenosreparos</small></span>
            </button>
            <button
              type="button"
              className="cm-footer__social-item cm-footer__social-item--email"
              aria-label="Copiar e-mail no desktop ou abrir e-mail no celular"
              onClick={handleEmailAction}
              title={supportEmail}
            >
              <span className="cm-footer__social-icon">{renderIcon("footer-email-social")}</span>
              <span className="cm-footer__social-text"><b>Email</b><small>{emailCopied ? "E-mail copiado" : supportEmail}</small></span>
            </button>
            <button
              type="button"
              className="cm-footer__social-item cm-footer__social-item--whatsapp"
              aria-label="Abrir WhatsApp da SG Pequenos Reparos"
              onClick={requestWhatsAppRedirect}
            >
              <span className="cm-footer__social-icon">{renderIcon("footer-whatsapp-social")}</span>
              <span className="cm-footer__social-text"><b>WhatsApp</b><small>{supportPhoneDisplay}</small></span>
            </button>
          </section>
        </div>

        <div className="cm-footer__bottom">
          <p>© 2024 <b>SG Pequenos Reparos.</b> Todos os direitos reservados.</p>
          <p>Desenvolvido com <span aria-hidden="true">♥</span> para facilitar a sua vida.</p>
        </div>
      </footer>

      {redirectTarget ? (
        <div className="cm-footer-redirect" role="presentation" onClick={closeRedirectModal}>
          <section
            className={cx("cm-footer-redirect__dialog", `cm-footer-redirect__dialog--${redirectTarget.method}`)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cm-footer-redirect-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={cx("cm-footer-redirect__icon", `cm-footer-redirect__icon--${redirectTarget.label.toLowerCase()}`)}>
              {renderIcon(redirectTarget.icon)}
            </div>
            <div className="cm-footer-redirect__content">
              <span className="cm-footer-redirect__eyebrow">Redirecionamento externo</span>
              <h2 id="cm-footer-redirect-title">{redirectTarget.title}</h2>
              <p>{redirectTarget.description}</p>
            </div>
            <div className="cm-footer-redirect__actions">
              <button type="button" className="cm-footer-redirect__cancel" onClick={closeRedirectModal}>Cancelar</button>
              <button type="button" className="cm-footer-redirect__confirm" onClick={confirmRedirect}>Continuar</button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

export default ClientFooter;
