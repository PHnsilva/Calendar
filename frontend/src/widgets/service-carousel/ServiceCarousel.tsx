import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import servicePinturaCard from "../../assets/images/landing-carousel/01-servicos-de-pintor.png";
import serviceMontagemCard from "../../assets/images/landing-carousel/02-montagem-e-instalacao.png";
import servicePedreiroCard from "../../assets/images/landing-carousel/03-servicos-de-pedreiro.png";
import serviceDroneCard from "../../assets/images/landing-carousel/04-filmagem-com-drone.png";
import serviceHidraulicaCard from "../../assets/images/landing-carousel/05-hidraulica.png";
import serviceEletricaCard from "../../assets/images/landing-carousel/06-eletrica-basica.png";
import serviceJardinagemCard from "../../assets/images/landing-carousel/07-jardinagem.png";

type ServiceShowcaseItem = {
  title: string;
  alt: string;
  image: string;
};

const SERVICE_SHOWCASE_INTERVAL_MS = 4600;

const SERVICE_SHOWCASE_ITEMS: ServiceShowcaseItem[] = [
  {
    title: "Serviços de pintor",
    alt: "Card do serviço de pintura",
    image: servicePinturaCard,
  },
  {
    title: "Montagem e instalação",
    alt: "Card do serviço de montagem e instalação",
    image: serviceMontagemCard,
  },
  {
    title: "Serviços de pedreiro",
    alt: "Card do serviço de pedreiro",
    image: servicePedreiroCard,
  },
  {
    title: "Filmagem com drone",
    alt: "Card do serviço de filmagem com drone",
    image: serviceDroneCard,
  },
  {
    title: "Hidráulica",
    alt: "Card do serviço de hidráulica",
    image: serviceHidraulicaCard,
  },
  {
    title: "Elétrica básica",
    alt: "Card do serviço de elétrica básica",
    image: serviceEletricaCard,
  },
  {
    title: "Jardinagem",
    alt: "Card do serviço de jardinagem",
    image: serviceJardinagemCard,
  },
];

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function ServiceCarousel() {
  const [index, setIndex] = useState(0);
  const [progressKey, setProgressKey] = useState(0);
  const carouselRef = useRef<HTMLElement | null>(null);
  const pointerStartRef = useRef<{ x: number; pointerId: number } | null>(null);

  const resetProgress = useCallback(() => {
    carouselRef.current?.style.setProperty("--wf-carousel-progress", "0", "important");
    setProgressKey((current) => current + 1);
  }, []);

  const goTo = useCallback((nextIndex: number) => {
    setIndex(((nextIndex % SERVICE_SHOWCASE_ITEMS.length) + SERVICE_SHOWCASE_ITEMS.length) % SERVICE_SHOWCASE_ITEMS.length);
    resetProgress();
  }, [resetProgress]);

  const goPrev = useCallback(() => {
    setIndex((current) => (current - 1 + SERVICE_SHOWCASE_ITEMS.length) % SERVICE_SHOWCASE_ITEMS.length);
    resetProgress();
  }, [resetProgress]);

  const goNext = useCallback(() => {
    setIndex((current) => (current + 1) % SERVICE_SHOWCASE_ITEMS.length);
    resetProgress();
  }, [resetProgress]);

  useEffect(() => {
    SERVICE_SHOWCASE_ITEMS.forEach((service) => {
      const image = new Image();
      image.src = service.image;
    });
  }, []);

  useEffect(() => {
    let animationFrame = 0;
    const startedAt = window.performance.now();

    const updateProgress = (now: number) => {
      const ratio = Math.min(1, (now - startedAt) / SERVICE_SHOWCASE_INTERVAL_MS);
      carouselRef.current?.style.setProperty("--wf-carousel-progress", ratio.toFixed(4), "important");

      if (ratio < 1) {
        animationFrame = window.requestAnimationFrame(updateProgress);
      }
    };

    carouselRef.current?.style.setProperty("--wf-carousel-progress", "0", "important");
    animationFrame = window.requestAnimationFrame(updateProgress);

    const timer = window.setTimeout(goNext, SERVICE_SHOWCASE_INTERVAL_MS);

    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [goNext, index, progressKey]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = { x: event.clientX, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (!start) return;

    const deltaX = event.clientX - start.x;
    if (Math.abs(deltaX) >= 38) {
      if (deltaX > 0) {
        goPrev();
        return;
      }

      goNext();
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - bounds.left;

    if (relativeX <= bounds.width * 0.34) {
      goPrev();
      return;
    }

    if (relativeX >= bounds.width * 0.66) {
      goNext();
    }
  };

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    pointerStartRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return (
    <article
      ref={carouselRef}
      className="wf-services-showcase"
      aria-roledescription="carousel"
      aria-label="Carrossel de serviços prestados"
    >
      <div
        className="wf-services-showcase__viewport"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {SERVICE_SHOWCASE_ITEMS.map((service, serviceIndex) => (
          <img
            key={service.image}
            className={cx("wf-services-showcase__image", serviceIndex === index && "is-active")}
            src={service.image}
            alt={service.alt}
            loading={serviceIndex === 0 ? "eager" : "lazy"}
            decoding="async"
            draggable={false}
            aria-hidden={serviceIndex !== index}
          />
        ))}

        <div className="wf-services-showcase__overlay">
          <div className="wf-services-showcase__dots" role="tablist" aria-label="Indicadores do carrossel">
            {SERVICE_SHOWCASE_ITEMS.map((service, serviceIndex) => (
              <button
                key={service.title}
                type="button"
                className={cx("wf-services-showcase__dot", serviceIndex === index && "is-active")}
                aria-label={`Ir para ${service.title}`}
                aria-pressed={serviceIndex === index}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => goTo(serviceIndex)}
              >
                <span
                  className="wf-services-showcase__dot-progress"
                  aria-hidden="true"
                />
                <span className="sr-only">{service.title}</span>
              </button>
            ))}
          </div>
          <span className="wf-services-showcase__counter">{index + 1} / {SERVICE_SHOWCASE_ITEMS.length}</span>
        </div>
      </div>
    </article>
  );
}

export default ServiceCarousel;
