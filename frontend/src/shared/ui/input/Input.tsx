import type { InputHTMLAttributes, ReactNode } from "react";
import { useId } from "react";
import styles from "./Input.module.css";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  error?: ReactNode;
  hideLabel?: boolean;
  hint?: ReactNode;
  label?: ReactNode;
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function Input({ className, error, hideLabel = false, hint, id, label, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = [
    hint ? `${inputId}-hint` : null,
    error ? `${inputId}-error` : null,
  ].filter(Boolean).join(" ") || undefined;

  return (
    <div className={styles.root}>
      {label ? (
        <label className={cx(styles.label, hideLabel && styles.visuallyHidden)} htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <input
        {...props}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error) || undefined}
        className={cx(styles.control, Boolean(error) && styles.invalid, className)}
        id={inputId}
      />
      {hint ? <p className={styles.hint} id={`${inputId}-hint`}>{hint}</p> : null}
      {error ? <p className={styles.error} id={`${inputId}-error`}>{error}</p> : null}
    </div>
  );
}

export default Input;
