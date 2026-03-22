import { apiPost } from "../../../lib/api-client";
import type { VerifyConfirmResponse } from "../../../types/api";

export function confirmVerification(payload: { verificationId: string; code: string }) {
  return apiPost<VerifyConfirmResponse>("/api/verify/confirm", payload);
}
