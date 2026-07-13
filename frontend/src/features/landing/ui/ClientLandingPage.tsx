import { useState } from "react";
import landingNavbarLogo from "../../../assets/brand/sg-navbar-logo-white-orange-v2.png";
import ClientNavbar from "../../../components/layout/ClientNavbar";
import { PageShell } from "../../../components/layout/ResponsivePrimitives";
import { CalendarMateModal, useDoubleBackToLeavePage, type ModalKind } from "../../../components/screens/CalendarMateRoutes";
import { ClientLandingActions } from "./client/ClientLandingActions";
import { ClientLandingFooterBlock } from "./client/ClientLandingFooterBlock";
import { ClientLandingHeroBlock } from "./client/ClientLandingHeroBlock";
import { ClientLandingInfoRow } from "./client/ClientLandingInfoRow";
import { useClientProfileSnapshot } from "./client/clientLandingProfile";

export function ClientLandingPage() {
  const [modal, setModal] = useState<ModalKind>(null);
  const profile = useClientProfileSnapshot();
  useDoubleBackToLeavePage();

  return (
    <PageShell className="wf-page wf-client-landing">
      <ClientNavbar className="wf-client-navbar--landing wf-client-navbar--white-logo" logoSrc={landingNavbarLogo} onCreate={() => setModal("create-client")} onConfirmPhone={() => setModal("client-profile")} onProfile={() => setModal("client-profile")} />
      <main className="wf-landing-main">
        <ClientLandingHeroBlock setModal={setModal} />
        <ClientLandingActions profile={profile} setModal={setModal} />
        <ClientLandingInfoRow setModal={setModal} />
        <ClientLandingFooterBlock setModal={setModal} />
      </main>
      <CalendarMateModal modal={modal} onClose={() => setModal(null)} onOpenModal={setModal} />
    </PageShell>
  );
}

export default ClientLandingPage;
