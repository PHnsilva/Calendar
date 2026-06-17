import type { ReactNode } from "react";
import heroClientDesktop1200 from "../../assets/wireframes/landing/client-hero-composite-1200.png";
import heroClientDesktop1600 from "../../assets/wireframes/landing/client-hero-composite-1600.png";
import heroClientDesktop2200 from "../../assets/wireframes/landing/client-hero-composite-2200.png";
import heroClientDesktop3000 from "../../assets/wireframes/landing/client-hero-composite-3000.png";
import heroClientMobile from "../../assets/wireframes/landing/client-hero-composite-mobile.png";
import heroClientMobileTall from "../../assets/wireframes/landing/client-hero-composite-mobile-tall.png";
import ResponsiveAsset from "../../shared/ui/ResponsiveAsset";

const clientHeroDesktopSrcSet = [
  `${heroClientDesktop1200} 1200w`,
  `${heroClientDesktop1600} 1600w`,
  `${heroClientDesktop2200} 2200w`,
  `${heroClientDesktop3000} 3000w`,
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
}: LandingHeroProps) {
  return (
    <section className="wf-hero wf-hero--client wf-hero--client-final">
      <div className="wf-hero-copy wf-client-hero-copy-final">
        {badge}
        <h1>{title} <span>{highlight}</span></h1>
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
        mobileSrc={heroClientMobile}
        mobileBreakpoint={900}
        smallMobileSrc={heroClientMobileTall}
        smallMobileBreakpoint={500}
      />
    </section>
  );
}

export default LandingHero;
