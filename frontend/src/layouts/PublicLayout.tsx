import { Link, Outlet } from "react-router-dom";
import AppShell from "./AppShell";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import Logo from "../components/branding/Logo";

export default function PublicLayout() {
  const header = (
    <header className="public-header">
      <Link to="/" className="brand-lockup" aria-label="Ir para a página inicial">
        <Logo />
      </Link>

      <div className="public-header__actions">
        <ThemeToggle />
      </div>
    </header>
  );

  return (
    <AppShell header={header}>
      <main className="public-layout__content">
        <Outlet />
      </main>
    </AppShell>
  );
}