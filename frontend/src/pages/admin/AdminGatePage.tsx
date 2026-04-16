import AdminTokenGate from "../../features/admin/components/AdminTokenGate";
import { getStoredAdminToken } from "../../lib/storage";

export default function AdminGatePage() {
  return <AdminTokenGate initialToken={getStoredAdminToken()} />;
}
