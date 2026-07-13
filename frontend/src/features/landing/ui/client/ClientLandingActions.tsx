import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { ModalKind } from "../../../../components/screens/CalendarMateRoutes";
import { LandingIcon } from "./ClientLandingIcons";
import type { Accent } from "./ClientLandingBadge";
import type { ClientProfileSnapshot } from "./clientLandingProfile";

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

function ActionCard({ icon, title, text, color, onClick, to }: { icon: string; title: string; text?: string; color: Accent; onClick?: () => void; to?: string }) {
  const content: ReactNode = (
    <>
      <span className="wf-action-card__icon"><LandingIcon name={icon} /></span>
      <span className="wf-action-card__body"><strong>{title}</strong>{text ? <small>{text}</small> : null}</span>
      <span className="wf-action-card__arrow">›</span>
    </>
  );
  if (to) return <Link to={to} className={cx("wf-action-card", `wf-action-card--${color}`)}>{content}</Link>;
  return <button type="button" className={cx("wf-action-card", `wf-action-card--${color}`)} onClick={onClick}>{content}</button>;
}

export function ClientLandingActions({ profile, setModal }: { profile: ClientProfileSnapshot; setModal: (modal: ModalKind) => void }) {
  void profile;
  return (
    <div className="wf-actions-grid wf-actions-grid--client">
      <ActionCard icon="calendar-create" title="Criar agendamento" color="orange" onClick={() => setModal("create-client")} />
      <ActionCard icon="calendar-clock" title="Acompanhar" color="blue" to="/meus-agendamentos" />
      <ActionCard
        icon="user"
        title="Perfil"
        color="green"
        onClick={() => setModal("client-profile")}
      />
      <ActionCard icon="chat-bubbles" title="Fale conosco" color="purple" onClick={() => setModal("contact")} />
    </div>
  );
}
