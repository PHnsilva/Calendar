import houseCard from "../../../../assets/wireframes/cards/client-house-card.png";
import ServiceCarousel from "../../../../widgets/service-carousel";

export function ClientLandingInfoRow() {
  return (
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
  );
}
