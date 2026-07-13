import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  iconEnd?: ReactNode;
  iconStart?: ReactNode;
  isLoading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function Button({
  children,
  className,
  disabled,
  iconEnd,
  iconStart,
  isLoading = false,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cx(styles.root, styles[variant], styles[size], className)}
      data-loading={isLoading || undefined}
      disabled={disabled || isLoading}
      type={type}
    >
      {iconStart ? <span className={styles.icon} aria-hidden="true">{iconStart}</span> : null}
      <span className={styles.label}>{children}</span>
      {iconEnd ? <span className={styles.icon} aria-hidden="true">{iconEnd}</span> : null}
    </button>
  );
}

export default Button;
