import type { ReactNode } from "react";
import ResponsiveAsset from "../../../../shared/ui/ResponsiveAsset";
import styles from "./LandingHero.module.css";

type LandingHeroAction = {
  icon?: ReactNode;
  label: ReactNode;
  onClick?: () => void;
};

type LandingHeroProps = {
  assetAlt: string;
  assetClassName?: string;
  badge?: ReactNode;
  className?: string;
  description: ReactNode;
  desktopAsset: string;
  featureLine?: ReactNode;
  highlight: ReactNode;
  mobileAsset?: string;
  mobileBreakpoint?: number;
  primaryAction: LandingHeroAction;
  smallMobileAsset?: string;
  smallMobileBreakpoint?: number;
  secondaryAction?: LandingHeroAction & {
    leading?: ReactNode;
  };
  title: ReactNode;
  titleAfter?: ReactNode;
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function LandingHero({
  assetAlt,
  assetClassName,
  badge,
  className,
  description,
  desktopAsset,
  featureLine,
  highlight,
  mobileAsset,
  mobileBreakpoint = 900,
  primaryAction,
  secondaryAction,
  smallMobileAsset,
  smallMobileBreakpoint = 500,
  title,
  titleAfter,
}: LandingHeroProps) {
  return (
    <section className={cx(styles.root, "wf-hero", "wf-hero--client", "wf-hero--client-final", className)}>
      <div className={cx(styles.copy, "wf-hero-copy", "wf-client-hero-copy-final")}>
        {badge}
        <h1>{title} <span>{highlight}</span>{titleAfter}</h1>
        <p>{description}</p>
        <div className={cx(styles.actions, "wf-hero-buttons")}>
          <button type="button" className="wf-primary-cta" onClick={primaryAction.onClick}>{primaryAction.icon} {primaryAction.label}</button>
          {secondaryAction ? (
            <button type="button" className="wf-secondary-cta" onClick={secondaryAction.onClick}>
              {secondaryAction.leading}
              {secondaryAction.icon}
              {secondaryAction.label}
            </button>
          ) : null}
        </div>
        {featureLine}
      </div>
      <ResponsiveAsset
        alt={assetAlt}
        className={cx("wf-media-frame", "wf-media-frame--hero", "wf-hero-visual", "wf-hero-visual--client", assetClassName)}
        desktopSrc={desktopAsset}
        mobileSrc={mobileAsset}
        mobileBreakpoint={mobileBreakpoint}
        smallMobileSrc={smallMobileAsset}
        smallMobileBreakpoint={smallMobileBreakpoint}
      />
    </section>
  );
}

export default LandingHero;
