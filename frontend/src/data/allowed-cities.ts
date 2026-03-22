export const PRIMARY_CITY = "Belo Horizonte";

export const OTHER_ALLOWED_CITIES = [
  "Itabirito",
  "Ouro Preto",
  "Moeda",
  "Congonhas",
  "Nova Lima",
] as const;

export const ALLOWED_CITIES = [PRIMARY_CITY, ...OTHER_ALLOWED_CITIES] as const;

export type AllowedCity = (typeof ALLOWED_CITIES)[number];
