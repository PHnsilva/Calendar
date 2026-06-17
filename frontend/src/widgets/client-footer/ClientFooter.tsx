import { useState, type ReactNode } from "react";

type FooterIconName =
  | "footer-email-social"
  | "footer-instagram-social"
  | "footer-whatsapp-social";

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
  copySupportEmail: () => Promise<boolean>;
  onContact: () => void;
  onHelp: () => void;
  onServices: () => void;
  openExternal: (url: string) => void;
  renderIcon: (name: FooterIconName) => ReactNode;
  supportEmail: string;
  supportInstagramUrl: string;
  supportWhatsAppUrl: string;
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function ClientFooter({
  brand,
  copySupportEmail,
  onContact,
  onHelp,
  onServices,
  openExternal,
  renderIcon,
  supportEmail,
  supportInstagramUrl,
  supportWhatsAppUrl,
}: ClientFooterProps) {
  const [emailCopied, setEmailCopied] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState<FooterRedirectTarget | null>(null);

  const requestRedirect = (target: FooterRedirectTarget) => {
    setRedirectTarget(target);
  };

  const closeRedirectModal = () => {
    setRedirectTarget(null);
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

  const requestEmailRedirect = () => requestRedirect({
    label: "E-mail",
    title: "Abrir e-mail?",
    description: `Seu aplicativo de e-mail será aberto para enviar uma mensagem para ${supportEmail}.`,
    url: `mailto:${supportEmail}`,
    method: "email",
    icon: "footer-email-social",
  });

  const handleCopyEmail = async () => {
    const copied = await copySupportEmail();
    if (!copied) {
      requestEmailRedirect();
      return;
    }
    setEmailCopied(true);
    window.setTimeout(() => setEmailCopied(false), 1800);
  };

  return (
    <>
      <footer className="wf-footer wf-footer--client-final wf-footer--client-social">
        <div className="wf-footer-brand">
          {brand}
        </div>

        <nav className="wf-footer-links" aria-label="Links institucionais">
          <button type="button" onClick={onServices}>Sobre o serviço</button>
          <button type="button" onClick={onHelp}>Perguntas frequentes</button>
          <button type="button" onClick={onContact}>Contato</button>
        </nav>

        <section className="wf-footer-social" aria-label="Redes sociais e contato">
          <span className="wf-footer-social__title">Redes sociais</span>
          <div className="wf-footer-social__icons">
            <button
              type="button"
              className="wf-footer-social__icon wf-footer-social__icon--instagram"
              aria-label="Abrir Instagram da SG Pequenos Reparos"
              onClick={requestInstagramRedirect}
            >
              {renderIcon("footer-instagram-social")}
            </button>
            <button
              type="button"
              className="wf-footer-social__icon wf-footer-social__icon--whatsapp"
              aria-label="Abrir WhatsApp da SG Pequenos Reparos"
              onClick={requestWhatsAppRedirect}
            >
              {renderIcon("footer-whatsapp-social")}
            </button>
            <button
              type="button"
              className="wf-footer-social__icon wf-footer-social__icon--email wf-footer-social__icon--email-mobile"
              aria-label="Enviar e-mail para a SG Pequenos Reparos"
              onClick={requestEmailRedirect}
            >
              {renderIcon("footer-email-social")}
            </button>
          </div>
          <div className="wf-footer-email-card" aria-label="E-mail de contato">
            <button
              type="button"
              className="wf-footer-email-card__mail"
              aria-label="Enviar e-mail para a SG Pequenos Reparos"
              onClick={requestEmailRedirect}
            >
              {renderIcon("footer-email-social")}
            </button>
            <span className="wf-footer-email-card__address">{supportEmail}</span>
            <button type="button" className="wf-footer-email-card__copy" onClick={handleCopyEmail}>
              {emailCopied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </section>
      </footer>

      {redirectTarget ? (
        <div className="wf-footer-redirect" role="presentation" onClick={closeRedirectModal}>
          <section
            className={cx("wf-footer-redirect__dialog", `wf-footer-redirect__dialog--${redirectTarget.method}`)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wf-footer-redirect-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={cx("wf-footer-redirect__icon", `wf-footer-redirect__icon--${redirectTarget.label.toLowerCase()}`)}>
              {renderIcon(redirectTarget.icon)}
            </div>
            <div className="wf-footer-redirect__content">
              <span className="wf-footer-redirect__eyebrow">Redirecionamento externo</span>
              <h2 id="wf-footer-redirect-title">{redirectTarget.title}</h2>
              <p>{redirectTarget.description}</p>
            </div>
            <div className="wf-footer-redirect__actions">
              <button type="button" className="wf-footer-redirect__cancel" onClick={closeRedirectModal}>Cancelar</button>
              <button type="button" className="wf-footer-redirect__confirm" onClick={confirmRedirect}>Continuar</button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

export default ClientFooter;
