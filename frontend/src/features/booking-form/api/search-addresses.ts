import { env } from "../../../lib/env";
import type { GeoapifyAddressSuggestion } from "../../../types/api";

const AUTOCOMPLETE_ENDPOINT = "https://api.geoapify.com/v1/geocode/autocomplete";

type GeoapifyResult = Record<string, unknown>;

type GeoapifyAutocompleteResponse = {
  results?: GeoapifyResult[];
  features?: { properties?: GeoapifyResult }[];
};

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
  return [neighborhood, city, state].filter(Boolean).join(" • ").trim();
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

export async function searchAddresses(text: string, city?: string): Promise<GeoapifyAddressSuggestion[]> {
  const query = text.trim();
  if (!env.geoapifyPublicKey || query.length < 3) return [];

  const params = new URLSearchParams({
    text: city ? `${query}, ${city}` : query,
    filter: "countrycode:br",
    limit: "5",
    lang: "pt",
    format: "json",
    apiKey: env.geoapifyPublicKey,
  });

  const response = await fetch(`${AUTOCOMPLETE_ENDPOINT}?${params.toString()}`);
  if (!response.ok) throw new Error("Não foi possível buscar sugestões de endereço.");

  const payload = (await response.json()) as GeoapifyAutocompleteResponse;
  const rawItems = Array.isArray(payload.results)
    ? payload.results
    : Array.isArray(payload.features)
      ? payload.features.map((item) => item.properties ?? {})
      : [];

  return rawItems.map(toSuggestion).filter((item): item is GeoapifyAddressSuggestion => Boolean(item));
}
