export const ALLOWED_CITIES = ["Itabirito", "Ouro Preto", "Moeda"] as const;

export type AllowedCity = (typeof ALLOWED_CITIES)[number];
export type CityTone =
  | "violet"
  | "cyan"
  | "indigo"
  | "orange"
  | "teal"
  | "amber"
  | "royal";

const CITY_TONE_BY_CITY: Record<string, CityTone> = {
  Itabirito: "cyan",
  "Ouro Preto": "indigo",
  Moeda: "orange",
  "Nova Lima": "teal",
  Congonhas: "amber",
  "Rio Acima": "royal",
  "Belo Horizonte": "violet",
};

export function getCityTone(city?: string | null): CityTone {
  if (!city) return "violet";
  return CITY_TONE_BY_CITY[city] ?? "violet";
}

export function isAllowedCity(value?: string | null): value is AllowedCity {
  return Boolean(value && ALLOWED_CITIES.includes(value as AllowedCity));
}

export function normalizeCityTone(city?: string | null): CityTone {
  return getCityTone(city);
}
