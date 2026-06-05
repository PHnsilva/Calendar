import type { ReactNode } from "react";
import styles from "./ModalShell.module.css";

type ModalShellProps = {
  backdropClassName?: string;
  children: ReactNode;
  className?: string;
  closeIcon?: ReactNode;
  closeLabel?: string;
  dataModal?: string;
  onClose: () => void;
  open: boolean;
  showMobileHandle?: boolean;
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function ModalShell({
  backdropClassName,
  children,
  className,
  closeIcon,
  closeLabel = "Fechar modal",
  dataModal,
  onClose,
  open,
  showMobileHandle = true,
}: ModalShellProps) {
  if (!open) return null;

  return (
    <div className={cx(styles.backdrop, "wf-modal-backdrop", backdropClassName)} role="presentation" data-modal={dataModal}>
      <div className={cx(styles.shell, "wf-modal", className)} role="dialog" aria-modal="true">
        {showMobileHandle ? <span className="wf-modal-mobile-handle" aria-hidden="true" /> : null}
        <button type="button" className="wf-modal-close" onClick={onClose} aria-label={closeLabel}>
          {closeIcon}
        </button>
        {children}
      </div>
    </div>
  );
}

export default ModalShell;
