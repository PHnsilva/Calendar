import { apiClient } from "../../../lib/api-client";
import type { PublicBootstrapResponse } from "../../../types/api";

export function getPublicBootstrap() {
  return apiClient<PublicBootstrapResponse>("/api/public/bootstrap", {
    method: "GET",
  });
}
