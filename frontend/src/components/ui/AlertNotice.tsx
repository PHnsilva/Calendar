import type { ReactNode } from 'react';

type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

type AlertNoticeProps = {
  variant?: AlertVariant;
  title: string;
  children: ReactNode;
  compact?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

function AlertIcon({ variant }: { variant: AlertVariant }) {
  if (variant === 'success') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.4 12.3L10.8 14.7L15.9 9.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (variant === 'warning') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 4.3L20 18.2C20.4 18.9 19.9 19.8 19.1 19.8H4.9C4.1 19.8 3.6 18.9 4 18.2L12 4.3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M12 9.2V13.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="16.3" r="1" fill="currentColor" />
      </svg>
    );
  }

  if (variant === 'danger') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8.2 3.8H15.8L20.2 8.2V15.8L15.8 20.2H8.2L3.8 15.8V8.2L8.2 3.8Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8.4V12.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="16.2" r="1" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10.4V15.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="7.8" r="1" fill="currentColor" />
    </svg>
  );
}

export default function AlertNotice({
  variant = 'info',
  title,
  children,
  compact = false,
  actionLabel,
  onAction,
  className = '',
}: AlertNoticeProps) {
  return (
    <section
      className={[
        'alert-notice',
        `alert-notice--${variant}`,
        compact ? 'alert-notice--compact' : '',
        className,
      ].filter(Boolean).join(' ')}
      role={variant === 'danger' || variant === 'warning' ? 'alert' : 'status'}
    >
      <div className="alert-notice__icon" aria-hidden="true">
        <AlertIcon variant={variant} />
      </div>

      <div className="alert-notice__content">
        <strong className="alert-notice__title">{title}</strong>
        <div className="alert-notice__description">{children}</div>
      </div>

      {actionLabel && onAction ? (
        <button type="button" className="alert-notice__action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
