import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminTokenGate from "../../features/admin/components/AdminTokenGate";
import { clearAdminToken, useAdminStore } from "../../stores/admin-store";

export default function AdminGatePage() {
  const navigate = useNavigate();
  const { token, hasToken, saveToken } = useAdminStore();

  useEffect(() => {
    if (hasToken) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [hasToken, navigate]);

  return (
    <main className="admin-gate-page">
      <AdminTokenGate
        initialToken={token}
        onSubmit={(value) => {
          saveToken(value);
          navigate("/admin/dashboard", { replace: true });
        }}
        onClear={token ? clearAdminToken : undefined}
      />
    </main>
  );
}
