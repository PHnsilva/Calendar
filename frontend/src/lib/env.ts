function normalizeEnvValue(value: string | undefined): string {
  const normalized = (value ?? "").trim();
  return normalized.replace(/^["']|["']$/g, "");
}

export const env = {
  apiBaseUrl: normalizeEnvValue(import.meta.env.VITE_API_BASE_URL as string | undefined),
  geoapifyPublicKey: normalizeEnvValue(import.meta.env.VITE_GEOAPIFY_PUBLIC_KEY as string | undefined),
  adminEnabled: String(import.meta.env.VITE_ADMIN_ENABLED ?? "true") !== "false",
};

export function resolveApiBaseUrl(): string {
  if (env.apiBaseUrl) {
    return env.apiBaseUrl;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:8080";
}
