import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getAdminMe } from "../../features/admin/api/admin-auth";
import { ApiError } from "../../lib/api-client";
import {
  clearStoredAdminToken,
  getAdminSessionChangedEventName,
  getStoredAdminSession,
  type StoredAdminSession,
} from "../../lib/storage";
import { AuthContext, type AdminAuthStatus } from "./auth-context";

type AuthProviderProps = {
  children: ReactNode;
};

let validationToken = "";
let validationPromise: Promise<"valid" | "invalid" | "unavailable"> | null = null;

function validateStoredSession(session: StoredAdminSession) {
  if (validationPromise && validationToken === session.sessionToken) {
    return validationPromise;
  }

  validationToken = session.sessionToken;
  validationPromise = getAdminMe()
    .then(() => "valid" as const)
    .catch((error: unknown) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        return "invalid" as const;
      }
      return "unavailable" as const;
    })
    .finally(() => {
      validationPromise = null;
      validationToken = "";
    });

  return validationPromise;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const initialSession = useMemo(() => getStoredAdminSession(), []);
  const [adminSession, setAdminSession] = useState<StoredAdminSession | null>(initialSession);
  const [adminStatus, setAdminStatus] = useState<AdminAuthStatus>(initialSession ? "checking" : "unauthenticated");

  useEffect(() => {
    let active = true;

    const syncFromStorage = () => {
      const storedSession = getStoredAdminSession();
      setAdminSession(storedSession);
      setAdminStatus(storedSession ? "authenticated" : "unauthenticated");
    };

    window.addEventListener(getAdminSessionChangedEventName(), syncFromStorage);
    window.addEventListener("storage", syncFromStorage);

    if (initialSession) {
      void validateStoredSession(initialSession).then((result) => {
        if (!active || getStoredAdminSession()?.sessionToken !== initialSession.sessionToken) return;
        if (result === "invalid") {
          clearStoredAdminToken();
          return;
        }
        syncFromStorage();
      });
    }

    return () => {
      active = false;
      window.removeEventListener(getAdminSessionChangedEventName(), syncFromStorage);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, [initialSession]);

  const value = useMemo(() => ({ adminSession, adminStatus }), [adminSession, adminStatus]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
