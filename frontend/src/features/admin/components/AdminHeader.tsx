import { Link } from "react-router-dom";
import Logo from "../../../components/branding/Logo";
import { ThemeToggle } from "../../../components/ui/ThemeToggle";

type AdminHeaderProps = {
  token: string;
  onClearToken: () => void;
};

function maskToken(token: string): string {
  if (token.length <= 8) {
    return token;
  }

  return `${token.slice(0, 4)}••••${token.slice(-4)}`;
}

export default function AdminHeader({ token, onClearToken }: AdminHeaderProps) {
  return (
    <header className="admin-header panel">
      <div className="admin-header__brand">
        <Link to="/" className="brand-lockup" aria-label="Voltar para home">
          <Logo />
        </Link>

        <div className="admin-header__title-block">
          <span className="admin-header__eyebrow">Sprint 2</span>
          <strong className="admin-header__title">Dashboard operacional</strong>
        </div>
      </div>

      <div className="admin-header__actions">
        <span className="admin-token-chip" title={token}>
          Token: {maskToken(token)}
        </span>
        <ThemeToggle />
        <button type="button" className="admin-btn admin-btn--ghost" onClick={onClearToken}>
          Trocar token
        </button>
      </div>
    </header>
  );
}
