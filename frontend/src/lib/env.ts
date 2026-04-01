function normalizeEnvValue(value: string | undefined): string {
  return (value ?? "").trim().replace(/^(["'])(.*)$/, "$2");
}

export const env = {
  apiBaseUrl: normalizeEnvValue(import.meta.env.VITE_API_BASE_URL as string | undefined) || "http://localhost:8080",
  geoapifyPublicKey: normalizeEnvValue(import.meta.env.VITE_GEOAPIFY_PUBLIC_KEY as string | undefined),
  googleMapsApiKey: normalizeEnvValue(import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined),
  adminEnabled: String(import.meta.env.VITE_ADMIN_ENABLED ?? "true") !== "false",
};
