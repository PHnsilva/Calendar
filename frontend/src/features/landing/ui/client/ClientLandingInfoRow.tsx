import houseCard from "../../../../assets/wireframes/cards/client-house-card.png";
import houseRouteDetail from "../../../../assets/wireframes/icons/client-house-route-detail.svg";
import brandLogo from "../../../../assets/brand/logo.png";
import instagramIcon from "../../../../assets/wireframes/icons/contact-instagram.png";
import type { ModalKind } from "../../../../components/screens/CalendarMateRoutes";
import ServiceCarousel from "../../../../widgets/service-carousel";
import { openExternal, supportInstagramUrl } from "./clientLandingConstants";

export function ClientLandingInfoRow({ setModal }: { setModal: (modal: ModalKind) => void }) {
  return (
    <section className="wf-info-row wf-info-row--mobile-priority" id="wf-why-use">
      <article className="wf-house-card">
        <img className="wf-house-card__image" src={houseCard} alt="Casa atendida" />
        <div className="wf-house-card__copy">
          <h2>Agende quando e onde estiver</h2>
          <p>Do computador ou do celular, organize seus atendimentos de forma rápida e segura, 24 horas por dia.</p>
        </div>
        <button
          type="button"
          className="wf-house-card__route-trigger"
          aria-label="Abrir detalhes de serviços prestados"
          onClick={() => setModal("services-info")}
        >
          <img className="wf-house-card__route" src={houseRouteDetail} alt="" aria-hidden="true" />
        </button>
      </article>
      <button
        type="button"
        className="wf-social-spotlight-card"
        aria-label="Abrir publicações em destaque no Instagram"
        onClick={() => openExternal(supportInstagramUrl)}
      >
        <span className="wf-social-spotlight-card__media" aria-hidden="true" />
        <span className="wf-social-spotlight-card__content">
          <span className="wf-social-spotlight-card__brand">
            <img src={brandLogo} alt="SG Pequenos Reparos" />
          </span>
          <span className="wf-social-spotlight-card__text">
            <strong>Publicações em destaque</strong>
            <small><span>Serviços gerais, montagens e instalações.</span><span>Filmagens com drone e mais.</span></small>
          </span>
          <span className="wf-social-spotlight-card__cta">
            <img className="wf-social-spotlight-card__instagram" src={instagramIcon} alt="" aria-hidden="true" />
            Ver no Instagram
          </span>
        </span>
        <span className="wf-social-spotlight-card__device" aria-hidden="true">
          <span>NO INSTAGRAM</span>
          <strong>Montagens, instalações, filmagens com drone e mais</strong>
        </span>
        <span className="wf-social-spotlight-card__play" aria-hidden="true">
          <span />
        </span>
      </button>
      <div className="wf-info-row__carousel">
        <ServiceCarousel />
      </div>
    </section>
  );
}
