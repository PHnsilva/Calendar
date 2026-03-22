import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ADMIN_TOKEN_KEY = "calendar.adminToken";

function getSavedAdminToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ADMIN_TOKEN_KEY) ?? "";
}

function saveAdminToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

function clearAdminToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export default function AdminGatePage() {
  const navigate = useNavigate();
  const [token, setToken] = useState(getSavedAdminToken());

  useEffect(() => {
    if (getSavedAdminToken()) {
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
              clearAdminToken();
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
              saveAdminToken(token.trim());
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
