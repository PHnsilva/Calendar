import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { trackEvent } from "../../lib/analytics";
import servicePinturaDesktop from "../../assets/images/landing-carousel/webp/full-2500w/01-servicos-de-pintor-2500w.webp";
import serviceMontagemDesktop from "../../assets/images/landing-carousel/webp/full-2500w/02-montagem-e-instalacao-2500w.webp";
import servicePedreiroDesktop from "../../assets/images/landing-carousel/webp/full-2500w/03-servicos-de-pedreiro-2500w.webp";
import serviceDroneDesktop from "../../assets/images/landing-carousel/webp/full-2500w/04-filmagem-com-drone-2500w.webp";
import serviceHidraulicaDesktop from "../../assets/images/landing-carousel/webp/full-2500w/05-hidraulica-2500w.webp";
import serviceEletricaDesktop from "../../assets/images/landing-carousel/webp/full-2500w/06-eletrica-basica-2500w.webp";
import serviceJardinagemDesktop from "../../assets/images/landing-carousel/webp/full-2500w/07-jardinagem-2500w.webp";
import servicePinturaMedium from "../../assets/images/landing-carousel/webp/medium-1400w/01-servicos-de-pintor-1400w.webp";
import serviceMontagemMedium from "../../assets/images/landing-carousel/webp/medium-1400w/02-montagem-e-instalacao-1400w.webp";
import servicePedreiroMedium from "../../assets/images/landing-carousel/webp/medium-1400w/03-servicos-de-pedreiro-1400w.webp";
import serviceDroneMedium from "../../assets/images/landing-carousel/webp/medium-1400w/04-filmagem-com-drone-1400w.webp";
import serviceHidraulicaMedium from "../../assets/images/landing-carousel/webp/medium-1400w/05-hidraulica-1400w.webp";
import serviceEletricaMedium from "../../assets/images/landing-carousel/webp/medium-1400w/06-eletrica-basica-1400w.webp";
import serviceJardinagemMedium from "../../assets/images/landing-carousel/webp/medium-1400w/07-jardinagem-1400w.webp";
import servicePinturaMobile from "../../assets/images/landing-carousel/webp/mobile-320w/01-servicos-de-pintor-320w.webp";
import serviceMontagemMobile from "../../assets/images/landing-carousel/webp/mobile-320w/02-montagem-e-instalacao-320w.webp";
import servicePedreiroMobile from "../../assets/images/landing-carousel/webp/mobile-320w/03-servicos-de-pedreiro-320w.webp";
import serviceDroneMobile from "../../assets/images/landing-carousel/webp/mobile-320w/04-filmagem-com-drone-320w.webp";
import serviceHidraulicaMobile from "../../assets/images/landing-carousel/webp/mobile-320w/05-hidraulica-320w.webp";
import serviceEletricaMobile from "../../assets/images/landing-carousel/webp/mobile-320w/06-eletrica-basica-320w.webp";
import serviceJardinagemMobile from "../../assets/images/landing-carousel/webp/mobile-320w/07-jardinagem-320w.webp";

type ServiceShowcaseItem = {
  title: string;
  alt: string;
  desktopImage: string;
  mediumImage: string;
  mobileImage: string;
};

const SERVICE_SHOWCASE_INTERVAL_MS = 4600;

const SERVICE_SHOWCASE_ITEMS: ServiceShowcaseItem[] = [
  {
    title: "Serviços de pintor",
    alt: "Card do serviço de pintura",
    desktopImage: servicePinturaDesktop,
    mediumImage: servicePinturaMedium,
    mobileImage: servicePinturaMobile,
  },
  {
    title: "Montagem e instalação",
    alt: "Card do serviço de montagem e instalação",
    desktopImage: serviceMontagemDesktop,
    mediumImage: serviceMontagemMedium,
    mobileImage: serviceMontagemMobile,
  },
  {
    title: "Serviços de pedreiro",
    alt: "Card do serviço de pedreiro",
    desktopImage: servicePedreiroDesktop,
    mediumImage: servicePedreiroMedium,
    mobileImage: servicePedreiroMobile,
  },
  {
    title: "Filmagem com drone",
    alt: "Card do serviço de filmagem com drone",
    desktopImage: serviceDroneDesktop,
    mediumImage: serviceDroneMedium,
    mobileImage: serviceDroneMobile,
  },
  {
    title: "Hidráulica",
    alt: "Card do serviço de hidráulica",
    desktopImage: serviceHidraulicaDesktop,
    mediumImage: serviceHidraulicaMedium,
    mobileImage: serviceHidraulicaMobile,
  },
  {
    title: "Elétrica básica",
    alt: "Card do serviço de elétrica básica",
    desktopImage: serviceEletricaDesktop,
    mediumImage: serviceEletricaMedium,
    mobileImage: serviceEletricaMobile,
  },
  {
    title: "Jardinagem",
    alt: "Card do serviço de jardinagem",
    desktopImage: serviceJardinagemDesktop,
    mediumImage: serviceJardinagemMedium,
    mobileImage: serviceJardinagemMobile,
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
    const normalizedIndex = ((nextIndex % SERVICE_SHOWCASE_ITEMS.length) + SERVICE_SHOWCASE_ITEMS.length) % SERVICE_SHOWCASE_ITEMS.length;
    trackEvent("service_selected", { service: SERVICE_SHOWCASE_ITEMS[normalizedIndex].title });
    setIndex(normalizedIndex);
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
        <picture key={SERVICE_SHOWCASE_ITEMS[index].desktopImage} className="wf-services-showcase__picture is-active">
          <source media="(max-width: 640px)" srcSet={`${SERVICE_SHOWCASE_ITEMS[index].mobileImage} 320w, ${SERVICE_SHOWCASE_ITEMS[index].mediumImage} 1400w`} sizes="calc(100vw - 32px)" />
          <source media="(max-width: 1600px)" srcSet={SERVICE_SHOWCASE_ITEMS[index].mediumImage} />
          <img
            className="wf-services-showcase__image is-active"
            src={SERVICE_SHOWCASE_ITEMS[index].desktopImage}
            alt={SERVICE_SHOWCASE_ITEMS[index].alt}
            width="2500"
            height="833"
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            draggable={false}
          />
        </picture>

        <div className="wf-services-showcase__overlay">
          <div className="wf-services-showcase__dots" role="group" aria-label="Indicadores do carrossel">
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
