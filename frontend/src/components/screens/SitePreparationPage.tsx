import { useEffect, useId, useMemo, useState } from "react";
import logoWithName from "../../assets/brand/logowithname.png";

const DEFAULT_WHATSAPP_NUMBER = "553195415323";
const WHATSAPP_DISPLAY_NUMBER = "+55 31 9541-5323";
const WHATSAPP_MESSAGE =
  "Olá! Vim pelo site da SG Pequenos Reparos e quero agendar um serviço.";

const serviceItems = [
  {
    label: "Montagem",
    tone: "amber",
    icon: "box",
    topics: ["Montagem de móveis", "Mesas, cadeiras e armários", "Ajustes e reforços simples"],
  },
  {
    label: "Elétrica",
    tone: "orange",
    icon: "bolt",
    topics: ["Troca de tomadas e interruptores", "Instalação de luminárias", "Pequenos reparos elétricos"],
  },
  {
    label: "Hidráulica",
    tone: "blue",
    icon: "drop",
    topics: ["Vazamentos e torneiras", "Troca de torneiras e chuveiros", "Ajustes em descargas"],
  },
  {
    label: "Instalações",
    tone: "green",
    icon: "tool",
    topics: ["Suportes, prateleiras e nichos", "Quadros, espelhos e acessórios", "Itens residenciais diversos"],
  },
  {
    label: "Pequenos reparos",
    tone: "red",
    icon: "wrench",
    topics: ["Consertos do dia a dia", "Manutenção residencial", "Correções rápidas"],
  },
  {
    label: "Pintura",
    tone: "purple",
    icon: "paint",
    topics: ["Pintura de paredes internas", "Correções e acabamentos", "Renovação de pequenos ambientes"],
  },
  {
    label: "Jardinagem",
    tone: "cyan",
    icon: "leaf",
    topics: ["Poda e manutenção básica", "Limpeza de jardim", "Cuidados simples com áreas verdes"],
  },
  {
    label: "Orçamento",
    tone: "navy",
    icon: "clipboard",
    topics: ["Avaliação do serviço", "Estimativa de materiais", "Definição do atendimento"],
  },
] as const;

type ServiceIconName = (typeof serviceItems)[number]["icon"];

function normalizeWhatsappNumber(value: string | undefined) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits || DEFAULT_WHATSAPP_NUMBER;
}

function buildWhatsappUrl(number: string, message: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function WhatsappIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M12.04 2a9.83 9.83 0 0 0-8.5 14.78L2.4 22l5.34-1.1A9.95 9.95 0 1 0 12.04 2Zm0 1.82a8.13 8.13 0 1 1 0 16.26 8.3 8.3 0 0 1-3.98-1.03l-.35-.2-3.03.63.64-2.95-.22-.37a8.02 8.02 0 0 1-1.2-4.21 8.15 8.15 0 0 1 8.14-8.13Zm-3.1 4.2c-.18 0-.45.07-.69.33-.23.26-.9.88-.9 2.15 0 1.26.92 2.48 1.05 2.65.13.17 1.78 2.86 4.45 3.9 2.22.87 2.68.7 3.16.65.49-.05 1.56-.64 1.78-1.26.22-.62.22-1.15.15-1.26-.06-.12-.24-.18-.5-.31-.26-.13-1.55-.77-1.8-.85-.24-.09-.42-.13-.6.13-.17.26-.69.85-.84 1.03-.15.17-.3.2-.56.06-.26-.13-1.09-.4-2.08-1.28-.77-.69-1.29-1.54-1.44-1.8-.15-.26-.02-.4.11-.53.12-.12.26-.31.39-.46.13-.15.17-.26.26-.44.09-.17.04-.33-.02-.46-.07-.13-.6-1.46-.83-2-.22-.53-.45-.45-.6-.46h-.55Z" />
    </svg>
  );
}

