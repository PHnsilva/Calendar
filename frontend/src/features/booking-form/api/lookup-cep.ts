import { apiClient } from "../../../lib/api-client";
import type { CepLookupResponse } from "../../../types/api";

export function lookupCep(cep: string) {
  const normalizedCep = cep.replace(/\D/g, "");
  return apiClient<CepLookupResponse>(`/api/cep/${normalizedCep}`, {
    method: "GET",
  });
}
