import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query-keys";
import { resolveGeoapifyCityContext, searchAddresses } from "../api/search-addresses";
import { canUseGeoapifyAutocomplete } from "../../../lib/storage";

export function useAddressAutocomplete(searchText: string, city: string, enabled: boolean, state = "MG") {
  const cityContext = useQuery({
    queryKey: ["geoapify-city-context", city.trim().toLowerCase(), state.trim().toUpperCase()] as const,
    queryFn: () => resolveGeoapifyCityContext(city, state),
    enabled: enabled && canUseGeoapifyAutocomplete() && Boolean(city.trim()),
    staleTime: 10 * 60_000,
    retry: 1,
  });

  return useQuery({
    queryKey: queryKeys.geoapifyAutocomplete(searchText, city, cityContext.data?.placeId ?? `${cityContext.data?.longitude ?? ""},${cityContext.data?.latitude ?? ""}`),
    queryFn: () => searchAddresses(searchText, cityContext.data ?? undefined),
    enabled: enabled && canUseGeoapifyAutocomplete() && searchText.trim().length >= 3 && Boolean(cityContext.data),
    staleTime: 60_000,
    retry: 1,
  });
}
