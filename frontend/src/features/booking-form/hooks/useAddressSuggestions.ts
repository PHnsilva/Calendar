import { useEffect, useState } from "react";
import { searchAddresses } from "../api/search-addresses";
import type { GeoapifyAddressSuggestion } from "../../../types/api";

export type AddressSuggestion = GeoapifyAddressSuggestion & {
  addressLine2?: string;
  stateCode?: string;
  lat: number;
  lon: number;
};

function normalizeCity(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

let hasWarnedGeoapifyRequestFailure = false;

function toAddressSuggestion(item: GeoapifyAddressSuggestion): AddressSuggestion {
  return {
    ...item,
    addressLine2: item.addressLine2,
    stateCode: item.state,
    lat: item.latitude,
    lon: item.longitude,
  };
}

export function useAddressSuggestions(query: string, selectedCity: string, enabled = true) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let active = true;
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const normalizedSelectedCity = normalizeCity(selectedCity);
        const items = (await searchAddresses(trimmed, selectedCity))
          .map(toAddressSuggestion)
          .sort((a, b) => {
            const aMatches = normalizeCity(a.city) === normalizedSelectedCity;
            const bMatches = normalizeCity(b.city) === normalizedSelectedCity;
            if (aMatches === bMatches) return 0;
            return aMatches ? -1 : 1;
          });

        if (!active) return;
        setSuggestions(items);
      } catch (requestError) {
        if (!active) return;
        setSuggestions([]);
        setError((requestError as Error).message);
        if (!hasWarnedGeoapifyRequestFailure) {
          hasWarnedGeoapifyRequestFailure = true;
          console.warn("[CalendarMate] Geoapify autocomplete request failed.", requestError);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [enabled, query, selectedCity]);

  return {
    suggestions,
    isLoading,
    error,
    isEnabled: Boolean(enabled),
  };
}
