import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query-keys";
import { searchAddresses } from "../api/search-addresses";
import { canUseGeoapifyAutocomplete } from "../../../lib/storage";

export function useAddressAutocomplete(searchText: string, city: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.geoapifyAutocomplete(searchText, city),
    queryFn: () => searchAddresses(searchText, city),
    enabled: enabled && canUseGeoapifyAutocomplete() && searchText.trim().length >= 3,
    staleTime: 60_000,
    retry: 1,
  });
}
