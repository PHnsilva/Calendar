import type { ReactNode } from "react";
import styles from "./PageTitle.module.css";

type PageTitleProps = {
  className?: string;
  compact?: boolean;
  description?: ReactNode;
  icon?: ReactNode;
  kicker?: ReactNode;
  title: ReactNode;
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function PageTitle({ className, compact = false, description, icon, kicker, title }: PageTitleProps) {
  return (
    <div className={cx(styles.root, compact && "is-compact", className)}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <div className={styles.content}>
        {kicker ? <small className={styles.kicker}>{kicker}</small> : null}
        <h2 className={styles.title}>{title}</h2>
        {description ? <p className={styles.description}>{description}</p> : null}
      </div>
    </div>
  );
}

export default PageTitle;
