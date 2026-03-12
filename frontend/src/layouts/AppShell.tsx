import type { ReactNode } from "react";

type AppShellProps = {
  header?: ReactNode;
  children: ReactNode;
};

export default function AppShell({ header, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <div className="app-shell__background" aria-hidden="true" />
      <div className="app-shell__frame">
        {header}
        {children}
      </div>
    </div>
  );
}