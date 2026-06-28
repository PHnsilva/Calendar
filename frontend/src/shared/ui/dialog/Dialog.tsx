import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import styles from "./Dialog.module.css";

export type DialogProps = {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  closeLabel?: string;
  description?: ReactNode;
  onClose: () => void;
  open: boolean;
  title?: ReactNode;
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function Dialog({
  actions,
  children,
  className,
  closeLabel = "Fechar modal",
  description,
  onClose,
  open,
  title,
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} role="presentation">
      <section
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={title ? titleId : undefined}
        aria-modal="true"
        className={cx(styles.dialog, className)}
        role="dialog"
      >
        <button className={styles.close} onClick={onClose} ref={closeRef} type="button">
          <span aria-hidden="true">x</span>
          <span className={styles.visuallyHidden}>{closeLabel}</span>
        </button>
        {title || description ? (
          <header className={styles.header}>
            {title ? <h2 className={styles.title} id={titleId}>{title}</h2> : null}
            {description ? <p className={styles.description} id={descriptionId}>{description}</p> : null}
          </header>
        ) : null}
        <div className={styles.body}>{children}</div>
        {actions ? <footer className={styles.actions}>{actions}</footer> : null}
      </section>
    </div>
  );
}

export default Dialog;
