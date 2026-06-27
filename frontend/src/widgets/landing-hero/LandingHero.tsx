import type { ReactNode } from "react";
import heroClientDesktop901 from "../../assets/wireframes/landing/hero-tradesman-transparent-901w.png";
import heroClientDesktop1024 from "../../assets/wireframes/landing/hero-tradesman-transparent-1024w.png";
import heroClientDesktop1280 from "../../assets/wireframes/landing/hero-tradesman-transparent-1280w.png";
import heroClientDesktop1600 from "../../assets/wireframes/landing/hero-tradesman-transparent-1600w.png";
import heroClientDesktop1920 from "../../assets/wireframes/landing/hero-tradesman-transparent-1920w.png";
import heroClientDesktop2200 from "../../assets/wireframes/landing/hero-tradesman-transparent-2200w.png";
import heroClientDesktop2500 from "../../assets/wireframes/landing/hero-tradesman-transparent-2500w.png";
import heroClientMobile320 from "../../assets/wireframes/landing/client-hero-composite-mobile-transparent-320w.png";
import heroClientMobile360 from "../../assets/wireframes/landing/client-hero-composite-mobile-transparent-360w.png";
import heroClientMobile390 from "../../assets/wireframes/landing/client-hero-composite-mobile-transparent-390w.png";
import heroClientMobile430 from "../../assets/wireframes/landing/client-hero-composite-mobile-transparent-430w.png";
import heroClientMobile531 from "../../assets/wireframes/landing/client-hero-composite-mobile-transparent-531w.png";
import heroClientMobile768 from "../../assets/wireframes/landing/client-hero-composite-mobile-transparent-768w.png";
import heroClientMobile899 from "../../assets/wireframes/landing/client-hero-composite-mobile-transparent-899w.png";
import ResponsiveAsset from "../../shared/ui/ResponsiveAsset";

const clientHeroDesktopSrcSet = [
  `${heroClientDesktop901} 901w`,
  `${heroClientDesktop1024} 1024w`,
  `${heroClientDesktop1280} 1280w`,
  `${heroClientDesktop1600} 1600w`,
  `${heroClientDesktop1920} 1920w`,
  `${heroClientDesktop2200} 2200w`,
  `${heroClientDesktop2500} 2500w`,
].join(", ");

const clientHeroMobileSrcSet = [
  `${heroClientMobile320} 320w`,
  `${heroClientMobile360} 360w`,
  `${heroClientMobile390} 390w`,
  `${heroClientMobile430} 430w`,
  `${heroClientMobile531} 531w`,
  `${heroClientMobile768} 768w`,
  `${heroClientMobile899} 899w`,
].join(", ");

const clientHeroSmallMobileSrcSet = [
  `${heroClientMobile320} 320w`,
  `${heroClientMobile360} 360w`,
  `${heroClientMobile390} 390w`,
  `${heroClientMobile430} 430w`,
].join(", ");

type LandingHeroProps = {
  badge: ReactNode;
  description: ReactNode;
  highlight: ReactNode;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  primaryIcon: ReactNode;
  primaryLabel: ReactNode;
  secondaryIcon: ReactNode;
  secondaryLabel: ReactNode;
  title: ReactNode;
  mobileTitle?: ReactNode;
};

export function LandingHero({
  badge,
  description,
  highlight,
  onPrimaryAction,
  onSecondaryAction,
  primaryIcon,
  primaryLabel,
  secondaryIcon,
  secondaryLabel,
  title,
  mobileTitle,
}: LandingHeroProps) {
  return (
    <section className="wf-hero wf-hero--client wf-hero--client-final">
      <div className="wf-hero-copy wf-client-hero-copy-final">
        {badge}
        <h1 className="wf-hero-title">
          <span className="wf-hero-title__desktop">{title} <span>{highlight}</span></span>
          <span className="wf-hero-title__mobile">{mobileTitle ?? <>{title} <span>{highlight}</span></>}</span>
        </h1>
        <p>{description}</p>

        <div className="wf-hero-buttons">
          <button type="button" className="wf-primary-cta" onClick={onPrimaryAction}>
            {primaryIcon} {primaryLabel}
          </button>
          <button type="button" className="wf-secondary-cta" onClick={onSecondaryAction}>
            {secondaryIcon} {secondaryLabel}
          </button>
        </div>
      </div>
      <ResponsiveAsset
        alt="Prestador de pequenos reparos"
        className="wf-media-frame wf-media-frame--hero wf-hero-visual wf-hero-visual--client wf-client-hero-visual-final"
        desktopSrc={heroClientDesktop1600}
        desktopSrcSet={clientHeroDesktopSrcSet}
        sizes="(min-width: 901px) min(56vw, 900px), 100vw"
        mobileSrc={heroClientMobile531}
        mobileSrcSet={clientHeroMobileSrcSet}
        mobileSizes="(max-width: 430px) min(58vw, 430px), (max-width: 900px) min(56vw, 560px), 100vw"
        mobileBreakpoint={900}
        smallMobileSrc={heroClientMobile320}
        smallMobileSrcSet={clientHeroSmallMobileSrcSet}
        smallMobileBreakpoint={430}
        smallMobileSizes="min(58vw, 430px)"
      />
    </section>
  );
}

export default LandingHero;
