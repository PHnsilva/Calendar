import { ApiError, apiClient } from "../../../lib/api-client";
import { env } from "../../../lib/env";
import type { GeoapifyAddressSuggestion, GeoapifyCityContext } from "../../../types/api";

const AUTOCOMPLETE_ENDPOINT = "https://api.geoapify.com/v1/geocode/autocomplete";
const BACKEND_AUTOCOMPLETE_ENDPOINT = "/api/enderecos/autocomplete";
const BACKEND_CITY_CONTEXT_ENDPOINT = "/api/enderecos/cidade";
const DEFAULT_LIMIT = 5;
const CITY_RADIUS_METERS = 15_000;

type GeoapifyResult = Record<string, unknown>;

type GeoapifyAutocompleteResponse = {
  results?: GeoapifyResult[];
  features?: { properties?: GeoapifyResult }[];
};

class GeoapifyDirectRequestError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "GeoapifyDirectRequestError";
    this.status = status;
  }
}

let hasWarnedDirectFallback = false;

const BRAZIL_STATE_TO_UF: Record<string, string> = {
  acre: "AC",
  alagoas: "AL",
  amapa: "AP",
  amazonas: "AM",
  bahia: "BA",
  ceara: "CE",
  "distrito federal": "DF",
  "espirito santo": "ES",
  goias: "GO",
  maranhao: "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  para: "PA",
  paraiba: "PB",
  parana: "PR",
  pernambuco: "PE",
  piaui: "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  rondonia: "RO",
  roraima: "RR",
  "santa catarina": "SC",
  "sao paulo": "SP",
  sergipe: "SE",
  tocantins: "TO",
};

function isDevelopment() {
  return Boolean(import.meta.env.DEV);
}

function logGeoapifyDebug(label: string, payload: Record<string, unknown>) {
  if (!isDevelopment()) return;
  console.debug(`[CalendarMate] Geoapify ${label}`, payload);
}

function sanitizeGeoapifyUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has("apiKey")) {
      parsed.searchParams.set("apiKey", "[redacted]");
    }
    return parsed.toString();
  } catch {
    return url.replace(/apiKey=[^&]+/i, "apiKey=[redacted]");
  }
}

function normalizeText(value?: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeForMatch(value?: unknown): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeNumber(value?: unknown): number {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function normalizePostcode(value?: unknown): string {
  return normalizeText(value).replace(/\D/g, "").slice(0, 8);
}

function normalizeUf(value?: unknown): string {
  const text = normalizeText(value).toUpperCase();
  if (/^[A-Z]{2}$/.test(text)) return text;
  return BRAZIL_STATE_TO_UF[normalizeForMatch(value)] ?? "";
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = normalizeText(value);
    if (text) return text;
  }
  return "";
}

function buildAddressLine1(street: string, houseNumber: string, fallback: string): string {
  return [street, houseNumber].filter(Boolean).join(", ").trim() || fallback;
}

function buildAddressLine2(neighborhood: string, city: string, state: string): string {
  return [neighborhood, city, state].filter(Boolean).join(" - ").trim();
}

export function extractGeoapifyResults(payload: GeoapifyAutocompleteResponse | null | undefined): GeoapifyResult[] {
  if (!payload) return [];
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.features)) return payload.features.map((item) => item.properties ?? {});
  return [];
}

