import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { resolveGeoapifyCityContext, searchAddresses } from "../api/search-addresses";
import type { GeoapifyAddressSuggestion, GeoapifyCityContext } from "../../../types/api";

export type AddressSuggestion = GeoapifyAddressSuggestion & {
  addressLine2?: string;
  stateCode?: string;
  lat: number;
  lon: number;
};

let hasWarnedGeoapifyRequestFailure = false;
let hasWarnedCityResolverFailure = false;

function toAddressSuggestion(item: GeoapifyAddressSuggestion): AddressSuggestion {
  return {
    ...item,
    id: item.id || item.placeId || item.formatted,
    label: item.label || item.formatted,
    addressLine2: item.addressLine2,
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
    console.warn("[CalendarMate] Geoapify city resolver failed.", cityQuery.error);
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

  const cityError = !enabled
    ? null
    : !city
      ? "Cidade: selecione uma cidade antes de buscar o endereco."
      : cityQuery.error
        ? ((cityQuery.error as Error).message || "Cidade: falha ao validar a cidade selecionada.")
        : cityQuery.data && !cityContext
          ? "Cidade: nao foi possivel restringir o autocomplete para a cidade selecionada."
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
  const { cityContext, isResolvingCity, cityError } = useResolvedCityContext(selectedCity, selectedState, enabled);

  useEffect(() => {
    if (!enabled || !shouldSearch) {
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setIsLoading(isResolvingCity);
      setError(cityError);
      return;
    }

    if (isResolvingCity) {
      setSuggestions([]);
      setIsLoading(true);
      setError(null);
      return;
    }

    if (cityError || !cityContext) {
      setSuggestions([]);
      setIsLoading(false);
      setError(cityError ?? "Cidade: aguarde a validacao da cidade para buscar enderecos.");
      return;
    }

    let active = true;
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const items = (await searchAddresses(trimmed, cityContext)).map(toAddressSuggestion);

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
  }, [cityContext, cityError, enabled, isResolvingCity, query, shouldSearch]);

  return {
    suggestions,
    isLoading,
    error,
    cityContext,
    isResolvingCity,
    isEnabled: Boolean(enabled),
  };
}
