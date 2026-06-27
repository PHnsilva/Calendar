import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import logo from "../../../assets/brand/logowithname.png";
import houseCard from "../../../assets/wireframes/cards/client-house-card.png";
import clientCreateCalendarIcon from "../../../assets/wireframes/icons/client-create-calendar.png";
import clientFollowCalendarIcon from "../../../assets/wireframes/icons/client-follow-calendar.png";
import clientPhoneIcon from "../../../assets/wireframes/icons/client-phone.png";
import clientChatIcon from "../../../assets/wireframes/icons/client-chat.png";
import footerWhatsAppWireframeIcon from "../../../assets/wireframes/icons/footer-whatsapp-wireframe.png";
import footerInstagramWireframeIcon from "../../../assets/wireframes/icons/footer-instagram-wireframe.png";
import footerEmailWireframeIcon from "../../../assets/wireframes/icons/footer-email-wireframe.png";
import footerPhoneWireframeIcon from "../../../assets/wireframes/icons/footer-phone-wireframe.png";
import footerMapWireframeIcon from "../../../assets/wireframes/icons/footer-map-wireframe.png";
import ClientNavbar from "../../../components/layout/ClientNavbar";
import { PageShell, SvgWrapper } from "../../../components/layout/ResponsivePrimitives";
import { CalendarMateModal, useDoubleBackToLeavePage, type ModalKind } from "../../../components/screens/CalendarMateRoutes";
import {
  getClientProfileChangedEventName,
  getPhoneVerificationChangedEventName,
  getStoredClientProfile,
  getStoredPhoneVerification,
} from "../../../lib/storage";
import ClientFooter from "../../../widgets/client-footer";
import LandingHero from "../../../widgets/landing-hero";
import ServiceCarousel from "../../../widgets/service-carousel";

type Accent = "blue" | "orange" | "green" | "purple" | "cyan" | "red" | "gray";

type ClientProfileSnapshot = {
  verified: boolean;
  name?: string;
  phone?: string;
  email?: string;
};

const supportPhoneDisplay = "(31) 9541-5323";
const supportPhoneDigits = "553195415323";
const supportWhatsAppUrl = `https://wa.me/${supportPhoneDigits}`;
const supportInstagramUrl = "https://www.instagram.com/sg_pequenos_reparos/";
const supportEmail = "sgpequenosreparos@gmail.com";

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function readClientProfileSnapshot(): ClientProfileSnapshot {
  const verification = getStoredPhoneVerification();
  const profile = getStoredClientProfile();
  return {
    verified: Boolean(verification),
    name: profile?.name,
    phone: profile?.phone || verification?.phone,
    email: profile?.email,
  };
}

