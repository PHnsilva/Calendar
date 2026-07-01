import { ApiError, apiClient } from "../../../lib/api-client";
import { env } from "../../../lib/env";
import { normalizeApiErrorMessage } from "../../../lib/errors";
import type { GeoapifyAddressSuggestion, GeoapifyCityContext } from "../../../types/api";

const AUTOCOMPLETE_ENDPOINT = "https://api.geoapify.com/v1/geocode/autocomplete";
const BACKEND_AUTOCOMPLETE_ENDPOINT = "/api/enderecos/autocomplete";
const BACKEND_CITY_CONTEXT_ENDPOINT = "/api/enderecos/cidade";
const DEFAULT_LIMIT = 20;
const CITY_RADIUS_METERS = 30_000;
const FALLBACK_MIN_RESULTS = 5;

type GeoapifyResult = Record<string, unknown>;

type GeoapifyAutocompleteResponse = {
  results?: GeoapifyResult[];
  features?: { properties?: GeoapifyResult }[];
};

type BackendAddressErrorPayload = {
  error?: string;
  message?: string;
  field?: string;
  details?: Record<string, unknown> | null;
};

export type GeoapifyAddressSearchDebug = {
  inputValue: string;
  selectedCityName: string;
  selectedCityState: string;
  selectedCityPlaceIdExists: boolean;
  finalUrl?: string;
  httpStatus?: number;
  rawResultsCount: number;
  rawFeaturesCount: number;
  normalizedSuggestionCount: number;
  filteredSuggestionCount: number;
  stateSuggestionCount: number;
  source: "direct" | "backend";
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
let lastAddressSearchDebug: GeoapifyAddressSearchDebug | null = null;

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
  return Boolean(import.meta.env.DEV && import.meta.env.MODE !== "test");
}

function logGeoapifyDebug(label: string, payload: Record<string, unknown>) {
  if (!isDevelopment()) return;
  console.debug(`[CalendarMate] Geoapify ${label}`, payload);
}

