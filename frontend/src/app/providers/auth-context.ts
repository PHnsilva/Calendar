import { createContext, useContext } from "react";
import type { StoredAdminSession } from "../../lib/storage";

export type AdminAuthStatus = "checking" | "authenticated" | "unauthenticated";

export type AuthContextValue = {
  adminSession: StoredAdminSession | null;
  adminStatus: AdminAuthStatus;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
