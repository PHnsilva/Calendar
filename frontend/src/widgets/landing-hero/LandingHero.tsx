import type { ReactNode } from "react";

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
    <section className="wf-hero wf-hero--client wf-hero--client-final" aria-label="Agendamento de pequenos reparos">
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
    </section>
  );
}

export default LandingHero;
