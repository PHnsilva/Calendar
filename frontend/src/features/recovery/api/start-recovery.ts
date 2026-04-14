import { apiPost } from "../../../lib/api-client";
import type { RecoverStartResponse } from "../../../types/api";

export function startRecovery(phone: string) {
  return apiPost<RecoverStartResponse>("/api/recovery/start", { phone });
}
