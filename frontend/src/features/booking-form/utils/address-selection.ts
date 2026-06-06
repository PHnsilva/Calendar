import type { GeoapifyAddressSuggestion } from "../../../types/api";

type AddressLike = Pick<
  GeoapifyAddressSuggestion,
  "addressLine1" | "addressLine2" | "formatted" | "houseNumber" | "label" | "street"
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
  return clean(suggestion.formatted)
    || [suggestion.addressLine1, suggestion.addressLine2].map(clean).filter(Boolean).join(", ")
    || clean(suggestion.label)
    || clean(suggestion.street);
}

export function buildSuggestionStreetLine(suggestion: AddressLike): string {
  return clean(suggestion.street)
    || clean(suggestion.addressLine1)
    || clean(suggestion.formatted)
    || clean(suggestion.label);
}