export function getLastAddressSearchDebug() {
  return lastAddressSearchDebug;
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

function mapBackendAddressError(error: ApiError, fallback: string): Error {
  const payload = (typeof error.payload === "object" && error.payload !== null ? error.payload : null) as BackendAddressErrorPayload | null;
  const field = payload?.field ?? "";
  const code = error.code || payload?.error || "";

  if (error.status === 0) {
    return new Error("Não foi possível buscar endereços agora. Verifique sua conexão e tente novamente.");
  }
  if (error.status === 404) {
    return new Error("A busca de endereços não está disponível agora.");
  }
  if (code === "ADDRESS_STATE_INVALID" || field === "state") {
    return new Error("Estado inválido para a busca de endereço. Use a UF, como MG.");
  }
  if (code === "ADDRESS_CITY_REQUIRED" || code === "ADDRESS_CITY_NOT_FOUND" || field === "city") {
    return new Error(normalizeApiErrorMessage(error, {
      context: "address",
      fallbackMessage: "Cidade inválida para a busca de endereço.",
    }));
  }
  if (code === "ADDRESS_AUTOCOMPLETE_UNAVAILABLE") {
    return new Error("A busca automática de endereço não está disponível agora. Preencha rua, bairro e número manualmente.");
  }
  if (error.status >= 500) {
    return new Error("A busca de endereços está temporariamente indisponível.");
  }
  return new Error(normalizeApiErrorMessage(error, { context: "address", fallbackMessage: fallback }));
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

function buildAddressLine2(neighborhood: string): string {
  return neighborhood;
}

const HOUSE_NUMBER_PATTERN = /^\d+[a-zA-Z]?(?:[-/]\d+)?$/;
const STREET_PREFIX_PATTERN = /^(r\.?|rua|av\.?|avenida|alameda|travessa|praca|rodovia|estrada|beco|largo)\b/i;

function parseAddressLine2(value?: unknown): { street: string; houseNumber: string; neighborhood: string } {
  const parts = normalizeText(value).split(",").map((part) => part.trim()).filter(Boolean);
  const streetPartIndex = parts.findIndex((part) => STREET_PREFIX_PATTERN.test(part) || STREET_PREFIX_PATTERN.test(normalizeForMatch(part)));
  if (streetPartIndex < 0) {
    return { street: "", houseNumber: "", neighborhood: "" };
  }
  const selectedIndex = streetPartIndex;
  const streetPart = parts[selectedIndex] ?? "";
  const numberMatch = streetPart.match(/^(.+?)\s+(\d+[a-zA-Z]?(?:[-/]\d+)?)$/);
  const nextPart = parts[selectedIndex + 1] ?? "";
  const nextPartIsNumber = HOUSE_NUMBER_PATTERN.test(nextPart);

  return {
    street: numberMatch ? numberMatch[1].trim() : streetPart,
    houseNumber: numberMatch ? numberMatch[2].trim() : nextPartIsNumber ? nextPart : "",
    neighborhood: nextPartIsNumber ? parts[selectedIndex + 2] ?? "" : nextPart,
  };
}

function buildDisplayLabel(street: string, houseNumber: string, neighborhood: string, fallback: string): string {
  return [street, houseNumber, neighborhood].filter(Boolean).join(", ").trim() || fallback;
}

function isGenericPlaceResult(properties: GeoapifyResult, street: string, neighborhood: string): boolean {
  const resultType = normalizeForMatch(firstText(properties.result_type, properties.resultType, properties.type));
  if (street) return false;
  if (["city", "county", "state", "postcode", "district", "suburb"].includes(resultType)) return true;
  return !neighborhood;
}

function dedupeSuggestions(suggestions: GeoapifyAddressSuggestion[]): GeoapifyAddressSuggestion[] {
  const seen = new Set<string>();
  const output: GeoapifyAddressSuggestion[] = [];

  for (const suggestion of suggestions) {
    const key = firstText(
      suggestion.placeId,
      suggestion.id,
      `${suggestion.lat ?? suggestion.latitude}:${suggestion.lon ?? suggestion.longitude}:${suggestion.label}`,
    );
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(suggestion);
  }

  return output;
}

function normalizeSearchVariant(query: string): string {
  return query
    .trim()
    .replace(/^\s*r\.\s+/i, "Rua ")
    .replace(/^\s*av\.\s+/i, "Avenida ")
    .replace(/\s+-\s+/g, ", ")
    .replace(/\s+/g, " ");
}

function getSearchQueryVariants(query: string): string[] {
  const normalized = normalizeSearchVariant(query);
  const streetOnly = normalizeSearchVariant(query.split(/\s+-\s+/)[0] ?? "");
  const variants = [query.trim(), normalized, streetOnly].filter((item) => item.length >= 3);
  return Array.from(new Set(variants));
}

export function extractGeoapifyResults(payload: GeoapifyAutocompleteResponse | null | undefined): GeoapifyResult[] {
  if (!payload) return [];
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.features)) return payload.features.map((item) => item.properties ?? {});
  return [];
}

function countGeoapifyFeatures(payload: GeoapifyAutocompleteResponse | null | undefined) {
  return Array.isArray(payload?.features) ? payload.features.length : 0;
}

function countGeoapifyResults(payload: GeoapifyAutocompleteResponse | null | undefined) {
  return Array.isArray(payload?.results) ? payload.results.length : 0;
}

