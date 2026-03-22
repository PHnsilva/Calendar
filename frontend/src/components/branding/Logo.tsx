import defaultLogo from "../../assets/brand/logo.png";
import { useTheme } from "../../app/theme-provider";

const brandLogos = import.meta.glob("../../assets/brand/*", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function resolveDarkLogo(): string | null {
  const candidates = Object.entries(brandLogos)
    .map(([path, value]) => ({ path: path.toLowerCase(), value }))
    .filter(({ path }) => /logo/.test(path) && /(dark|night|moon|black)/.test(path));

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.path.localeCompare(b.path));
  return candidates[0].value;
}

const darkLogo = resolveDarkLogo();

export default function Logo() {
  const { theme } = useTheme();
  const src = theme === "dark" && darkLogo ? darkLogo : defaultLogo;

  return (
    <div className="brand-lockup__inner">
      <div className="brand-lockup__logo-shell" aria-hidden="true">
        <img src={src} alt="Logo SG Pequenos Reparos" className="brand-lockup__logo" />
      </div>

      <span className="brand-lockup__copy">
        <strong>SG Pequenos Reparos</strong>
        <small>Agendamentos</small>
      </span>
    </div>
  );
}
