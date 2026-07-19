import { useEffect, useRef, type ReactNode } from "react";
import styles from "./ModalShell.module.css";

type ModalShellProps = {
  ariaLabel?: string;
  backdropClassName?: string;
  children: ReactNode;
  className?: string;
  closeIcon?: ReactNode;
  closeLabel?: string;
  closeDisabled?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  dataModal?: string;
  focusCloseOnOpen?: boolean;
  lockBodyScroll?: boolean;
  onClose: () => void;
  open: boolean;
  showCloseButton?: boolean;
  showMobileHandle?: boolean;
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function ModalShell({
  ariaLabel,
  backdropClassName,
  children,
  className,
  closeIcon,
  closeLabel = "Fechar modal",
  closeDisabled = false,
  closeOnBackdrop = false,
  closeOnEscape = false,
  dataModal,
  focusCloseOnOpen = false,
  lockBodyScroll = false,
  onClose,
  open,
  showCloseButton = true,
  showMobileHandle = true,
}: ModalShellProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;

    if (focusCloseOnOpen) closeRef.current?.focus();
    if (lockBodyScroll) document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (closeOnEscape && !closeDisabled && event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (lockBodyScroll) document.body.style.overflow = previousOverflow;
      if (focusCloseOnOpen) previouslyFocused?.focus();
    };
  }, [closeDisabled, closeOnEscape, focusCloseOnOpen, lockBodyScroll, onClose, open]);

  if (!open) return null;

  return (
    <div
      className={cx(styles.backdrop, "wf-modal-backdrop", backdropClassName)}
      role="presentation"
      data-modal={dataModal}
      onMouseDown={(event) => {
        if (closeOnBackdrop && !closeDisabled && event.target === event.currentTarget) onClose();
      }}
    >
      <div className={cx(styles.shell, "wf-modal", className)} role="dialog" aria-label={ariaLabel} aria-modal="true">
        {showMobileHandle ? <span className="wf-modal-mobile-handle" aria-hidden="true" /> : null}
        {showCloseButton ? (
          <button ref={closeRef} type="button" className="wf-modal-close" onClick={onClose} aria-label={closeLabel} disabled={closeDisabled}>
            {closeIcon}
          </button>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export default ModalShell;