export function toSuggestion(properties: GeoapifyResult): GeoapifyAddressSuggestion | null {
  const rawFormatted = firstText(
    properties.formatted,
    [properties.address_line1, properties.address_line2].map(normalizeText).filter(Boolean).join(", "),
    [properties.name, properties.street, properties.housenumber, properties.suburb, properties.city, properties.state_code || properties.state, properties.country]
      .map(normalizeText)
      .filter(Boolean)
      .join(", "),
  );
  const parsedAddressLine2 = parseAddressLine2(firstText(properties.address_line2, properties.formatted));
  const street = firstText(properties.street, parsedAddressLine2.street, properties.address_line1);
  const houseNumber = firstText(properties.housenumber, parsedAddressLine2.houseNumber);
  const neighborhood = firstText(properties.suburb, properties.district, properties.neighbourhood, parsedAddressLine2.neighborhood);
  if (isGenericPlaceResult(properties, street, neighborhood)) return null;
  const formatted = buildDisplayLabel(street, houseNumber, neighborhood, rawFormatted);
  const city = firstText(properties.city, properties.town, properties.village);
  const stateCode = normalizeUf(firstText(properties.state_code, properties.state));
  const state = stateCode || normalizeText(properties.state).toUpperCase();
  const postcode = street ? normalizePostcode(properties.postcode) : "";
  const latitude = normalizeNumber(properties.lat);
  const longitude = normalizeNumber(properties.lon);

  if (!formatted || Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

  const id = firstText(properties.place_id, properties.placeId, `${latitude}-${longitude}-${rawFormatted || formatted || street}`);
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
    addressLine2: buildAddressLine2(neighborhood),
    street,
    houseNumber,
    neighborhood,
    city,
    state,
    postcode,
    raw: properties,
  };
}

export function normalizeGeoapifySuggestions(payload: GeoapifyAutocompleteResponse | null | undefined): GeoapifyAddressSuggestion[] {
  return extractGeoapifyResults(payload)
    .filter(Boolean)
    .map(toSuggestion)
    .filter((item): item is GeoapifyAddressSuggestion => Boolean(item));
}

function getCityCandidates(item: GeoapifyAddressSuggestion): string[] {
  const raw = item.raw ?? {};
  return [
    item.city,
    raw.city,
    raw.town,
    raw.village,
  ]
    .map(normalizeForMatch)
    .filter(Boolean);
}

function getStateCandidates(item: GeoapifyAddressSuggestion): string[] {
  const raw = item.raw ?? {};
  const isoState = normalizeText(raw.iso3166_2).toUpperCase();
  const isoUf = isoState.startsWith("BR-") ? isoState.slice(3, 5) : "";
  return [item.state, raw.state_code, raw.state, isoUf].map(normalizeUf).filter(Boolean);
}

function cityMatchesSuggestion(item: GeoapifyAddressSuggestion, cityContext?: GeoapifyCityContext): boolean {
  const selectedCity = normalizeForMatch(cityContext?.name);
  if (!selectedCity) return true;

  const cityCandidates = getCityCandidates(item);
  const hasCityData = cityCandidates.length > 0;
  const cityMatches = cityCandidates.some((candidate) => candidate === selectedCity);

  const selectedUf = normalizeUf(cityContext?.state);
  const resultUfCandidates = getStateCandidates(item);
  const hasStateData = resultUfCandidates.length > 0;
  const stateMatches = !selectedUf || !hasStateData || resultUfCandidates.includes(selectedUf);

  if (hasCityData) return cityMatches && stateMatches;
  return stateMatches;
}

