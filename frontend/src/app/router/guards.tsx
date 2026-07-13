import { Navigate, Outlet } from "react-router-dom";
import { routeForAdminWorkspace } from "../../features/admin/services/admin-workspace-flow";
import type { AdminWorkspaceMode } from "../../types/api";
import { useAuth } from "../providers/auth-context";

export function AdminRouteGuard({ requiredWorkspace }: { requiredWorkspace: AdminWorkspaceMode }) {
  const { adminSession, adminStatus } = useAuth();

  if (adminStatus === "checking") {
    return <p className="wf-auth-feedback" role="status">Validando acesso...</p>;
  }
  if (!adminSession) {
    return <Navigate to="/" replace />;
  }

  const workspace = adminSession.workspace;
  if (!workspace) {
    return requiredWorkspace === "ADMIN" ? <Outlet /> : <Navigate to="/admin" replace />;
  }
  if (workspace.mode !== requiredWorkspace) {
    return <Navigate to={routeForAdminWorkspace(workspace)} replace />;
  }

  return <Outlet />;
}
