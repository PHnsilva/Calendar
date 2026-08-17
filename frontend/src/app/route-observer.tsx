import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { trackPageView } from "../lib/analytics";

const SITE_URL = "https://sgpequenosreparos.com.br";
const PUBLIC_TITLE = "SG Pequenos Reparos | Manutenção residencial e pequenos reparos";
const PUBLIC_DESCRIPTION = "Serviços de manutenção residencial, montagem, elétrica, hidráulica, instalações, pintura, jardinagem e pequenos reparos em Belo Horizonte, Itabirito, Ouro Preto, Moeda e Nova Lima.";

const PRIVATE_METADATA: Record<string, { title: string; description: string }> = {
  "/meus-agendamentos": {
    title: "Meus agendamentos | SG Pequenos Reparos",
    description: "Área privada para acompanhar seus agendamentos com a SG Pequenos Reparos.",
  },
  "/403": { title: "Acesso restrito | SG Pequenos Reparos", description: "Esta área possui acesso restrito." },
  "/500": { title: "Serviço indisponível | SG Pequenos Reparos", description: "O serviço está temporariamente indisponível." },
};

function upsertMeta(selector: string, attributes: Record<string, string>, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    Object.entries(attributes).forEach(([name, value]) => element?.setAttribute(name, value));
    document.head.appendChild(element);
  }
  element.content = content;
}

function upsertCanonical(url: string): void {
  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = url;
}

function resolveMetadata(pathname: string) {
  if (pathname === "/") return { title: PUBLIC_TITLE, description: PUBLIC_DESCRIPTION, indexable: true };
  if (PRIVATE_METADATA[pathname]) return { ...PRIVATE_METADATA[pathname], indexable: false };
  if (pathname.startsWith("/admin")) return { title: "Administração | SG Pequenos Reparos", description: "Área administrativa restrita.", indexable: false };
  if (pathname.startsWith("/prestador")) return { title: "Área do prestador | SG Pequenos Reparos", description: "Área restrita do prestador.", indexable: false };
  return { title: "Página não encontrada | SG Pequenos Reparos", description: "A página solicitada não foi encontrada.", indexable: false };
}

function applyRouteMetadata(pathname: string): void {
  const metadata = resolveMetadata(pathname);
  const canonicalUrl = `${SITE_URL}${pathname === "/" ? "/" : pathname}`;
  document.documentElement.lang = "pt-BR";
  document.title = metadata.title;
  upsertMeta('meta[name="description"]', { name: "description" }, metadata.description);
  upsertMeta('meta[name="robots"]', { name: "robots" }, metadata.indexable ? "index, follow, max-image-preview:large" : "noindex, nofollow, noarchive");
  upsertMeta('meta[property="og:title"]', { property: "og:title" }, metadata.title);
  upsertMeta('meta[property="og:description"]', { property: "og:description" }, metadata.description);
  upsertMeta('meta[property="og:url"]', { property: "og:url" }, canonicalUrl);
  upsertMeta('meta[name="twitter:title"]', { name: "twitter:title" }, metadata.title);
  upsertMeta('meta[name="twitter:description"]', { name: "twitter:description" }, metadata.description);
  upsertCanonical(canonicalUrl);

  document.querySelectorAll('script[data-public-schema="true"]').forEach((schema) => {
    schema.toggleAttribute("hidden", !metadata.indexable);
    schema.setAttribute("type", metadata.indexable ? "application/ld+json" : "application/json");
  });
}

export default function RouteObserver() {
  const { pathname } = useLocation();

  useEffect(() => {
    applyRouteMetadata(pathname);
    trackPageView(pathname);
  }, [pathname]);

  return <Outlet />;
}
