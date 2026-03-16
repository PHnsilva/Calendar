import { apiClient } from "../../../lib/api-client";
import type { VerifyConfirmResponse } from "../../../types/api";

export function confirmVerification(payload: { verificationId: string; code: string }) {
  return apiClient<VerifyConfirmResponse>("/api/verify/confirm", {
    method: "POST",
    body: payload,
  });
}
