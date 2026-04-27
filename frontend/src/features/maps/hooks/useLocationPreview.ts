import { useQuery } from "@tanstack/react-query";
import { searchAddresses } from "../../booking-form/api/search-addresses";
import { queryKeys } from "../../../lib/query-keys";

export type LocationPreview = {
  latitude: number;
  longitude: number;
  formatted: string;
  addressLine1: string;
  addressLine2?: string;
};

async function getLocationPreview(addressLine: string, city: string): Promise<LocationPreview | null> {
  const query = addressLine.trim();
  if (!query) return null;

  const [first] = await searchAddresses(query, city);
  if (!first) return null;

  return {
    latitude: first.latitude,
    longitude: first.longitude,
    formatted: first.formatted,
    addressLine1: first.addressLine1,
    addressLine2: first.addressLine2,
  };
}

export function useLocationPreview(addressLine: string, city: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.locationPreview(addressLine, city),
    queryFn: () => getLocationPreview(addressLine, city),
    enabled: enabled && addressLine.trim().length >= 3,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