function useClientProfileSnapshot(): ClientProfileSnapshot {
  const [snapshot, setSnapshot] = useState<ClientProfileSnapshot>(() => readClientProfileSnapshot());

  useEffect(() => {
    const refresh = () => setSnapshot(readClientProfileSnapshot());
    window.addEventListener(getPhoneVerificationChangedEventName(), refresh);
    window.addEventListener(getClientProfileChangedEventName(), refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(getPhoneVerificationChangedEventName(), refresh);
      window.removeEventListener(getClientProfileChangedEventName(), refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return snapshot;
}

function LandingIcon({ name }: { name: string }) {
  const uid = `wf-${name.replace(/[^a-zA-Z0-9-]/g, "-")}`;
  const imageIcons: Record<string, string> = {
    "calendar-create": clientCreateCalendarIcon,
    "calendar-clock": clientFollowCalendarIcon,
    "mobile-phone": clientPhoneIcon,
    "chat-bubbles": clientChatIcon,
    "footer-whatsapp-social": footerWhatsAppWireframeIcon,
    "footer-instagram-social": footerInstagramWireframeIcon,
    "footer-email-social": footerEmailWireframeIcon,
    "footer-phone-wireframe": footerPhoneWireframeIcon,
    "footer-map-wireframe": footerMapWireframeIcon,
  };
  const imageIcon = imageIcons[name];
  if (imageIcon) {
    return (
      <SvgWrapper className={cx("wf-icon", "wf-icon--image", `wf-icon--${name.replace(/[^a-zA-Z0-9-]/g, "-")}`)}>
        <img src={imageIcon} alt="" />
      </SvgWrapper>
    );
  }

  const common = { viewBox: "0 0 64 64", fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": true } as const;
  const line = { stroke: "currentColor", strokeWidth: 4.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  const icons: Record<string, ReactNode> = {
    calendar: <svg {...common}><rect x="12" y="14" width="40" height="38" rx="8" {...line}/><path d="M22 8v12M42 8v12M12 25h40" {...line}/><path d="M22 35h.01M32 35h.01M42 35h.01M22 44h.01M32 44h.01M42 44h.01" {...line}/></svg>,
    play: <svg {...common}><circle cx="32" cy="32" r="27" fill="#ff1d16"/><path d="M27 21 46 32 27 43V21Z" fill="#fff"/></svg>,
    user: <svg {...common}><circle cx="32" cy="22" r="10" {...line}/><path d="M14 55c3.7-12.2 9.7-18.3 18-18.3S46.3 42.8 50 55" {...line}/></svg>,
  };

  return <SvgWrapper className={cx("wf-icon", `wf-icon--${name.replace(/[^a-zA-Z0-9-]/g, "-")}`)}>{icons[name] ?? icons.calendar}</SvgWrapper>;
}

function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className={cx("wf-logo", compact && "wf-logo--compact")}>
      <img src={logo} alt="SG Pequenos Reparos Agendamentos" />
    </Link>
  );
}

function Badge({ icon, children, color = "orange" }: { icon?: string; children: ReactNode; color?: Accent }) {
  return <span className={cx("wf-badge", `wf-badge--${color}`)}>{icon ? <LandingIcon name={icon} /> : null}{children}</span>;
}

function ActionCard({ icon, title, text, color, onClick, to }: { icon: string; title: string; text?: string; color: Accent; onClick?: () => void; to?: string }) {
  const content = (
    <>
      <span className="wf-action-card__icon"><LandingIcon name={icon} /></span>
      <span className="wf-action-card__body"><strong>{title}</strong>{text ? <small>{text}</small> : null}</span>
      <span className="wf-action-card__arrow">›</span>
    </>
  );
  if (to) return <Link to={to} className={cx("wf-action-card", `wf-action-card--${color}`)}>{content}</Link>;
  return <button type="button" className={cx("wf-action-card", `wf-action-card--${color}`)} onClick={onClick}>{content}</button>;
}

function ClientLandingModalButtons({ profile, setModal }: { profile: ClientProfileSnapshot; setModal: (modal: ModalKind) => void }) {
  return (
    <div className="wf-actions-grid wf-actions-grid--client">
      <ActionCard icon="calendar-create" title="Criar agendamento" color="orange" onClick={() => setModal("create-client")} />
      <ActionCard icon="calendar-clock" title="Acompanhar agendamento" color="blue" to="/meus-agendamentos" />
      <ActionCard
        icon={profile.verified ? "user" : "mobile-phone"}
        title={profile.verified ? "Perfil" : "Confirmar telefone"}
        color="green"
        onClick={() => setModal(profile.verified ? "client-profile" : "confirm-phone")}
      />
      <ActionCard icon="chat-bubbles" title="Fale conosco" color="purple" onClick={() => setModal("contact")} />
    </div>
  );
}

export function ClientLandingPage() {
  const [modal, setModal] = useState<ModalKind>(null);
  const profile = useClientProfileSnapshot();
  useDoubleBackToLeavePage();

  return (
    <PageShell className="wf-page wf-client-landing">
      <ClientNavbar onCreate={() => setModal("create-client")} onConfirmPhone={() => setModal("confirm-phone")} onProfile={() => setModal("client-profile")} />
      <main className="wf-landing-main">
        <LandingHero
          badge={<Badge icon="calendar" color="orange">Simples, rápido e sem complicações</Badge>}
          description={<>Crie seu agendamento sem precisar fazer login.<br />No dia, confirme seu número de telefone e pronto!</>}
          highlight="facilidade."
          onPrimaryAction={() => setModal("create-client")}
          onSecondaryAction={() => setModal("services-info")}
          primaryIcon={<LandingIcon name="calendar" />}
          primaryLabel="Criar agendamento"
          secondaryIcon={<span className="wf-play"><LandingIcon name="play" /></span>}
          secondaryLabel="Como funciona?"
          title="Organize seus agendamentos e pequenos reparos com"
          mobileTitle={<>Organize seus<br />agendamentos e<br />pequenos reparos<br />com <span>facilidade.</span></>}
        />

        <ClientLandingModalButtons profile={profile} setModal={setModal} />

        <section className="wf-info-row" id="wf-why-use">
          <article className="wf-house-card">
            <img src={houseCard} alt="Casa atendida" />
            <div>
              <h2>Agende quando e onde estiver</h2>
              <p>Do computador ou do celular, organize seus atendimentos de forma rápida e segura, 24 horas por dia.</p>
            </div>
          </article>
          <ServiceCarousel />
        </section>
        <ClientFooter
          brand={<LogoMark compact />}
          onContact={() => setModal("contact")}
          onHelp={() => setModal("help-contact")}
          onServices={() => setModal("services-info")}
          openExternal={openExternal}
          renderIcon={(name) => <LandingIcon name={name} />}
          supportEmail={supportEmail}
          supportInstagramUrl={supportInstagramUrl}
          supportWhatsAppUrl={supportWhatsAppUrl}
          supportPhoneDisplay={supportPhoneDisplay}
          serviceCitiesLabel="Itabirito, Ouro Preto, Moeda, Belo Horizonte e Nova Lima"
        />
      </main>
      <CalendarMateModal modal={modal} onClose={() => setModal(null)} />
    </PageShell>
  );
}

export default ClientLandingPage;
