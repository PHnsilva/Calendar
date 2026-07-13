import { getStoredAdminToken } from "../../../lib/storage";

export function requireAdminSessionToken(): string {
  const token = getStoredAdminToken();
  if (!token) {
    throw new Error("Admin session missing");
  }
  return token;
}
