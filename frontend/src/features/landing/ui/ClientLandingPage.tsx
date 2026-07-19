import { lazy, Suspense, useState } from "react";
import landingNavbarLogo from "../../../assets/brand/sg-navbar-logo-white-orange-v2.png";
import ClientNavbar from "../../../components/layout/ClientNavbar";
import { PageShell } from "../../../components/layout/ResponsivePrimitives";
import type { ModalKind } from "../../../components/screens/CalendarMateRoutes";
import { useDoubleBackToLeavePage } from "../../../lib/navigation-history";
import { ClientLandingActions } from "./client/ClientLandingActions";
import { ClientLandingFooterBlock } from "./client/ClientLandingFooterBlock";
import { ClientLandingHeroBlock } from "./client/ClientLandingHeroBlock";
import { ClientLandingInfoRow } from "./client/ClientLandingInfoRow";
import { useClientProfileSnapshot } from "./client/clientLandingProfile";

const CalendarMateModal = lazy(() => import("./DeferredCalendarMateModal"));

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
        <section className="sr-only" id="servicos" aria-labelledby="landing-services-title">
          <h2 id="landing-services-title">Serviços de manutenção residencial</h2>
          <p>A SG Pequenos Reparos realiza montagem de móveis, instalações residenciais, serviços elétricos e hidráulicos, pintura, alvenaria, jardinagem, pequenos reparos e serviços com drone.</p>
          <h2 id="landing-cities-title">Cidades atendidas em Minas Gerais</h2>
          <p>Atendemos clientes em Belo Horizonte, Itabirito, Ouro Preto, Moeda e Nova Lima.</p>
        </section>
        <ClientLandingFooterBlock setModal={setModal} />
      </main>
      {modal ? (
        <Suspense fallback={null}>
          <CalendarMateModal modal={modal} onClose={() => setModal(null)} onOpenModal={setModal} />
        </Suspense>
      ) : null}
    </PageShell>
  );
}

export default ClientLandingPage;
