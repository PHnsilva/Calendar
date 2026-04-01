import { Navigate } from "react-router-dom";
import AdminTokenGate from "../../features/admin/components/AdminTokenGate";
import { getStoredAdminToken } from "../../lib/storage";

export default function AdminGatePage() {
  if (getStoredAdminToken()) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <AdminTokenGate />;
}
