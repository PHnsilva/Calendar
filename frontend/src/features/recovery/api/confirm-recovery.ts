import { apiPost } from "../../../lib/api-client";
import type { RecoverConfirmRequest, RecoverConfirmResponse } from "../../../types/api";

export function confirmRecovery(payload: RecoverConfirmRequest) {
  return apiPost<RecoverConfirmResponse>("/api/recovery/confirm", payload);
}
