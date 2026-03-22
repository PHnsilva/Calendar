import type { ReactNode } from "react";
import AdminHeader from "./AdminHeader";

type AdminDashboardShellProps = {
  token: string;
  onClearToken: () => void;
  children: ReactNode;
};

export default function AdminDashboardShell({
  token,
  onClearToken,
  children,
}: AdminDashboardShellProps) {
  return (
    <div className="admin-page">
      <AdminHeader token={token} onClearToken={onClearToken} />
      <div className="admin-page__content">{children}</div>
    </div>
  );
}
