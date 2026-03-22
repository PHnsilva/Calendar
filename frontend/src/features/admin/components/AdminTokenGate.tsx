import { useEffect, useState } from "react";

type AdminTokenGateProps = {
  initialToken?: string;
  onSubmit: (token: string) => void;
  onClear?: () => void;
};

export default function AdminTokenGate({
  initialToken = "",
  onSubmit,
  onClear,
}: AdminTokenGateProps) {
  const [token, setToken] = useState(initialToken);

  useEffect(() => {
    setToken(initialToken);
  }, [initialToken]);

  return (
    <section className="admin-gate panel">
      <div className="admin-gate__copy">
        <span className="admin-gate__eyebrow">Área administrativa</span>
        <h1 className="admin-gate__title">Entrar com token do admin</h1>
        <p className="admin-gate__description">
          Essa área usa o header estático do backend. Guarde o token localmente apenas neste navegador.
        </p>
      </div>

      <form
        className="admin-gate__form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!token.trim()) {
            return;
          }
          onSubmit(token.trim());
        }}
      >
        <label className="admin-field">
          <span>Token</span>
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="Cole aqui o X-ADMIN-TOKEN"
            autoComplete="off"
          />
        </label>

        <div className="admin-gate__actions">
          {onClear ? (
            <button type="button" className="admin-btn admin-btn--ghost" onClick={onClear}>
              Limpar
            </button>
          ) : null}

          <button type="submit" className="admin-btn admin-btn--primary">
            Entrar no dashboard
          </button>
        </div>
      </form>
    </section>
  );
}
