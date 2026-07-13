import type { CSSProperties, ElementType, ReactNode } from 'react';

type PrimitiveProps = {
  children: ReactNode;
  className?: string;
};

type SectionContainerProps = PrimitiveProps & {
  as?: ElementType;
  size?: 'default' | 'narrow' | 'wide';
};

type ResponsiveGridProps = PrimitiveProps & {
  min?: string;
};

type MediaFrameProps = PrimitiveProps & {
  variant?: 'hero' | 'svg' | 'image';
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function PageShell({ children, className }: PrimitiveProps) {
  return <div className={cx('wf-page-shell', className)}>{children}</div>;
}

export function SectionContainer({ as: Component = 'section', children, className, size = 'default' }: SectionContainerProps) {
  return (
    <Component className={cx('wf-section-container', `wf-section-container--${size}`, className)}>
      {children}
    </Component>
  );
}

export function ResponsiveGrid({ children, className, min = '240px' }: ResponsiveGridProps) {
  return (
    <div className={cx('wf-responsive-grid', className)} style={{ '--wf-grid-min': min } as CSSProperties}>
      {children}
    </div>
  );
}

export function SurfaceCard({ children, className }: PrimitiveProps) {
  return <article className={cx('wf-surface-card', className)}>{children}</article>;
}

export function MediaFrame({ children, className, variant = 'image' }: MediaFrameProps) {
  return <div className={cx('wf-media-frame', `wf-media-frame--${variant}`, className)}>{children}</div>;
}

export function SvgWrapper({ children, className }: PrimitiveProps) {
  return (
    <span aria-hidden="true" className={cx('wf-svg-wrapper', className)}>
      {children}
    </span>
  );
}
