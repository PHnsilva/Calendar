import type { HTMLAttributes } from "react";
import styles from "./Spinner.module.css";

type SpinnerSize = "sm" | "md" | "lg";

export type SpinnerProps = HTMLAttributes<HTMLSpanElement> & {
  label?: string;
  size?: SpinnerSize;
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function Spinner({ className, label = "Carregando", size = "md", ...props }: SpinnerProps) {
  return (
    <span
      {...props}
      aria-label={label}
      className={cx(styles.root, styles[size], className)}
      role="status"
    />
  );
}

export default Spinner;
