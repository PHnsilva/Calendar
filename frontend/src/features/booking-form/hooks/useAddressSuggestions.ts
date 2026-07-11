import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLastAddressSearchDebug, resolveGeoapifyCityContext, searchAddresses, type GeoapifyAddressSearchDebug } from "../api/search-addresses";
import type { GeoapifyAddressSuggestion, GeoapifyCityContext } from "../../../types/api";

export type AddressSuggestion = GeoapifyAddressSuggestion & {
  addressLine2?: string;
  stateCode?: string;
  lat: number;
  lon: number;
};

let hasWarnedGeoapifyRequestFailure = false;
let hasWarnedCityResolverFailure = false;

function isDevelopment() {
  return Boolean(import.meta.env.DEV && import.meta.env.MODE !== "test");
}

function logAddressDebug(label: string, payload: Record<string, unknown>) {
  if (!isDevelopment()) return;
  console.debug(`[CalendarMate] Address autocomplete ${label}`, payload);
}

function friendlyAddressLookupError() {
  return "Digite rua, numero e bairro. Exemplo: Rua das Flores, 120, Centro.";
}

function toAddressSuggestion(item: GeoapifyAddressSuggestion): AddressSuggestion {
  return {
    ...item,
    id: item.id || item.placeId || item.formatted,
    label: item.label || item.formatted,
    addressLine2: item.addressLine2,
    postcode: "",
    stateCode: item.state,
    lat: item.lat ?? item.latitude,
    lon: item.lon ?? item.longitude,
  };
}

function hasResolvedCityConstraint(cityContext: GeoapifyCityContext | null) {
  const latitude = cityContext?.latitude;
  const longitude = cityContext?.longitude;
  return Boolean(
    cityContext?.placeId
    || (
      typeof latitude === "number"
      && typeof longitude === "number"
      && Number.isFinite(latitude)
      && Number.isFinite(longitude)
    ),
  );
}

function useResolvedCityContext(selectedCity: string, selectedState: string, enabled: boolean) {
  const city = selectedCity.trim();
  const cityQuery = useQuery({
    queryKey: ["geoapify-city-context", city.toLowerCase(), selectedState.trim().toUpperCase()] as const,
    queryFn: () => resolveGeoapifyCityContext(city, selectedState),
    enabled: enabled && Boolean(city),
    staleTime: 10 * 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (!cityQuery.error || hasWarnedCityResolverFailure) return;
    hasWarnedCityResolverFailure = true;
    if (isDevelopment()) {
      console.warn("[CalendarMate] Geoapify city resolver failed.", cityQuery.error);
    }
  }, [cityQuery.error]);

  const cityContext = useMemo(() => {
    const data = cityQuery.data ?? null;
    if (!data || !hasResolvedCityConstraint(data)) return null;
    return {
      ...data,
      name: selectedCity,
      state: data.state || selectedState,
    } as GeoapifyCityContext;
  }, [cityQuery.data, selectedCity, selectedState]);

  const autocompleteUnavailable = Boolean(
    cityQuery.data
    && !cityContext
    && typeof cityQuery.data.raw === "object"
    && cityQuery.data.raw !== null
    && "autocompleteReady" in cityQuery.data.raw
    && (cityQuery.data.raw as { autocompleteReady?: unknown }).autocompleteReady === false,
  );

  const cityError = !enabled
    ? null
    : !city
      ? "Cidade: selecione uma cidade antes de buscar o endereço."
      : cityQuery.error
        ? "Não foi possível validar a cidade agora. Selecione uma cidade atendida e digite rua, bairro e número."
        : autocompleteUnavailable
          ? "Endereço: a busca automática não está disponível agora. Digite rua, bairro e número manualmente."
        : cityQuery.data && !cityContext
          ? "Cidade: não foi possível preparar a busca de endereços para a cidade escolhida."
          : null;

  return {
    cityContext,
    isResolvingCity: Boolean(cityQuery.isLoading || cityQuery.isFetching),
    cityError,
  };
}

export function useAddressSuggestions(
  query: string,
  selectedCity: string,
  selectedState = "MG",
  enabled = true,
  shouldSearch = enabled,
) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debug, setDebug] = useState<GeoapifyAddressSearchDebug | null>(null);
  const shouldResolveCity = enabled && shouldSearch && query.trim().length >= 3;
  const { cityContext, isResolvingCity, cityError } = useResolvedCityContext(selectedCity, selectedState, shouldResolveCity);

  useEffect(() => {
    if (!enabled || !shouldSearch) {
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      setDebug(null);
      logAddressDebug("cleared", {
        inputValue: query,
        selectedCityObject: cityContext,
        selectedCityName: selectedCity,
        selectedCityState: selectedState,
        reason: !enabled ? "disabled" : "not-focused",
        finalSuggestionsCount: 0,
      });
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setIsLoading(isResolvingCity);
      setError(cityError);
      setDebug(null);
      logAddressDebug("cleared", {
        inputValue: query,
        selectedCityObject: cityContext,
        selectedCityName: selectedCity,
        selectedCityState: selectedState,
        reason: "too-short",
        finalSuggestionsCount: 0,
      });
      return;
    }

    if (isResolvingCity) {
      setSuggestions([]);
      setIsLoading(true);
      setError(null);
      setDebug(null);
      logAddressDebug("waiting-city", {
        inputValue: trimmed,
        selectedCityObject: cityContext,
        selectedCityName: selectedCity,
        selectedCityState: selectedState,
        finalSuggestionsCount: 0,
      });
      return;
    }

    if (cityError || !cityContext) {
      setSuggestions([]);
      setIsLoading(false);
      setError(cityError ?? "Cidade: aguarde a validação da cidade para buscar endereços.");
      setDebug(null);
      logAddressDebug("blocked-by-city", {
        inputValue: trimmed,
        selectedCityObject: cityContext,
        selectedCityName: selectedCity,
        selectedCityState: selectedState,
        cityError,
        finalSuggestionsCount: 0,
      });
      return;
    }

    let active = true;
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const items = (await searchAddresses(trimmed, cityContext)).map(toAddressSuggestion);
        const latestDebug = getLastAddressSearchDebug();

        if (!active) return;
        setSuggestions(items);
        setDebug(latestDebug ? { ...latestDebug, stateSuggestionCount: items.length } : null);
        logAddressDebug("state-update", {
          inputValue: trimmed,
          selectedCityObject: cityContext,
          selectedCityName: cityContext.name,
          selectedCityState: cityContext.state ?? selectedState,
          selectedCityPlaceIdExists: Boolean(cityContext.placeId),
          finalSuggestionsCount: items.length,
          rawResultsCount: latestDebug?.rawResultsCount ?? null,
          rawFeaturesCount: latestDebug?.rawFeaturesCount ?? null,
          normalizedSuggestionCount: latestDebug?.normalizedSuggestionCount ?? null,
          filteredSuggestionCount: latestDebug?.filteredSuggestionCount ?? null,
        });
      } catch (requestError) {
        if (!active) return;
        setSuggestions([]);
        setDebug(null);
        setError(friendlyAddressLookupError());
        if (isDevelopment() && !hasWarnedGeoapifyRequestFailure) {
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
  }, [cityContext, cityError, enabled, isResolvingCity, query, selectedCity, selectedState, shouldSearch]);

  return {
    suggestions,
    isLoading,
    error,
    debug,
    cityContext,
    isResolvingCity,
    isEnabled: Boolean(enabled),
  };
}
