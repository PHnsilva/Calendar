import type { ModalKind } from "../../../../components/screens/CalendarMateRoutes";
import LandingHero from "../../../../widgets/landing-hero";
import { Badge } from "./ClientLandingBadge";
import { LandingIcon } from "./ClientLandingIcons";

export function ClientLandingHeroBlock({ setModal }: { setModal: (modal: ModalKind) => void }) {
  return (
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
  );
}
