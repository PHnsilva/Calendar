import type { ElementType, ReactNode } from "react";
import ClientNavbar from "../../../../components/layout/ClientNavbar";
import styles from "./AppointmentsPageShell.module.css";

type ClientNavbarConfig = {
  onConfirmPhone?: () => void;
  onCreate?: () => void;
  onNotifications?: () => void;
  onProfile?: () => void;
  page?: "home" | "my";
};

type AppointmentsPageShellProps = {
  admin?: boolean;
  calendar: ReactNode;
  children: ReactNode;
  className?: string;
  clientNavbar?: ClientNavbarConfig;
  mobileFilters?: ReactNode;
  navbar?: ReactNode;
  pageClassName?: string;
};

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

function AppointmentsLayout({ admin, calendar, children, className, mobileFilters }: Omit<AppointmentsPageShellProps, "clientNavbar" | "navbar" | "pageClassName">) {
  const Component: ElementType = admin ? "div" : "main";

  return (
    <Component className={cx(styles.layout, "wf-two-column", "wf-two-column--bookings", admin && "wf-two-column--admin", className)}>
      {mobileFilters}
      {calendar}
      <section className={cx(styles.panel, "wf-booking-list-panel")}>
        {children}
      </section>
    </Component>
  );
}

export function AppointmentsPageShell({
  admin = false,
  calendar,
  children,
  className,
  clientNavbar,
  mobileFilters,
  navbar,
  pageClassName,
}: AppointmentsPageShellProps) {
  const layout = <AppointmentsLayout admin={admin} calendar={calendar} className={className} mobileFilters={mobileFilters}>{children}</AppointmentsLayout>;
  const shellNavbar = clientNavbar ? <ClientNavbar {...clientNavbar} /> : navbar;

  if (!shellNavbar) return layout;

  return (
    <div className={cx(styles.root, "wf-page-shell", pageClassName)}>
      {shellNavbar}
      {layout}
    </div>
  );
}

export default AppointmentsPageShell;
