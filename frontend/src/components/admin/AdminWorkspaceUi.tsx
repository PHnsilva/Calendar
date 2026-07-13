import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './AdminWorkspaceUi.module.css';

export type AdminIconName =
  | 'bank'
  | 'calendar'
  | 'chart'
  | 'check'
  | 'chevron-left'
  | 'chevron-right'
  | 'clock'
  | 'close'
  | 'copy'
  | 'delete'
  | 'download'
  | 'edit'
  | 'empty'
  | 'entry'
  | 'exit'
  | 'eye'
  | 'filter'
  | 'history'
  | 'location'
  | 'lock'
  | 'mail'
  | 'note'
  | 'pix'
  | 'plus'
  | 'refresh'
  | 'search'
  | 'service'
  | 'upload'
  | 'user'
  | 'wallet'
  | 'warning';

type IconProps = {
  className?: string;
  name: AdminIconName;
  size?: number;
};

const paths: Record<AdminIconName, ReactNode> = {
  bank: <><path d="M4 10 12 5l8 5" /><path d="M5 10h14M6.5 10v7M10 10v7M14 10v7M17.5 10v7M4 19h16" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M8 3v4M16 3v4M3.5 10h17" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" /></>,
  chart: <><path d="M4 19V5M4 19h16" /><path d="m7 15 4-4 3 2 5-6" /></>,
  check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16.5 9" /></>,
  'chevron-left': <path d="m15 18-6-6 6-6" />,
  'chevron-right': <path d="m9 18 6-6-6-6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  close: <path d="m7 7 10 10M17 7 7 17" />,
  copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
  delete: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></>,
  download: <><path d="M12 4v10M8 11l4 4 4-4" /><path d="M5 19h14" /></>,
  edit: <><path d="m14.5 5.5 4 4L9 19H5v-4Z" /><path d="m12.5 7.5 4 4" /></>,
  empty: <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 10h8M8 14h5" /></>,
  entry: <><path d="M12 20V6M7 11l5-5 5 5" /><path d="M5 20h14" /></>,
  exit: <><path d="M12 4v14M7 13l5 5 5-5" /><path d="M5 4h14" /></>,
  eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
  filter: <path d="M4 6h16l-6 7v5l-4 2v-7Z" />,
  history: <><path d="M4 6v5h5" /><path d="M5.2 16a8 8 0 1 0-.8-7" /><path d="M12 8v5l3 2" /></>,
  location: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  note: <><path d="M6 3h9l4 4v14H6Z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></>,
  pix: <><path d="m12 3 4 4-4 4-4-4Z" /><path d="m12 13 4 4-4 4-4-4Z" /><path d="m3 12 4-4 4 4-4 4ZM13 12l4-4 4 4-4 4Z" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  refresh: <><path d="M20 7v5h-5" /><path d="M19 12a7 7 0 1 0-2 5" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
  service: <><path d="m14 6 4-2 2 2-2 4-3 1-5 5-3-3 5-5Z" /><path d="m8 14-4 4 2 2 4-4" /></>,
  upload: <><path d="M12 20V6M7 11l5-5 5 5" /><path d="M5 20h14" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  wallet: <><path d="M4 6h14a2 2 0 0 1 2 2v10H6a2 2 0 0 1-2-2Z" /><path d="M4 8V6a2 2 0 0 1 2-2h10" /><path d="M15 11h5v4h-5a2 2 0 0 1 0-4Z" /></>,
  warning: <><path d="M12 3 2.8 20h18.4Z" /><path d="M12 9v5M12 17h.01" /></>,
};

export function AdminIcon({ className, name, size = 20 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
        {paths[name]}
      </g>
    </svg>
  );
}

export function AdminPageHeader({
  actions,
  description,
  icon,
  title,
}: {
  actions?: ReactNode;
  description: ReactNode;
  icon: AdminIconName;
  title: ReactNode;
}) {
  return (
    <header className={styles.pageHeader}>
      <span className={styles.pageHeaderIcon}><AdminIcon name={icon} size={26} /></span>
      <div className={styles.pageHeaderCopy}>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className={styles.pageActions}>{actions}</div> : null}
    </header>
  );
}

export function AdminSectionHeader({
  description,
  icon,
  meta,
  title,
}: {
  description?: ReactNode;
  icon?: AdminIconName;
  meta?: ReactNode;
  title: ReactNode;
}) {
  return (
    <header className={styles.sectionHeader}>
      <div className={styles.sectionHeading}>
        {icon ? <span className={styles.sectionIcon}><AdminIcon name={icon} size={19} /></span> : null}
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {meta ? <div className={styles.sectionMeta}>{meta}</div> : null}
    </header>
  );
}

type StateTone = 'empty' | 'error' | 'loading' | 'success';

const stateIcons: Record<StateTone, AdminIconName> = {
  empty: 'empty',
  error: 'warning',
  loading: 'refresh',
  success: 'check',
};

export function AdminState({
  action,
  description,
  title,
  tone = 'empty',
}: {
  action?: ReactNode;
  description: ReactNode;
  title: ReactNode;
  tone?: StateTone;
}) {
  return (
    <div className={`${styles.state} ${styles[`state${tone[0].toUpperCase()}${tone.slice(1)}`]}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span className={styles.stateIcon}><AdminIcon name={stateIcons[tone]} size={22} /></span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {action ? <div className={styles.stateAction}>{action}</div> : null}
    </div>
  );
}

type StatusTone = 'danger' | 'info' | 'neutral' | 'success' | 'warning';

const statusIcons: Record<StatusTone, AdminIconName> = {
  danger: 'warning',
  info: 'clock',
  neutral: 'empty',
  success: 'check',
  warning: 'warning',
};

export function AdminStatusBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: StatusTone }) {
  return (
    <span className={`${styles.status} ${styles[`status${tone[0].toUpperCase()}${tone.slice(1)}`]}`}>
      <AdminIcon name={statusIcons[tone]} size={14} />
      {children}
    </span>
  );
}

export function AdminButton({
  children,
  icon,
  tone = 'secondary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: AdminIconName;
  tone?: 'danger' | 'primary' | 'secondary' | 'text';
}) {
  return (
    <button {...props} className={`${styles.button} ${styles[`button${tone[0].toUpperCase()}${tone.slice(1)}`]} ${props.className ?? ''}`}>
      {icon ? <AdminIcon name={icon} size={18} /> : null}
      <span>{children}</span>
    </button>
  );
}
