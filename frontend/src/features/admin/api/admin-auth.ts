import { apiGet, apiPost } from "../../../lib/api-client";
import { normalizePhone } from "../../../lib/authRole";
import { saveAdminSession } from "../../../lib/storage";
import type {
  AdminAuthConfirmResponse,
  AdminAuthStartResponse,
  AdminMeResponse,
  AdminProviderResponse,
} from "../../../types/api";
import { requireAdminSessionToken } from "./admin-session";

export function startAdminLogin(phone: string) {
  return apiPost<AdminAuthStartResponse>("/api/admin/auth/start", { phone: normalizePhone(phone) });
}

export function resendAdminLogin(verificationId: string) {
  return apiPost<AdminAuthStartResponse>("/api/admin/auth/resend", undefined, {
    query: { verificationId },
  });
}

export async function loginAdminWithPassword(phone: string, password: string) {
  const response = await apiPost<AdminAuthConfirmResponse>("/api/admin/auth/password", {
    phone: normalizePhone(phone),
    password,
  });
  saveAdminSession(response.sessionToken, response.admin);
  return response;
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
  return apiGet<AdminMeResponse>("/api/admin/auth/me", { adminToken: requireAdminSessionToken() });
}

export function listAdminProviders() {
  return apiGet<AdminProviderResponse[]>("/api/admin/auth/providers", { adminToken: requireAdminSessionToken() });
}
