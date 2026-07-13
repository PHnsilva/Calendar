import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./NavbarMenu.module.css";

type NavbarMenuRenderProps = {
  close: () => void;
  open: boolean;
  toggle: () => void;
};

type NavbarMenuProps = {
  ariaLabel: string;
  children: (props: NavbarMenuRenderProps) => ReactNode;
  className?: string;
  menuClassName?: string;
  trigger: (props: NavbarMenuRenderProps) => ReactNode;
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function NavbarMenu({ ariaLabel, children, className, menuClassName, trigger }: NavbarMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const close = () => setOpen(false);
  const toggle = () => setOpen((current) => !current);
  const renderProps = { close, open, toggle };

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      close();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={cx(styles.root, "wf-profile-menu-wrap", className)} ref={menuRef}>
      {trigger(renderProps)}
      {open ? (
        <div className={cx(styles.panel, "wf-profile-menu", menuClassName)} role="menu" aria-label={ariaLabel}>
          {children(renderProps)}
        </div>
      ) : null}
    </div>
  );
}

export default NavbarMenu;
