import { apiClient } from "../../../lib/api-client";
import type { VerifyStartResponse } from "../../../types/api";

export function resendVerification(payload: { verificationId: string }) {
  return apiClient<VerifyStartResponse>("/api/verify/resend", {
    method: "POST",
    body: payload,
  });
}