export function toSuggestion(properties: GeoapifyResult): GeoapifyAddressSuggestion | null {
  const formatted = firstText(properties.formatted, properties.address_line1);
  const street = firstText(properties.street, properties.address_line1);
  const houseNumber = normalizeText(properties.housenumber);
  const neighborhood = firstText(properties.suburb, properties.district, properties.neighbourhood);
  const city = firstText(properties.city, properties.town, properties.village, properties.municipality, properties.county, properties.state_district);
  const stateCode = normalizeUf(firstText(properties.state_code, properties.state));
  const state = stateCode || normalizeText(properties.state).toUpperCase();
  const postcode = normalizePostcode(properties.postcode);
  const latitude = normalizeNumber(properties.lat);
  const longitude = normalizeNumber(properties.lon);

  if (!formatted || Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

  const id = firstText(properties.place_id, properties.placeId, `${formatted}-${latitude}-${longitude}`);
  const label = formatted;

  return {
    id,
    label,
    placeId: id,
    formatted,
    latitude,
    longitude,
    lat: latitude,
    lon: longitude,
    addressLine1: buildAddressLine1(street, houseNumber, formatted),
    addressLine2: buildAddressLine2(neighborhood, city, state),
    street,
    houseNumber,
    neighborhood,
    city,
    state,
    postcode,
    raw: properties,
  };
}

function getCityCandidates(item: GeoapifyAddressSuggestion): string[] {
  const raw = item.raw ?? {};
  return [
    item.city,
    raw.city,
    raw.town,
    raw.village,
    raw.municipality,
    raw.county,
    raw.state_district,
  ]
    .map(normalizeForMatch)
    .filter(Boolean);
}

function cityMatchesSuggestion(item: GeoapifyAddressSuggestion, cityContext?: GeoapifyCityContext): boolean {
  const selectedCity = normalizeForMatch(cityContext?.name);
  if (!selectedCity) return true;

  const cityCandidates = getCityCandidates(item);
  const hasCityData = cityCandidates.length > 0;
  const cityMatches = cityCandidates.some((candidate) => candidate === selectedCity);

  const selectedUf = normalizeUf(cityContext?.state);
  const raw = item.raw ?? {};
  const resultUfCandidates = [item.state, raw.state_code, raw.state].map(normalizeUf).filter(Boolean);
  const hasStateData = resultUfCandidates.length > 0;
  const stateMatches = !selectedUf || !hasStateData || resultUfCandidates.includes(selectedUf);

  if (hasCityData) return cityMatches && stateMatches;
  return stateMatches;
}

export function filterSuggestionsBySelectedCity(
  suggestions: GeoapifyAddressSuggestion[],
  cityContext?: GeoapifyCityContext,
): GeoapifyAddressSuggestion[] {
  return suggestions.filter((item) => cityMatchesSuggestion(item, cityContext));
}

function toCityContext(properties: GeoapifyResult, requestedCity: string, requestedState?: string): GeoapifyCityContext | null {
  const name = firstText(properties.city, properties.town, properties.village, properties.municipality, properties.name, requestedCity);
  const state = normalizeUf(firstText(properties.state_code, properties.state, requestedState));
  const latitude = normalizeNumber(properties.lat);
  const longitude = normalizeNumber(properties.lon);
  const placeId = firstText(properties.place_id, properties.placeId);

  if (!name || Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

  return {
    name,
    state: state || requestedState,
    placeId: placeId || undefined,
    latitude,
    longitude,
    raw: properties,
  };
}

function pickMatchingCityContext(
  results: GeoapifyResult[],
  cityName: string,
  state?: string,
): GeoapifyCityContext | null {
  const normalizedCity = normalizeForMatch(cityName);
  const expectedUf = normalizeUf(state);
  const normalizedState = normalizeForMatch(state);

  const contexts = results
    .map((item) => toCityContext(item, cityName, state))
    .filter((item): item is GeoapifyCityContext => Boolean(item));

  return contexts.find((context) => {
    const raw = context.raw ?? {};
    const cityCandidates = [
      context.name,
      raw.city,
      raw.town,
      raw.village,
      raw.municipality,
      raw.name,
    ].map(normalizeForMatch);
    const cityMatches = cityCandidates.some((candidate) => candidate === normalizedCity);
    const ufCandidates = [context.state, raw.state_code, raw.state].map(normalizeUf).filter(Boolean);
    const stateCandidates = [context.state, raw.state].map(normalizeForMatch).filter(Boolean);
    const stateMatches = !expectedUf && !normalizedState
      ? true
      : ufCandidates.includes(expectedUf) || stateCandidates.includes(normalizedState);
    return cityMatches && stateMatches;
  }) ?? contexts[0] ?? null;
}

function buildGeoapifyFilter(cityContext?: GeoapifyCityContext): string {
  if (cityContext?.placeId) {
    return `place:${cityContext.placeId}|countrycode:br`;
  }
  const latitude = cityContext?.latitude;
  const longitude = cityContext?.longitude;
  if (
    typeof latitude === "number"
    && typeof longitude === "number"
    && Number.isFinite(latitude)
    && Number.isFinite(longitude)
  ) {
    return `circle:${longitude},${latitude},${CITY_RADIUS_METERS}`;
  }
  return "";
}

export function buildGeoapifyAddressUrl(query: string, cityContext: GeoapifyCityContext, apiKey: string): string {
  const filter = buildGeoapifyFilter(cityContext);
  if (!filter) {
    throw new GeoapifyDirectRequestError("Cidade ainda nao foi resolvida para restringir a busca de endereco.");
  }

  const params = new URLSearchParams({
    text: query,
    filter,
    limit: String(DEFAULT_LIMIT),
    lang: "pt",
    format: "json",
    apiKey,
  });

  return `${AUTOCOMPLETE_ENDPOINT}?${params.toString()}`;
}

function buildGeoapifyCityUrl(cityName: string, state: string | undefined, apiKey: string): string {
  const params = new URLSearchParams({
    text: state ? `${cityName}, ${state}` : cityName,
    type: "city",
    filter: "countrycode:br",
    limit: String(DEFAULT_LIMIT),
    lang: "pt",
    format: "json",
    apiKey,
  });

  return `${AUTOCOMPLETE_ENDPOINT}?${params.toString()}`;
}

async function parseGeoapifyResponse(response: Response, context: "city" | "address") {
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new GeoapifyDirectRequestError("Geoapify recusou a chave publica do autocomplete.", response.status);
    }
    if (response.status === 429) {
      throw new GeoapifyDirectRequestError("Limite de consultas do autocomplete atingido.", response.status);
    }
    throw new Error(`Nao foi possivel buscar sugestoes de ${context === "city" ? "cidade" : "endereco"}. Geoapify retornou ${response.status}.`);
  }

  return (await response.json()) as GeoapifyAutocompleteResponse;
}

