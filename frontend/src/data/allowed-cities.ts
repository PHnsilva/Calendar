export const PRIMARY_CITY = "Belo Horizonte";

export const OTHER_ALLOWED_CITIES = [
  "Itabirito",
  "Ouro Preto",
  "Moeda",
  "Congonhas",
  "Nova Lima",
] as const;

export const OTHER_CITIES = OTHER_ALLOWED_CITIES;
export const ALLOWED_CITIES = [PRIMARY_CITY, ...OTHER_ALLOWED_CITIES] as const;

export type AllowedCity = (typeof ALLOWED_CITIES)[number];

export function getCityTone(city?: string): string {
  const normalized = (city ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

  if (normalized.includes("belo horizonte")) return "violet";
  if (normalized.includes("itabirito")) return "cyan";
  if (normalized.includes("ouro preto")) return "indigo";
  if (normalized.includes("moeda")) return "orange";
  if (normalized.includes("congonhas")) return "teal";
  if (normalized.includes("nova lima")) return "amber";
  return "royal";
}
