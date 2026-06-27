import { useState } from "react";
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
      <ClientNavbar onCreate={() => setModal("create-client")} onConfirmPhone={() => setModal("confirm-phone")} onProfile={() => setModal("client-profile")} />
      <main className="wf-landing-main">
        <ClientLandingHeroBlock setModal={setModal} />
        <ClientLandingActions profile={profile} setModal={setModal} />
        <ClientLandingInfoRow />
        <ClientLandingFooterBlock setModal={setModal} />
      </main>
      <CalendarMateModal modal={modal} onClose={() => setModal(null)} />
    </PageShell>
  );
}

export default ClientLandingPage;
