import { apiGet, apiPost } from "../../../lib/api-client";
import { getStoredAdminToken, saveAdminSession } from "../../../lib/storage";
import type {
  AdminAuthConfirmResponse,
  AdminAuthStartResponse,
  AdminMeResponse,
  AdminProviderResponse,
} from "../../../types/api";

export function startAdminLogin(phone: string) {
  return apiPost<AdminAuthStartResponse>("/api/admin/auth/start", { phone });
}

export function resendAdminLogin(verificationId: string) {
  return apiPost<AdminAuthStartResponse>("/api/admin/auth/resend", undefined, {
    query: { verificationId },
  });
}

export async function confirmAdminLogin(verificationId: string, code: string) {
  const response = await apiPost<AdminAuthConfirmResponse>("/api/admin/auth/confirm", {
    verificationId,
    code,
  });
  saveAdminSession(response.sessionToken, response.admin);
  return response;
}

export function getAdminMe() {
  const adminToken = getStoredAdminToken();
  if (!adminToken) throw new Error("Admin session missing");
  return apiGet<AdminMeResponse>("/api/admin/auth/me", { adminToken });
}

export function listAdminProviders() {
  const adminToken = getStoredAdminToken();
  if (!adminToken) throw new Error("Admin session missing");
  return apiGet<AdminProviderResponse[]>("/api/admin/auth/providers", { adminToken });
}
