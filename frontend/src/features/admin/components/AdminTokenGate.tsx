import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAdminToken, getStoredAdminToken, saveAdminToken } from "../../../lib/storage";

type AdminTokenGateProps = {
  redirectTo?: string;
};

export default function AdminTokenGate({ redirectTo = "/admin/dashboard" }: AdminTokenGateProps) {
  const navigate = useNavigate();
  const [value, setValue] = useState(getStoredAdminToken());

  const handleSubmit = () => {
    if (!value.trim()) return;
    saveAdminToken(value.trim());
    navigate(redirectTo, { replace: true });
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
      <div className="admin-gate-card__actions">
        <button type="button" className="secondary-action" onClick={() => { clearAdminToken(); setValue(""); }}>
          Limpar
        </button>
        <button type="button" className="primary-action" onClick={handleSubmit} disabled={!value.trim()}>
          Entrar
        </button>
      </div>
    </section>
  );
}
