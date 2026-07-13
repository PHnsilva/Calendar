import type { HTMLAttributes, ReactNode } from "react";
import styles from "./StatusBadge.module.css";

type StatusBadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

export type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: StatusBadgeTone;
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function StatusBadge({ children, className, tone = "neutral", ...props }: StatusBadgeProps) {
  return (
    <span {...props} className={cx(styles.root, styles[tone], className)}>
      {children}
    </span>
  );
}

export default StatusBadge;
