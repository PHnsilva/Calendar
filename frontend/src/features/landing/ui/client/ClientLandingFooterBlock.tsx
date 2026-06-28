import type { ModalKind } from "../../../../components/screens/CalendarMateRoutes";
import ClientFooter from "../../../../widgets/client-footer";
import { LandingIcon, LogoMark } from "./ClientLandingIcons";
import {
  openExternal,
  serviceCitiesLabel,
  supportEmail,
  supportInstagramUrl,
  supportPhoneDisplay,
  supportWhatsAppUrl,
} from "./clientLandingConstants";

export function ClientLandingFooterBlock({ setModal }: { setModal: (modal: ModalKind) => void }) {
  return (
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
      serviceCitiesLabel={serviceCitiesLabel}
    />
  );
}
