import { useTheme } from "../../app/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Ativar tema escuro" : "Ativar tema claro"}
      title={theme === "light" ? "Tema escuro" : "Tema claro"}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {theme === "light" ? "☾" : "☀"}
      </span>
      <span className="theme-toggle__label">
        {theme === "light" ? "Escuro" : "Claro"}
      </span>
    </button>
  );
}