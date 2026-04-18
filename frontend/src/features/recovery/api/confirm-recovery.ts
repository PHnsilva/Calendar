import { apiPost } from "../../../lib/api-client";
import type { RecoverConfirmResponse } from "../../../types/api";

export function confirmRecovery(verificationId: string, code: string) {
  return apiPost<RecoverConfirmResponse>("/api/recovery/confirm", { verificationId, code });
}

export function resendRecovery(verificationId: string) {
  return apiPost<{ verificationId: string; expiresInSeconds: number; resendAfterSeconds: number }>("/api/recovery/resend", { verificationId });
}
