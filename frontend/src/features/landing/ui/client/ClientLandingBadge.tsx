import type { ReactNode } from "react";
import { LandingIcon } from "./ClientLandingIcons";

type Accent = "blue" | "orange" | "green" | "purple" | "cyan" | "red" | "gray";

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function Badge({ icon, children, color = "orange" }: { icon?: string; children: ReactNode; color?: Accent }) {
  return <span className={cx("wf-badge", `wf-badge--${color}`)}>{icon ? <LandingIcon name={icon} /> : null}{children}</span>;
}

export type { Accent };
