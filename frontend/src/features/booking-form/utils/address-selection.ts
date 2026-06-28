import type { GeoapifyAddressSuggestion } from "../../../types/api";

type AddressLike = Pick<
  GeoapifyAddressSuggestion,
  "addressLine1" | "addressLine2" | "formatted" | "houseNumber" | "label" | "neighborhood" | "postcode" | "street"
> & {
  raw?: Record<string, unknown>;
};

function clean(value?: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function getSuggestionHouseNumber(suggestion?: AddressLike | null): string {
  if (!suggestion) return "";
  return clean(suggestion.houseNumber) || clean(suggestion.raw?.housenumber);
}

export function hasSuggestionHouseNumber(suggestion?: AddressLike | null): boolean {
  return Boolean(getSuggestionHouseNumber(suggestion));
}

export function shouldShowManualHouseNumber(suggestion?: AddressLike | null): boolean {
  return Boolean(suggestion) && !hasSuggestionHouseNumber(suggestion);
}

export function buildSuggestionInputValue(suggestion: AddressLike): string {
  const street = buildSuggestionStreetLine(suggestion);
  const neighborhood = clean(suggestion.neighborhood) || clean(suggestion.addressLine2);
  const postcode = clean(suggestion.postcode).replace(/\D/g, "").slice(0, 8);
  return [street, neighborhood, postcode ? `CEP ${postcode}` : ""].filter(Boolean).join(", ")
    || clean(suggestion.formatted)
    || clean(suggestion.label)
    || clean(suggestion.street);
}

export function buildSuggestionStreetLine(suggestion: AddressLike): string {
  const street = clean(suggestion.street);
  if (street) return street;

  const addressLine1 = clean(suggestion.addressLine1);
  if (addressLine1) {
    return addressLine1.replace(/\s*,\s*\d+[a-z]?([-/]\d+)?$/i, "").trim();
  }

  return clean(suggestion.label)
    || clean(suggestion.formatted)
    || "";
}
