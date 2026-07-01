import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearStoredAdminToken, getStoredAdminToken, setStoredAdminToken } from "../../lib/storage";

type AdminTokenGateProps = {
  initialToken?: string;
};

export default function AdminTokenGate({ initialToken = "" }: AdminTokenGateProps) {
  const navigate = useNavigate();
  const [token, setToken] = useState(initialToken || getStoredAdminToken());

  return (
    <section className="admin-token-gate">
      <div className="admin-token-gate__card">
        <span className="admin-token-gate__eyebrow">Admin</span>
        <h1 className="admin-token-gate__title">Acesso administrativo</h1>
        <p className="admin-token-gate__text">
          Informe o código de acesso administrativo para carregar os agendamentos e calcular rotas no painel.
        </p>

        <label className="admin-token-gate__field">
          <span>Código de acesso</span>
          <input
            className="booking-form__input"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Código administrativo"
          />
        </label>

        <div className="admin-token-gate__actions">
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
              setStoredAdminToken(token);
              navigate("/admin/dashboard", { replace: true });
            }}
          >
            Entrar no painel
          </button>
        </div>
      </div>
    </section>
  );
}
