import { ApiError, apiClient } from "../../../lib/api-client";
import { env } from "../../../lib/env";
import type { GeoapifyAddressSuggestion } from "../../../types/api";

const AUTOCOMPLETE_ENDPOINT = "https://api.geoapify.com/v1/geocode/autocomplete";
const BACKEND_AUTOCOMPLETE_ENDPOINT = "/api/enderecos/autocomplete";

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

function normalizeText(value?: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value?: unknown): number {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function normalizePostcode(value?: unknown): string {
  return normalizeText(value).replace(/\D/g, "").slice(0, 8);
}

function buildAddressLine1(street: string, houseNumber: string, fallback: string): string {
  return [street, houseNumber].filter(Boolean).join(", ").trim() || fallback;
}

function buildAddressLine2(neighborhood: string, city: string, state: string): string {
  return [neighborhood, city, state].filter(Boolean).join(" - ").trim();
}

function toSuggestion(properties: GeoapifyResult): GeoapifyAddressSuggestion | null {
  const formatted = normalizeText(properties.formatted);
  const street = normalizeText(properties.street || properties.address_line1);
  const houseNumber = normalizeText(properties.housenumber);
  const neighborhood = normalizeText(properties.suburb || properties.district || properties.neighbourhood);
  const city = normalizeText(properties.city || properties.county || properties.state_district);
  const state = normalizeText(properties.state);
  const stateCode = normalizeText(properties.state_code || properties.state);
  const postcode = normalizePostcode(properties.postcode);
  const latitude = normalizeNumber(properties.lat);
  const longitude = normalizeNumber(properties.lon);

  if (!formatted || Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

  return {
    placeId: normalizeText(properties.place_id || properties.result_type || formatted),
    formatted,
    latitude,
    longitude,
    addressLine1: buildAddressLine1(street, houseNumber, formatted),
    addressLine2: buildAddressLine2(neighborhood, city, stateCode.toUpperCase()),
    street,
    houseNumber,
    neighborhood,
    city,
    state: stateCode.toUpperCase() || state.toUpperCase(),
    postcode,
  };
}

async function searchAddressesDirectly(query: string, city?: string): Promise<GeoapifyAddressSuggestion[]> {
  const params = new URLSearchParams({
    text: city ? `${query}, ${city}` : query,
    filter: "countrycode:br",
    limit: "5",
    lang: "pt",
    format: "json",
    apiKey: env.geoapifyPublicKey,
  });

  let response: Response;
  try {
    response = await fetch(`${AUTOCOMPLETE_ENDPOINT}?${params.toString()}`);
  } catch {
    throw new GeoapifyDirectRequestError("Nao foi possivel conectar ao autocomplete direto de endereco.");
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new GeoapifyDirectRequestError("Geoapify recusou a chave publica do autocomplete.", response.status);
    }
    if (response.status === 429) {
      throw new GeoapifyDirectRequestError("Limite de consultas do autocomplete atingido.", response.status);
    }
    throw new Error(`Nao foi possivel buscar sugestoes de endereco. Geoapify retornou ${response.status}.`);
  }

  const payload = (await response.json()) as GeoapifyAutocompleteResponse;
  const rawItems = Array.isArray(payload.results)
    ? payload.results
    : Array.isArray(payload.features)
      ? payload.features.map((item) => item.properties ?? {})
      : [];

  return rawItems.map(toSuggestion).filter((item): item is GeoapifyAddressSuggestion => Boolean(item));
}

async function searchAddressesThroughBackend(query: string, city?: string): Promise<GeoapifyAddressSuggestion[]> {
  try {
    return await apiClient<GeoapifyAddressSuggestion[]>(BACKEND_AUTOCOMPLETE_ENDPOINT, {
      method: "GET",
      query: {
        text: query,
        city: city?.trim() || undefined,
      },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error("Nao foi possivel conectar ao backend de autocomplete de endereco.");
  }
}

export async function searchAddresses(text: string, city?: string): Promise<GeoapifyAddressSuggestion[]> {
  const query = text.trim();
  if (query.length < 3) return [];

  if (!env.geoapifyPublicKey) {
    return searchAddressesThroughBackend(query, city);
  }

  try {
    return await searchAddressesDirectly(query, city);
  } catch (error) {
    if (!(error instanceof GeoapifyDirectRequestError)) throw error;

    if (!hasWarnedDirectFallback) {
      hasWarnedDirectFallback = true;
      console.warn("[CalendarMate] Geoapify direct autocomplete failed; using backend proxy.", error);
    }

    return searchAddressesThroughBackend(query, city);
  }
}
