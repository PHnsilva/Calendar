export const PRIMARY_CITY = "Belo Horizonte";

export const OTHER_CITIES = [
  "Itabirito",
  "Ouro Preto",
  "Moeda",
  "Nova Lima",
  "Congonhas",
  "Rio Acima",
  "Brumadinho",
] as const;

export const ALLOWED_CITIES = [PRIMARY_CITY, ...OTHER_CITIES] as const;

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
  "Belo Horizonte": "violet",
  Itabirito: "cyan",
  "Ouro Preto": "indigo",
  Moeda: "orange",
  "Nova Lima": "teal",
  Congonhas: "amber",
  "Rio Acima": "royal",
  Brumadinho: "cyan",
};

export function getCityTone(city?: string | null): CityTone {
  if (!city) return "violet";
  return CITY_TONE_BY_CITY[city] ?? "violet";
}

export function isAllowedCity(value?: string | null): value is AllowedCity {
  return Boolean(value && ALLOWED_CITIES.includes(value as AllowedCity));
}
