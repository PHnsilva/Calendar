import type { ReactNode } from "react";
import styles from "./ResponsiveAsset.module.css";

type ResponsiveAssetProps = {
  alt: string;
  children?: ReactNode;
  className?: string;
  desktopSrc: string;
  desktopSrcSet?: string;
  imageClassName?: string;
  mobileBreakpoint?: number;
  mobileSrc?: string;
  pictureClassName?: string;
  sizes?: string;
  smallMobileBreakpoint?: number;
  smallMobileSrc?: string;
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function ResponsiveAsset({
  alt,
  children,
  className,
  desktopSrc,
  desktopSrcSet,
  imageClassName,
  mobileBreakpoint = 767,
  mobileSrc,
  pictureClassName,
  sizes,
  smallMobileBreakpoint = 500,
  smallMobileSrc,
}: ResponsiveAssetProps) {
  return (
    <div className={cx(styles.root, className)}>
      <picture className={cx(styles.picture, pictureClassName)}>
        {smallMobileSrc ? <source media={`(max-width: ${smallMobileBreakpoint}px)`} srcSet={smallMobileSrc} /> : null}
        {mobileSrc ? <source media={`(max-width: ${mobileBreakpoint}px)`} srcSet={mobileSrc} /> : null}
        <img className={cx(styles.image, imageClassName)} src={desktopSrc} srcSet={desktopSrcSet} sizes={sizes} alt={alt} />
      </picture>
      {children}
    </div>
  );
}

export default ResponsiveAsset;