export function filterSuggestionsBySelectedCity(
  suggestions: GeoapifyAddressSuggestion[],
  cityContext?: GeoapifyCityContext,
): GeoapifyAddressSuggestion[] {
  return suggestions
    .filter((item) => cityMatchesSuggestion(item, cityContext))
    .sort((left, right) => {
      const leftHasNumber = Boolean(normalizeText(left.houseNumber));
      const rightHasNumber = Boolean(normalizeText(right.houseNumber));
      if (leftHasNumber === rightHasNumber) return 0;
      return leftHasNumber ? -1 : 1;
    });
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

function buildGeoapifyPlaceFilter(cityContext?: GeoapifyCityContext): string {
  if (cityContext?.placeId) {
    return `place:${cityContext.placeId}|countrycode:br`;
  }
  return "";
}

function buildGeoapifyCircleFilter(cityContext?: GeoapifyCityContext): string {
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

function buildGeoapifyFilter(cityContext?: GeoapifyCityContext): string {
  return buildGeoapifyPlaceFilter(cityContext) || buildGeoapifyCircleFilter(cityContext);
}

export function buildGeoapifyAddressUrl(query: string, cityContext: GeoapifyCityContext, apiKey: string, filterOverride?: string): string {
  const filter = filterOverride || buildGeoapifyFilter(cityContext);
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

function buildAddressSearchAttempts(query: string, cityContext: GeoapifyCityContext, apiKey: string): string[] {
  const filters = [buildGeoapifyPlaceFilter(cityContext), buildGeoapifyCircleFilter(cityContext)].filter(Boolean);
  const uniqueFilters = Array.from(new Set(filters.length > 0 ? filters : [buildGeoapifyFilter(cityContext)]));
  const variants = getSearchQueryVariants(query);
  const attempts: string[] = [];

  for (const variant of variants) {
    for (const filter of uniqueFilters) {
      attempts.push(buildGeoapifyAddressUrl(variant, cityContext, apiKey, filter));
    }
  }

  return attempts;
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
      throw new GeoapifyDirectRequestError("A busca automatica de endereco nao esta disponivel agora.", response.status);
    }
    if (response.status === 429) {
      throw new GeoapifyDirectRequestError("A busca automatica de endereco esta temporariamente ocupada.", response.status);
    }
    throw new GeoapifyDirectRequestError(`Nao foi possivel buscar sugestoes de ${context === "city" ? "cidade" : "endereco"}.`, response.status);
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
    throw new GeoapifyDirectRequestError("Nao foi possivel validar a cidade agora.");
  }

  const payload = await parseGeoapifyResponse(response, "city");
  const results = extractGeoapifyResults(payload);
  const context = pickMatchingCityContext(results, cityName, state);

  logGeoapifyDebug("city resolver response", {
    selectedCity: cityName,
    selectedState: state ?? "",
    httpStatus: response.status,
    responseHasResults: Array.isArray(payload.results),
    rawResultsCount: countGeoapifyResults(payload),
    rawFeaturesCount: countGeoapifyFeatures(payload),
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
    if (error instanceof ApiError) throw mapBackendAddressError(error, "Não foi possível validar a cidade para buscar o endereço.");
    throw new Error("Não foi possível validar a cidade para buscar o endereço.");
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

    if (isDevelopment() && !hasWarnedDirectFallback) {
      hasWarnedDirectFallback = true;
      console.warn("[CalendarMate] Geoapify direct city resolver failed; using backend proxy.", error);
    }

    return resolveCityThroughBackend(city, state);
  }
}

async function fetchAddressSuggestionsFromUrl(
  url: string,
  cityContext: GeoapifyCityContext,
): Promise<{
  filtered: GeoapifyAddressSuggestion[];
  normalizedCount: number;
  rawResultsCount: number;
  rawFeaturesCount: number;
  httpStatus: number;
}> {

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
    throw new GeoapifyDirectRequestError("Nao foi possivel buscar enderecos agora.");
  }

  const payload = await parseGeoapifyResponse(response, "address");
  const normalized = normalizeGeoapifySuggestions(payload);
  const filtered = filterSuggestionsBySelectedCity(normalized, cityContext);

  return {
    filtered,
    normalizedCount: normalized.length,
    rawResultsCount: countGeoapifyResults(payload),
    rawFeaturesCount: countGeoapifyFeatures(payload),
    httpStatus: response.status,
  };
}

async function searchAddressesDirectly(query: string, cityContext: GeoapifyCityContext): Promise<GeoapifyAddressSuggestion[]> {
  const attempts = buildAddressSearchAttempts(query, cityContext, env.geoapifyPublicKey);
  const collected: GeoapifyAddressSuggestion[] = [];
  let rawResultsCount = 0;
  let rawFeaturesCount = 0;
  let normalizedSuggestionCount = 0;
  let httpStatus = 0;
  let lastUrl = attempts[0] ?? "";

  for (const url of attempts) {
    lastUrl = url;
    const result = await fetchAddressSuggestionsFromUrl(url, cityContext);
    collected.push(...result.filtered);
    rawResultsCount += result.rawResultsCount;
    rawFeaturesCount += result.rawFeaturesCount;
    normalizedSuggestionCount += result.normalizedCount;
    httpStatus = result.httpStatus;

    const uniqueCount = dedupeSuggestions(collected).length;
    if (attempts.length <= 2 && uniqueCount > 0) {
      break;
    }
    if (uniqueCount >= FALLBACK_MIN_RESULTS) {
      break;
    }
  }

  const filtered = filterSuggestionsBySelectedCity(dedupeSuggestions(collected), cityContext);
  lastAddressSearchDebug = {
    inputValue: query,
    selectedCityName: cityContext.name,
    selectedCityState: cityContext.state ?? "",
    selectedCityPlaceIdExists: Boolean(cityContext.placeId),
    finalUrl: sanitizeGeoapifyUrl(lastUrl),
    httpStatus,
    rawResultsCount,
    rawFeaturesCount,
    normalizedSuggestionCount,
    filteredSuggestionCount: filtered.length,
    stateSuggestionCount: filtered.length,
    source: "direct",
  };

  logGeoapifyDebug("address response", {
    inputValue: query,
    selectedCity: cityContext.name,
    selectedState: cityContext.state ?? "",
    selectedCityPlaceIdExists: Boolean(cityContext.placeId),
    finalUrl: sanitizeGeoapifyUrl(lastUrl),
    httpStatus,
    responseHasResults: rawResultsCount > 0,
    rawResultsCount,
    rawFeaturesCount,
    normalizedSuggestionCount,
    filteredSuggestionCount: filtered.length,
    finalSuggestionsCount: filtered.length,
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
    const filtered = filterSuggestionsBySelectedCity(items, cityContext);
    lastAddressSearchDebug = {
      inputValue: query,
      selectedCityName: cityContext.name,
      selectedCityState: cityContext.state ?? "",
      selectedCityPlaceIdExists: Boolean(cityContext.placeId),
      rawResultsCount: items.length,
      rawFeaturesCount: 0,
      normalizedSuggestionCount: items.length,
      filteredSuggestionCount: filtered.length,
      stateSuggestionCount: filtered.length,
      source: "backend",
    };
    logGeoapifyDebug("backend address response", {
      inputValue: query,
      selectedCity: cityContext.name,
      selectedState: cityContext.state ?? "",
      selectedCityPlaceIdExists: Boolean(cityContext.placeId),
      normalizedSuggestionCount: items.length,
      filteredSuggestionCount: filtered.length,
      finalSuggestionsCount: filtered.length,
    });
    return filtered;
  } catch (error) {
    if (error instanceof ApiError) throw mapBackendAddressError(error, "Não foi possível buscar endereços agora.");
    throw new Error("Não foi possível buscar endereços agora.");
  }
}

export async function searchAddresses(text: string, cityContext?: GeoapifyCityContext | string): Promise<GeoapifyAddressSuggestion[]> {
  const query = text.trim();
  if (query.length < 3) return [];

  const context = typeof cityContext === "string" ? { name: cityContext } : cityContext;
  if (!context?.name?.trim()) {
    throw new Error("Cidade: selecione uma cidade antes de buscar o endereço.");
  }

  if (!buildGeoapifyFilter(context)) {
    throw new Error("Cidade: aguarde a validação da cidade para buscar o endereço.");
  }

  if (!env.geoapifyPublicKey) {
    return searchAddressesThroughBackend(query, context);
  }

  try {
    return await searchAddressesDirectly(query, context);
  } catch (error) {
    if (!(error instanceof GeoapifyDirectRequestError)) throw error;

    if (isDevelopment() && !hasWarnedDirectFallback) {
      hasWarnedDirectFallback = true;
      console.warn("[CalendarMate] Geoapify direct autocomplete failed; using backend proxy.", error);
    }

    return searchAddressesThroughBackend(query, context);
  }
}