async function resolveCityDirectly(cityName: string, state?: string): Promise<GeoapifyCityContext | null> {
  const url = buildGeoapifyCityUrl(cityName, state, env.geoapifyPublicKey);

  logGeoapifyDebug("city resolver request", {
    selectedCity: cityName,
    selectedState: state ?? "",
    finalUrl: sanitizeGeoapifyUrl(url),
  });

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new GeoapifyDirectRequestError("Nao foi possivel conectar ao resolvedor de cidade do Geoapify.");
  }

  const payload = await parseGeoapifyResponse(response, "city");
  const results = extractGeoapifyResults(payload);
  const context = pickMatchingCityContext(results, cityName, state);

  logGeoapifyDebug("city resolver response", {
    selectedCity: cityName,
    selectedState: state ?? "",
    responseHasResults: Array.isArray(payload.results),
    normalizedSuggestionCount: results.length,
    selectedCityPlaceIdExists: Boolean(context?.placeId),
  });

  return context;
}

async function resolveCityThroughBackend(cityName: string, state?: string): Promise<GeoapifyCityContext | null> {
  try {
    return await apiClient<GeoapifyCityContext | null>(BACKEND_CITY_CONTEXT_ENDPOINT, {
      method: "GET",
      query: {
        city: cityName,
        state,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error("Nao foi possivel resolver a cidade para o autocomplete de endereco.");
  }
}

export async function resolveGeoapifyCityContext(cityName: string, state?: string): Promise<GeoapifyCityContext | null> {
  const city = cityName.trim();
  if (!city) return null;

  if (!env.geoapifyPublicKey) {
    return resolveCityThroughBackend(city, state);
  }

  try {
    return await resolveCityDirectly(city, state);
  } catch (error) {
    if (!(error instanceof GeoapifyDirectRequestError)) throw error;

    if (!hasWarnedDirectFallback) {
      hasWarnedDirectFallback = true;
      console.warn("[CalendarMate] Geoapify direct city resolver failed; using backend proxy.", error);
    }

    return resolveCityThroughBackend(city, state);
  }
}

async function searchAddressesDirectly(query: string, cityContext: GeoapifyCityContext): Promise<GeoapifyAddressSuggestion[]> {
  const url = buildGeoapifyAddressUrl(query, cityContext, env.geoapifyPublicKey);

  logGeoapifyDebug("address request", {
    selectedCity: cityContext.name,
    selectedState: cityContext.state ?? "",
    selectedCityPlaceIdExists: Boolean(cityContext.placeId),
    finalUrl: sanitizeGeoapifyUrl(url),
  });

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new GeoapifyDirectRequestError("Nao foi possivel conectar ao autocomplete direto de endereco.");
  }

  const payload = await parseGeoapifyResponse(response, "address");
  const rawItems = extractGeoapifyResults(payload);
  const normalized = rawItems.map(toSuggestion).filter((item): item is GeoapifyAddressSuggestion => Boolean(item));
  const filtered = filterSuggestionsBySelectedCity(normalized, cityContext);

  logGeoapifyDebug("address response", {
    selectedCity: cityContext.name,
    selectedState: cityContext.state ?? "",
    selectedCityPlaceIdExists: Boolean(cityContext.placeId),
    responseHasResults: Array.isArray(payload.results),
    normalizedSuggestionCount: normalized.length,
    filteredSuggestionCount: filtered.length,
  });

  return filtered;
}

async function searchAddressesThroughBackend(query: string, cityContext: GeoapifyCityContext): Promise<GeoapifyAddressSuggestion[]> {
  try {
    const items = await apiClient<GeoapifyAddressSuggestion[]>(BACKEND_AUTOCOMPLETE_ENDPOINT, {
      method: "GET",
      query: {
        text: query,
        city: cityContext.name,
        state: cityContext.state,
        cityPlaceId: cityContext.placeId,
        cityLat: cityContext.latitude,
        cityLon: cityContext.longitude,
      },
    });
    return filterSuggestionsBySelectedCity(items, cityContext);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error("Nao foi possivel conectar ao backend de autocomplete de endereco.");
  }
}

export async function searchAddresses(text: string, cityContext?: GeoapifyCityContext | string): Promise<GeoapifyAddressSuggestion[]> {
  const query = text.trim();
  if (query.length < 3) return [];

  const context = typeof cityContext === "string" ? { name: cityContext } : cityContext;
  if (!context?.name?.trim()) {
    throw new Error("Cidade: selecione uma cidade antes de buscar o endereco.");
  }

  if (!buildGeoapifyFilter(context)) {
    throw new Error("Cidade: aguarde a validacao da cidade para restringir a busca de endereco.");
  }

  if (!env.geoapifyPublicKey) {
    return searchAddressesThroughBackend(query, context);
  }

  try {
    return await searchAddressesDirectly(query, context);
  } catch (error) {
    if (!(error instanceof GeoapifyDirectRequestError)) throw error;

    if (!hasWarnedDirectFallback) {
      hasWarnedDirectFallback = true;
      console.warn("[CalendarMate] Geoapify direct autocomplete failed; using backend proxy.", error);
    }

    return searchAddressesThroughBackend(query, context);
  }
}