function ServiceIcon({ name }: { name: ServiceIconName }) {
  if (name === "box") return <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="m12 2.5 8.5 4.3v10.4L12 21.5l-8.5-4.3V6.8L12 2.5Zm0 2.2L6.8 7.3 12 9.9l5.2-2.6L12 4.7Zm-6.5 4.4v6.8l5.5 2.8v-6.8L5.5 9.1Zm13 0L13 11.9v6.8l5.5-2.8V9.1Z" /></svg>;
  if (name === "bolt") return <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M13.6 2.8 5.2 13.3h5.6l-1 7.9 8.9-11.5h-5.8l.7-6.9Z" /></svg>;
  if (name === "drop") return <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M12 2.7S5.8 9.3 5.8 14a6.2 6.2 0 0 0 12.4 0C18.2 9.3 12 2.7 12 2.7Zm0 15.7a4.2 4.2 0 0 1-4.2-4.2c0-.5.4-.9.9-.9s.9.4.9.9A2.4 2.4 0 0 0 12 16.6c.5 0 .9.4.9.9s-.4.9-.9.9Z" /></svg>;
  if (name === "tool") return <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M20.3 7.7a5.9 5.9 0 0 1-7.4 7.5l-5.8 5.7a2.4 2.4 0 0 1-3.4-3.4l5.8-5.8a5.9 5.9 0 0 1 7.4-7.4l-3.4 3.4 3.4 3.4 3.4-3.4Z" /></svg>;
  if (name === "wrench") return <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M21.2 6.9a6 6 0 0 1-7.6 7.7l-6.4 6.3a2.6 2.6 0 0 1-3.7-3.7l6.4-6.3a6 6 0 0 1 7.6-7.7l-3.1 3.1 3.7 3.7 3.1-3.1ZM5.4 19.8a.9.9 0 1 0 0-1.8.9.9 0 0 0 0 1.8Z" /></svg>;
  if (name === "paint") return <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M4.4 4.3h10.8a3.2 3.2 0 0 1 3.2 3.2v1.1h1.1a2.1 2.1 0 0 1 2.1 2.1v2.2a2.1 2.1 0 0 1-2.1 2.1H13v2.7a2.3 2.3 0 1 1-4.6 0V15h-4A2.4 2.4 0 0 1 2 12.6V6.7a2.4 2.4 0 0 1 2.4-2.4Zm.1 2v3h11.9V7.5a1.2 1.2 0 0 0-1.2-1.2H4.5Zm0 5v1.3c0 .2.2.4.4.4h14.6c.1 0 .1 0 .1-.1v-2.2c0-.1 0-.1-.1-.1h-1.1v.7H4.5Z" /></svg>;
  if (name === "leaf") return <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M19.8 3.5c-6-.4-10 1.2-12.5 3.7-3.5 3.5-3.6 8.8-3.1 11 .2.7.9 1.1 1.6 1 2.3-.5 7.5-1.8 11-5.3 2.6-2.5 4.1-6.5 3.8-12.4-.1-.6-.3-.9-.8-1Zm-9.1 11.9a.9.9 0 0 1-1.3-1.3l6.1-6.1a.9.9 0 0 1 1.3 1.3l-6.1 6.1Z" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M9.5 3h5l.7 1.7H18a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6.7a2 2 0 0 1 2-2h2.8L9.5 3Zm.5 3.4h4l-.6-1.4h-2.8L10 6.4ZM7.7 11h8.6V9.2H7.7V11Zm0 4h8.6v-1.8H7.7V15Z" /></svg>;
}

export default function SitePreparationPage() {
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const servicesTitleId = useId();
  const whatsappNumber = normalizeWhatsappNumber(import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER);
  const whatsappUrl = useMemo(() => buildWhatsappUrl(whatsappNumber, WHATSAPP_MESSAGE), [whatsappNumber]);

  useEffect(() => {
    if (!isServicesOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsServicesOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isServicesOpen]);

  return (
    <main className="site-prep-page">
      <header className="site-prep-header" aria-label="SG Pequenos Reparos">
        <img className="site-prep-logo" src={logoWithName} alt="SG Pequenos Reparos" />
        <a className="site-prep-header-cta" href={whatsappUrl} target="_blank" rel="noreferrer">
          <WhatsappIcon />
          <span>WhatsApp</span>
          <span className="site-prep-header-phone">{WHATSAPP_DISPLAY_NUMBER}</span>
        </a>
      </header>

      <section className="site-prep-hero" aria-labelledby="site-prep-title">
        <div className="site-prep-card">
          <p className="site-prep-kicker">SG Pequenos Reparos</p>
          <h1 id="site-prep-title">Estamos preparando nosso atendimento online</h1>
          <p className="site-prep-lead">
            No momento ainda não estamos realizando solicitações pelo site. Em breve você poderá agendar seus serviços diretamente por aqui.
          </p>
          <a className="site-prep-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer">
            <WhatsappIcon />
            <span>Agendar pelo WhatsApp</span>
          </a>
        </div>
      </section>

      <footer className="site-prep-footer" aria-label="Serviços">
        <button className="site-prep-footer-link" type="button" onClick={() => setIsServicesOpen(true)}>
          Serviços prestados
        </button>
      </footer>

      {isServicesOpen ? (
        <div className="site-prep-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsServicesOpen(false);
        }}>
          <section className="site-prep-services-modal" role="dialog" aria-modal="true" aria-labelledby={servicesTitleId}>
            <div className="site-prep-modal-header">
              <div>
                <p className="site-prep-modal-kicker">Atendimento sob solicitação</p>
                <h2 id={servicesTitleId}>Serviços prestados</h2>
              </div>
              <button className="site-prep-modal-close" type="button" aria-label="Fechar serviços prestados" onClick={() => setIsServicesOpen(false)}>
                ×
              </button>
            </div>

            <div className="site-prep-services-grid">
              {serviceItems.map((service) => (
                <article className="site-prep-service-card" data-tone={service.tone} key={service.label}>
                  <div className="site-prep-service-head">
                    <span className="site-prep-service-icon"><ServiceIcon name={service.icon} /></span>
                    <h3>{service.label}</h3>
                  </div>
                  <ul className="site-prep-service-topics">
                    {service.topics.map((topic) => <li key={topic}>{topic}</li>)}
                  </ul>
                </article>
              ))}
            </div>

            <div className="site-prep-modal-actions">
              <a className="site-prep-modal-whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer">
                <WhatsappIcon />
                <span>Agendar pelo WhatsApp</span>
              </a>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
