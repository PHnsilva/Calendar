import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, ApiError } from "../../../lib/api-client";
import { clearAdminToken, saveAdminToken } from "../../../lib/storage";
import type { AdminDashboardSummaryResponse } from "../../../types/api";

type AdminTokenGateProps = {
  redirectTo?: string;
  initialToken?: string;
};

export default function AdminTokenGate({ redirectTo = "/admin/dashboard", initialToken = "" }: AdminTokenGateProps) {
  const navigate = useNavigate();
  const [value, setValue] = useState(initialToken);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const token = value.trim();
    if (!token || loading) return;

    setLoading(true);
    setError("");

    try {
      await apiGet<AdminDashboardSummaryResponse>("/api/admin/dashboard/summary", {
        adminToken: token,
      });
      saveAdminToken(token);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      clearAdminToken();
      if (err instanceof ApiError) {
        setError(err.message || "Token administrativo inválido ou backend admin desabilitado.");
      } else {
        setError("Não foi possível validar o token administrativo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="admin-gate-card">
      <span className="booking-preview-modal__eyebrow">Admin</span>
      <h1 className="booking-preview-modal__title">Acessar painel administrativo</h1>
      <p className="booking-form__hint">Cole o X-ADMIN-TOKEN para liberar agenda, detalhes e rotas.</p>
      <input
        type="password"
        className="booking-form__input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Cole o token administrativo"
      />
      {error ? <p className="booking-form__error">{error}</p> : null}
      <div className="admin-gate-card__actions">
        <button type="button" className="secondary-action" onClick={() => { clearAdminToken(); setValue(""); setError(""); }}>
          Limpar
        </button>
        <button type="button" className="primary-action" onClick={handleSubmit} disabled={!value.trim() || loading}>
          {loading ? "Validando..." : "Entrar"}
        </button>
      </div>
    </section>
  );
}
