import { useEffect, useState } from "react";
import logo from "../../assets/brand/logowithname.webp";
import { trackEvent, trackPageView } from "../../lib/analytics";

const whatsappDigits = "553195415323";
const whatsappDisplay = "+55 31 9541-5323";
const whatsappMessage = "Olá! Vim pelo site da SG Pequenos Reparos e quero agendar um serviço.";
const whatsappUrl = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(whatsappMessage)}`;

const services = [
  {
    title: "Montagem",
    items: ["Montagem de móveis", "Mesas, cadeiras e armários", "Ajustes e reforços simples"],
  },
  {
    title: "Elétrica",
    items: ["Troca de tomadas e interruptores", "Instalação de luminárias", "Pequenos reparos elétricos"],
  },
  {
    title: "Hidráulica",
    items: ["Vazamentos e torneiras", "Troca de torneiras e chuveiros", "Ajustes em descargas"],
  },
  {
    title: "Instalações",
    items: ["Suportes, prateleiras e nichos", "Quadros, espelhos e acessórios", "Itens residenciais diversos"],
  },
  {
    title: "Pequenos reparos",
    items: ["Consertos do dia a dia", "Manutenção residencial", "Correções rápidas"],
  },
  {
    title: "Serviços de pedreiro",
    items: ["Pequenos reparos em alvenaria", "Correções em pisos, paredes e acabamentos", "Ajustes e manutenções residenciais simples"],
  },
  {
    title: "Jardinagem",
    items: ["Poda e manutenção básica", "Limpeza de jardim", "Cuidados simples com áreas verdes"],
  },
  {
    title: "Serviços com drone",
    items: ["Imagens aéreas para inspeção", "Verificação visual de telhados e áreas externas", "Apoio em avaliação de manutenção"],
  },
  {
    title: "Orçamento",
    items: ["Avaliação do serviço", "Estimativa de materiais", "Definição do atendimento"],
  },
];

function ensureMetaDescription() {
  const description = "SG Pequenos Reparos realiza manutenção residencial, montagem, elétrica, hidráulica, instalações, jardinagem e orçamentos. Atendimento via WhatsApp enquanto o site está em preparação.";
  let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "description";
    document.head.appendChild(meta);
  }
  meta.content = description;
}

export default function SitePreparationPage() {
  const [servicesOpen, setServicesOpen] = useState(false);

  useEffect(() => {
    document.title = "SG Pequenos Reparos | Manutenção residencial e pequenos reparos";
    ensureMetaDescription();
    trackPageView("/");
  }, []);

  useEffect(() => {
    if (!servicesOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setServicesOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [servicesOpen]);

  return (
    <div className="site-prep-page">
      <header className="site-prep-header">
        <img src={logo} alt="SG Pequenos Reparos" width="400" height="171" decoding="async" />
        <a className="site-prep-whatsapp site-prep-whatsapp--header" href={whatsappUrl} target="_blank" rel="noreferrer" onClick={() => trackEvent("whatsapp_click")}>
          WhatsApp {whatsappDisplay}
        </a>
      </header>

      <main className="site-prep-main">
        <section className="site-prep-card" aria-labelledby="site-prep-title">
          <p className="site-prep-eyebrow">Site em preparação</p>
          <h1 id="site-prep-title">Manutenção residencial e pequenos reparos.</h1>
          <p>
            Estamos preparando a agenda online. Enquanto isso, fale pelo WhatsApp para solicitar montagem,
            elétrica, hidráulica, instalações, jardinagem, pequenos reparos ou orçamento.
          </p>
          <a className="site-prep-whatsapp site-prep-whatsapp--main" href={whatsappUrl} target="_blank" rel="noreferrer" onClick={() => { trackEvent("booking_start"); trackEvent("whatsapp_click"); }}>
            Agendar pelo WhatsApp
          </a>
        </section>
        <section className="sr-only" aria-labelledby="site-prep-crawlable-services-title">
          <h2 id="site-prep-crawlable-services-title">Serviços residenciais e cidades atendidas</h2>
          <p>Realizamos montagem de móveis, serviços elétricos e hidráulicos, instalações, pequenos reparos, alvenaria, jardinagem, inspeções com drone e orçamentos.</p>
          <p>Atendimento em Belo Horizonte, Itabirito, Ouro Preto, Moeda e Nova Lima, Minas Gerais.</p>
        </section>
      </main>

      <footer className="site-prep-footer">
        <button type="button" onClick={() => setServicesOpen(true)}>Serviços prestados</button>
      </footer>

      {servicesOpen ? (
        <div className="site-prep-modal-backdrop" role="presentation" onMouseDown={() => setServicesOpen(false)}>
          <section
            className="site-prep-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="site-prep-services-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="site-prep-modal-header">
              <h2 id="site-prep-services-title">Serviços prestados</h2>
              <button type="button" onClick={() => setServicesOpen(false)} aria-label="Fechar serviços">x</button>
            </header>
            <div className="site-prep-services-grid">
              {services.map((service) => (
                <article key={service.title} className="site-prep-service-card">
                  <h3>{service.title}</h3>
                  <ul>
                    {service.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </article>
              ))}
            </div>
            <a className="site-prep-whatsapp site-prep-whatsapp--modal" href={whatsappUrl} target="_blank" rel="noreferrer" onClick={() => { trackEvent("booking_start"); trackEvent("whatsapp_click"); }}>
              Agendar pelo WhatsApp
            </a>
          </section>
        </div>
      ) : null}
    </div>
  );
}
