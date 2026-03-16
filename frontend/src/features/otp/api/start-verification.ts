import { apiClient } from "../../../lib/api-client";
import type { VerifyStartResponse } from "../../../types/api";

export function startVerification(payload: { token: string; phone: string }) {
  return apiClient<VerifyStartResponse>("/api/verify/start", {
    method: "POST",
    body: payload,
  });
}
