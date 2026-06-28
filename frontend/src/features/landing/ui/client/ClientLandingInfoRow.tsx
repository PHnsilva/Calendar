import houseCard from "../../../../assets/wireframes/cards/client-house-card.png";
import houseRouteDetail from "../../../../assets/wireframes/icons/client-house-route-detail.svg";
import ServiceCarousel from "../../../../widgets/service-carousel";

export function ClientLandingInfoRow() {
  return (
    <section className="wf-info-row" id="wf-why-use">
      <article className="wf-house-card">
        <img className="wf-house-card__image" src={houseCard} alt="Casa atendida" />
        <div className="wf-house-card__copy">
          <h2>Agende quando e onde estiver</h2>
          <p>Do computador ou do celular, organize seus atendimentos de forma rápida e segura, 24 horas por dia.</p>
        </div>
        <img className="wf-house-card__route" src={houseRouteDetail} alt="" aria-hidden="true" />
      </article>
      <div className="wf-info-row__carousel">
        <ServiceCarousel />
      </div>
    </section>
  );
}
