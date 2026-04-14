import { apiPost } from "../../../lib/api-client";
import type { RecoverStartRequest, RecoverStartResponse } from "../../../types/api";

export function startRecovery(payload: RecoverStartRequest) {
  return apiPost<RecoverStartResponse>("/api/recovery/start", payload);
}
