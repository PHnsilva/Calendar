import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearStoredAdminToken, getStoredAdminToken, setStoredAdminToken } from "../../lib/storage";

export default function AdminGatePage() {
  const navigate = useNavigate();
  const [token, setToken] = useState(getStoredAdminToken());

  useEffect(() => {
    if (getStoredAdminToken()) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [navigate]);

  return (
    <main className="admin-gate-page">
      <section className="admin-gate-card">
        <span className="home-page__eyebrow">Admin</span>
        <h1 className="admin-gate-card__title">Acessar painel administrativo</h1>
        <p className="admin-gate-card__text">
          Informe o token admin para abrir a agenda completa, histórico e extrato.
        </p>

        <label className="booking-form__field">
          <span>Token admin</span>
          <input
            className="booking-form__input"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="secret-admin-token"
          />
        </label>

        <div className="admin-gate-card__actions">
          <button
            type="button"
            className="secondary-action"
            onClick={() => {
              clearStoredAdminToken();
              setToken("");
            }}
          >
            Limpar
          </button>
          <button
            type="button"
            className="primary-action"
            disabled={!token.trim()}
            onClick={() => {
              setStoredAdminToken(token.trim());
              navigate("/admin/dashboard", { replace: true });
            }}
          >
            Entrar
          </button>
        </div>
      </section>
    </main>
  );
}
