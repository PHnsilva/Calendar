import { useEffect, useMemo, useState } from "react";
import defaultLogo from "../../assets/brand/logo.png";

const brandAssets = import.meta.glob("../../assets/brand/*", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function findDarkLogo() {
  const entries = Object.entries(brandAssets);

  const priorityPatterns = [
    /logo[-_ ]?dark/i,
    /logo[-_ ]?night/i,
    /logo[-_ ]?moon/i,
    /logo[-_ ]?black/i,
    /dark.*logo/i,
  ];

  for (const pattern of priorityPatterns) {
    const match = entries.find(([path]) => pattern.test(path));
    if (match) return match[1];
  }

  const genericDark = entries.find(([path]) => /dark|night|moon|black/i.test(path));
  return genericDark?.[1] ?? null;
}

export default function Logo() {
  const [theme, setTheme] = useState<string>(() =>
    typeof document === "undefined"
      ? "light"
      : document.documentElement.dataset.theme ?? "light",
  );

  useEffect(() => {
    if (typeof document === "undefined") return;

    const target = document.documentElement;
    const observer = new MutationObserver(() => {
      setTheme(target.dataset.theme ?? "light");
    });

    observer.observe(target, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const darkLogo = useMemo(() => findDarkLogo(), []);
  const logoSrc = theme === "dark" && darkLogo ? darkLogo : defaultLogo;

  return (
    <div className="brand-lockup__inner">
      <div className="brand-lockup__logo-shell" aria-hidden="true">
        <img
          src={logoSrc}
          alt="Logo SG Pequenos Reparos"
          className="brand-lockup__logo"
        />
      </div>

      <span className="brand-lockup__copy">
        <strong>SG Pequenos Reparos</strong>
        <small>Agendamentos</small>
      </span>
    </div>
  );
}
