import type { ReactNode } from "react";
import styles from "./NotificationsModal.module.css";

export type NotificationModalItem = {
  id: string;
  icon: string;
  text: string;
  time: string;
  title: string;
  tone: string;
  unread?: boolean;
};

type NotificationsModalProps = {
  emptyState?: ReactNode;
  isLoading?: boolean;
  loadingState?: ReactNode;
  notifications: NotificationModalItem[];
  onClose: () => void;
  onMarkAllRead?: () => void;
  renderIcon: (name: string) => ReactNode;
  title: ReactNode;
  unreadCount: number;
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function NotificationsModal({
  emptyState,
  isLoading = false,
  loadingState,
  notifications,
  onClose,
  onMarkAllRead,
  renderIcon,
  title,
  unreadCount,
}: NotificationsModalProps) {
  return (
    <div className={styles.root}>
      {title}
      <div className="wf-notification-tabs">
        <button className="is-active" type="button">Todas</button>
        <button type="button">Não lidas <span>{unreadCount}</span></button>
      </div>
      {isLoading ? loadingState : null}
      {!isLoading && notifications.length === 0 ? emptyState : null}
      {notifications.length ? (
        <div className={cx(styles.list, "wf-notification-list", "wf-notification-list--wireframe")}>
          {notifications.map((item) => (
            <article key={item.id} className={cx("wf-notification-item", item.unread && "is-unread", `wf-notification-item--${item.tone}`)}>
              <span className="wf-notification-item__icon">{renderIcon(item.icon)}</span>
              <div className="wf-notification-item__body"><strong>{item.title}</strong><p>{item.text}</p></div>
              <time>{item.time}</time>
              <i className={item.unread ? undefined : "is-empty"} aria-hidden="true" />
            </article>
          ))}
        </div>
      ) : null}
      <div className="wf-notification-actions">
        <button type="button" className="wf-notification-read-all" onClick={onMarkAllRead}>{renderIcon("mail")} Marcar todas como lidas</button>
        <button type="button" className="wf-notification-close" onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}

export default NotificationsModal;
